begin;

create table public.institutions(id text primary key, name text not null);
insert into public.institutions values ('pib','Politeknik Internasional Bali');

create table public.profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 institution_id text references public.institutions,
 name text not null default '' check(length(name)<=100), program text not null default '' check(length(program)<=160),
 semester integer check(semester between 1 and 24), interests text not null default '' check(length(interests)<=500), goals text not null default '' check(length(goals)<=1000),
 unique(user_id,institution_id)
);
create function public.create_student_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(user_id) values(new.id) on conflict do nothing; return new; end $$;
create trigger champus_new_user after insert on auth.users for each row execute function public.create_student_profile();
insert into public.profiles(user_id) select id from auth.users on conflict do nothing;
create function public.choose_institution(inst text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.profiles set institution_id=inst where user_id=auth.uid() and institution_id is null;
 if not found and not exists(select from public.profiles where user_id=auth.uid() and institution_id=inst) then raise exception 'Contact your administrator to change the institution'; end if;
end $$;
revoke all on function public.choose_institution(text) from public;
grant execute on function public.choose_institution(text) to authenticated;
create table public.staff_roles(user_id uuid not null, institution_id text not null, role text not null check(role in ('curator','reviewer')), primary key(user_id,institution_id,role),
 foreign key(user_id,institution_id) references public.profiles(user_id,institution_id) on delete cascade);
create function public.has_staff_role(inst text, staff_role text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_roles where user_id=(select auth.uid()) and institution_id=inst and role=staff_role)
$$;

create table public.skill_indicators(id text primary key, definition jsonb not null check(definition->>'id'=id));
create table public.courses(id text primary key,institution_id text not null references public.institutions,title text not null, source_url text not null);
create table public.learning_outcomes(id text primary key,course_id text not null references public.courses, outcome text not null, source_url text not null);
create table public.outcome_indicators(outcome_id text references public.learning_outcomes, indicator_id text references public.skill_indicators, mapping_status text not null, context jsonb not null, primary key(outcome_id,indicator_id));
create table public.opportunities(
 id text primary key check(id ~ '^[a-zA-Z0-9_-]{1,100}$'), institution_id text not null references public.institutions,
 status text not null check(status in ('draft','published','archived')), data jsonb not null, revision int not null default 1,
 updated_at timestamptz not null default now(),
 check(data->>'id'=id),check(length(trim(data->>'title'))>0),check(data->>'sourceUrl' ~ '^https://'),
 check(data->>'category' in ('Competition','Scholarship','Mentoring','Campus program'))
);
create table public.opportunity_indicators(opportunity_id text references public.opportunities on delete cascade,indicator_id text references public.skill_indicators, relationship text not null, primary key(opportunity_id,indicator_id));
create function public.validate_listing() returns trigger language plpgsql set search_path='' as $$
declare sk jsonb; rule jsonb; date_text text; d jsonb:=new.data->'deadline';
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.institution_id<>old.institution_id then raise exception 'Listing identity cannot change'; end if;
  new.revision:=old.revision+1;
 else new.revision:=1; end if;
 new.updated_at:=now();
 if coalesce(new.data->>'id','')<>new.id or coalesce(trim(new.data->>'title'),'')='' or coalesce(trim(new.data->>'organization'),'')='' then raise exception 'Missing listing identity'; end if;
 if coalesce(new.data->>'sourceUrl','') !~ '^https://[^[:space:]/]+' or (coalesce(new.data->>'applicationUrl','')<>'' and new.data->>'applicationUrl' !~ '^https://[^[:space:]/]+') then raise exception 'Valid HTTPS source required'; end if;
 if coalesce(jsonb_typeof(new.data->'eligibility'),'')<>'array' or coalesce(jsonb_typeof(new.data->'skills'),'')<>'array' or coalesce(jsonb_typeof(new.data->'guidelines'),'')<>'array' then raise exception 'Invalid listing structure'; end if;
 if new.status='published' then
  if coalesce(new.data->>'lastVerifiedAt','')='' or (new.data->>'lastVerifiedAt')::date> (now() at time zone 'Asia/Makassar')::date or jsonb_array_length(new.data->'eligibility')=0 or jsonb_array_length(new.data->'skills')=0 then raise exception 'Source check, rules and skill mapping required'; end if;
 end if;
 if tg_op='UPDATE' and new.status='published' and (old.status<>'published' or new.data is distinct from old.data) and (new.data->>'lastVerifiedAt')::date<>(now() at time zone 'Asia/Makassar')::date then raise exception 'Check edited listing against the source today'; end if;
 if coalesce(jsonb_typeof(d),'')<>'object' or coalesce(d->>'precision','') not in ('minute','before-date','date-only') then raise exception 'Invalid deadline format'; end if;
 date_text:=d->>'date';
 if coalesce(date_text,'')<>'' then if date_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid calendar date'; end if; perform date_text::date; elsif d->>'precision' in ('minute','before-date') then raise exception 'Calendar date required'; end if;
 if coalesce(d->>'zone','')<>'' and not exists(select 1 from pg_catalog.pg_timezone_names where name=d->>'zone') then raise exception 'Invalid organizer time zone'; end if;
 if d->>'precision'='minute' and (coalesce(d->>'time','')!~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(d->>'zone','')='') then raise exception 'Exact deadline requires a time and zone'; end if;
 for rule in select value from jsonb_array_elements(new.data->'eligibility') loop
  if coalesce(rule->>'id','')='' or coalesce(trim(rule->>'label'),'')='' or coalesce(rule->>'sourceUrl','') !~ '^https://[^[:space:]/]+' then raise exception 'Invalid rule'; end if;
 end loop;
 if (select count(distinct x->>'id') from jsonb_array_elements(new.data->'eligibility') x)<>jsonb_array_length(new.data->'eligibility') then raise exception 'Duplicate rule IDs'; end if;
 for sk in select value from jsonb_array_elements(new.data->'skills') loop
  if not exists(select 1 from public.skill_indicators i where i.id=sk->>'id' and (i.definition-'relationship')=(sk-'relationship')) then raise exception 'Unknown or altered indicator'; end if;
 end loop;
 return new;
end $$;
create trigger validate_listing before insert or update on public.opportunities for each row execute function public.validate_listing();
create function public.sync_opportunity_skills() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.opportunity_indicators where opportunity_id=new.id;
 insert into public.opportunity_indicators select new.id,s->>'id',s->>'relationship' from jsonb_array_elements(new.data->'skills') s;
 return new;
end $$;
create trigger sync_mappings after insert or update on public.opportunities for each row execute function public.sync_opportunity_skills();
create table public.saved_opportunities(user_id uuid references public.profiles on delete cascade, opportunity_id text references public.opportunities on delete cascade,primary key(user_id,opportunity_id));
create table public.confirmations(user_id uuid references public.profiles on delete cascade, opportunity_id text references public.opportunities on delete cascade,revision int not null,rule_id text not null,answer text not null check(answer in ('yes','no','unknown')), primary key(user_id,opportunity_id,revision,rule_id));
create table public.self_assessments(user_id uuid references public.profiles on delete cascade,indicator_id text references public.skill_indicators,assessment text not null check(assessment in ('New to this','Practising','Can demonstrate')),confidence text not null check(confidence in ('Low','Moderate','High')), primary key(user_id,indicator_id));
create table public.completed_resources(user_id uuid references public.profiles on delete cascade,indicator_id text references public.skill_indicators,created_at timestamptz not null default now(),primary key(user_id,indicator_id));
create table public.evidence(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,institution_id text not null,indicator_id text not null references public.skill_indicators,
 title text not null check(length(trim(title)) between 1 and 140),description text not null check(length(trim(description)) between 1 and 2000),
 link text check(link ~ '^https://[^[:space:]/]+'), file_path text unique,created_at timestamptz not null default now(),
 foreign key(user_id,institution_id) references public.profiles(user_id,institution_id) on delete cascade,
 check(link is not null or file_path is not null),check(file_path is null or (file_path ~ ('^'||user_id::text||'/'||id::text||'\.(pdf|jpg|png|webp)$')))
);
create table public.reviews(evidence_id uuid primary key references public.evidence on delete cascade,reviewer_id uuid not null references public.profiles,
 decision text not null check(decision in ('Verified','Needs revision')),feedback text not null check(length(trim(feedback)) between 1 and 2000),created_at timestamptz not null default now());

do $$ declare t text; begin foreach t in array array['institutions','profiles','staff_roles','skill_indicators','courses','learning_outcomes','outcome_indicators','opportunities','opportunity_indicators','saved_opportunities','confirmations','self_assessments','completed_resources','evidence','reviews'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 end loop; end $$;
grant select on public.institutions,public.skill_indicators,public.courses,public.learning_outcomes,public.outcome_indicators,public.opportunity_indicators,public.opportunities to anon,authenticated;
do $$ declare t text; begin foreach t in array array['institutions','skill_indicators','courses','learning_outcomes','outcome_indicators'] loop
 execute format('create policy read_public on public.%I for select using(true)',t);end loop;end $$;
create policy read_opportunity on public.opportunities for select using(status='published' or public.has_staff_role(institution_id,'curator'));
create policy read_mapping on public.opportunity_indicators for select using(exists(select from public.opportunities o where o.id=opportunity_id));
grant insert(id,institution_id,status,data),update(id,institution_id,status,data) on public.opportunities to authenticated;
create policy curator_add on public.opportunities for insert to authenticated with check(public.has_staff_role(institution_id,'curator'));
create policy curator_edit on public.opportunities for update to authenticated using(public.has_staff_role(institution_id,'curator')) with check(public.has_staff_role(institution_id,'curator'));
grant select on public.profiles,public.staff_roles,public.evidence,public.reviews to authenticated;
grant update(name,program,semester,interests,goals) on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using(user_id=(select auth.uid()));
create policy edit_profile on public.profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_roles on public.staff_roles for select to authenticated using(user_id=(select auth.uid()));
do $$ declare t text; begin foreach t in array array['saved_opportunities','confirmations','self_assessments','completed_resources'] loop
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy own_record on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);end loop;end $$;
grant insert(id,user_id,institution_id,indicator_id,title,description,link,file_path) on public.evidence to authenticated;
create function public.owns_uploaded_evidence(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select split_part(object_path,'/',1)=auth.uid()::text and exists(select from storage.objects o where o.bucket_id='evidence' and o.name=object_path)
$$;
revoke all on function public.owns_uploaded_evidence(text) from public;
grant execute on function public.owns_uploaded_evidence(text) to authenticated;
create policy submit_work on public.evidence for insert to authenticated with check(
 user_id=(select auth.uid()) and (file_path is null or public.owns_uploaded_evidence(file_path))
);
create policy read_work on public.evidence for select to authenticated using(user_id=(select auth.uid()) or public.has_staff_role(institution_id,'reviewer'));
grant insert(evidence_id,reviewer_id,decision,feedback) on public.reviews to authenticated;
create policy read_feedback on public.reviews for select to authenticated using(exists(select from public.evidence e where e.id=evidence_id));
create policy write_feedback on public.reviews for insert to authenticated with check(reviewer_id=(select auth.uid()) and exists(select from public.evidence e where e.id=evidence_id and e.user_id<>auth.uid() and public.has_staff_role(e.institution_id,'reviewer')));
revoke all on function public.create_student_profile(),public.sync_opportunity_skills(),public.has_staff_role(text,text) from public;
grant execute on function public.has_staff_role(text,text) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evidence','evidence',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy champus_file_upload on storage.objects for insert to authenticated with check(bucket_id='evidence' and split_part(name,'/',1)=(select auth.uid())::text);
create policy champus_file_read on storage.objects for select to authenticated using(bucket_id='evidence' and (split_part(name,'/',1)=(select auth.uid())::text or exists(select from public.evidence e where e.file_path=name and public.has_staff_role(e.institution_id,'reviewer'))));
create policy champus_unattached_cleanup on storage.objects for delete to authenticated using(bucket_id='evidence' and split_part(name,'/',1)=(select auth.uid())::text and not exists(select from public.evidence e where e.file_path=name));
commit;
