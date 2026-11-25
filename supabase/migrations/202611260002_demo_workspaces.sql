begin;

-- A preview uses its own institution and three passwordless Auth identities.
create table public.demo_runs (
  id uuid primary key, institution_id text not null unique references public.institutions,
  source_hash text not null, created_at timestamptz not null default now(), seeded boolean not null default false
);
create index demo_run_created on public.demo_runs(created_at);
alter table public.demo_runs enable row level security;
revoke all on public.demo_runs from public, anon, authenticated;

create function public.reserve_demo(run_id uuid, source_key text) returns void
language plpgsql security definer set search_path='' as $$
declare inst text := 'demo-' || run_id;
begin
  perform pg_advisory_xact_lock(610026);
  if exists(select from public.demo_runs where id=run_id) then return; end if;
  if length(source_key) <> 64 then raise exception 'Invalid source'; end if;
  if (select count(*) from public.demo_runs where created_at>now()-interval '1 hour')>=60
    or (select count(*) from public.demo_runs where source_hash=source_key and created_at>now()-interval '1 hour')>=8
    then raise exception 'Preview capacity reached'; end if;
  insert into public.institutions values(inst,'CHAMPUS sample campus');
  insert into public.demo_runs(id,institution_id,source_hash) values(run_id,inst,source_key);
end $$;

create function public.create_demo_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare m jsonb:=new.raw_app_meta_data->'champus_demo'; kind text:=m->>'role'; inst text;
begin
  select institution_id into strict inst from public.demo_runs where id=(m->>'run')::uuid;
  if kind is null or kind not in ('student','campus','industry') or new.email is distinct from
     kind||'-demo+'||(m->>'run')||'@preview.champus.invalid' then raise exception 'Invalid demo identity'; end if;
  insert into public.profiles(user_id,institution_id,workspace,name,program,cohort,goals)
    values(new.id,inst,kind,kind||'-demo',case when kind='student' then 'bizai' else '' end,
      case when kind='student' then 2 end,case when kind='student' then 'Build web applications for creative studios.' else '' end);
  if kind in ('campus','industry') then insert into public.staff_roles values(new.id,inst,case when kind='campus' then 'teacher' else 'industry' end); end if;
  return new;
end $$;

drop trigger champus_new_user on auth.users;
create trigger champus_new_user after insert on auth.users for each row
when ((new.raw_app_meta_data->'champus_demo') is null) execute function public.create_student_profile();
create trigger champus_new_demo after insert on auth.users for each row
when ((new.raw_app_meta_data->'champus_demo') is not null) execute function public.create_demo_profile();
create unique index demo_role_per_run on public.profiles(institution_id,workspace) where left(institution_id,5)='demo-';

create function public.demo_members(run_id uuid) returns table(user_id uuid,workspace text,enabled boolean)
language sql stable security definer set search_path='' as $$
 select p.user_id,p.workspace,p.enabled from public.profiles p join public.demo_runs r using(institution_id) where r.id=run_id
$$;

create function public.seed_demo(run_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare run public.demo_runs; learner uuid; lecturer uuid; partner uuid; need uuid; enrollment uuid; task uuid; work uuid; inst text; skill text:='bizai-database';
begin
  select * into strict run from public.demo_runs where id=run_id for update;
  if run.seeded then return; end if;
  inst:=run.institution_id;
  select user_id into strict learner from public.profiles where institution_id=inst and workspace='student';
  select user_id into strict lecturer from public.profiles where institution_id=inst and workspace='campus';
  select user_id into strict partner from public.profiles where institution_id=inst and workspace='industry';
  insert into public.program_lessons select inst||'-'||l.id,inst,l.program,l.title,l.outcome,l.practice,l.artifact,l.indicator_id,l.source_url,l.origin from public.program_lessons l where l.institution_id='pib' and l.origin='CHAMPUS practice';
  insert into public.partner_profiles values(partner,inst,'Frame Studio','Creative services','A sample photography studio managing client bookings.');
  insert into public.partner_briefs(institution_id,author_id,organization,kind,title,brief,status,response)
    values(inst,partner,'Frame Studio','Project','Studio booking workflow','Track bookings and identify scheduling conflicts.','In discussion','The Database class will test the booking relationship.');
  insert into public.industry_needs(institution_id,author_id,title,context,indicator_id)
    values(inst,partner,'Find overlapping studio bookings','The studio needs to check each booking against the client and the reserved room.',skill) returning id into need;
  insert into public.teaching_roster(institution_id,teacher_id,student_id,program,course,student_label)
    values(inst,lecturer,learner,'bizai','Database','student-demo') returning id into enrollment;
  insert into public.curriculum_tasks(institution_id,roster_id,need_id,indicator_id,title,outcome,brief)
    values(inst,enrollment,need,skill,'Model a studio booking','Retrieve the booking and client using a join.','Create a small sample database. Show the join and verify one constraint.') returning id into task;
  insert into public.evidence(user_id,institution_id,indicator_id,task_id,title,description,link)
    values(learner,inst,skill,task,'First booking model','Sample submission: Client has a primary key. Booking stores the client key. The query returns the client for each reservation.','https://www.postgresql.org/docs/current/tutorial-join.html') returning id into work;
  insert into public.reviews values(work,lecturer,'Needs revision','Add a second booking and verify that the join returns both rows.',now());
  insert into public.guidance_requests(roster_id,proposal,source) values(enrollment,'I want to test the booking join with two clients before I add room availability.','Student');
  insert into public.completed_resources values(learner,skill,now());
  insert into public.learning_preferences(user_id,work_style) values(learner,'Plan');
  update public.demo_runs set seeded=true where id=run_id;
end $$;

-- Public catalogs must not expose another visitor's sample materials.
create function public.can_read_preview(inst text) returns boolean language sql stable security definer set search_path='' as $$
 select left(inst,5)<>'demo-' or exists(select from public.profiles where user_id=auth.uid() and institution_id=inst and enabled)
$$;
create policy preview_lessons on public.program_lessons as restrictive for select using(public.can_read_preview(institution_id));
create policy preview_institutions on public.institutions as restrictive for select using(public.can_read_preview(id));
alter table public.skill_indicators add column preview_institution text;
create function public.mark_preview_skill() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select institution_id into new.preview_institution from public.profiles where user_id=auth.uid() and left(institution_id,5)='demo-';
 return new;
end $$;
create trigger label_preview_skill before insert on public.skill_indicators for each row execute function public.mark_preview_skill();
create policy preview_skills on public.skill_indicators as restrictive for select using(preview_institution is null or public.can_read_preview(preview_institution));

create function public.demo_directory(page_offset integer default 0) returns table(name text,email text,workspace text,created_at timestamptz,preview_id uuid)
language sql stable security definer set search_path='' as $$
 select p.name,u.email::text,p.workspace,r.created_at,r.id from public.demo_runs r join public.profiles p using(institution_id) join auth.users u on u.id=p.user_id
 where exists(select from public.profiles owner where owner.user_id=auth.uid() and public.has_staff_role(owner.institution_id,'admin'))
 order by r.created_at desc,r.id,p.workspace limit 30 offset greatest(0,page_offset)
$$;
revoke all on function public.create_demo_profile(),public.mark_preview_skill(),public.reserve_demo(uuid,text),public.demo_members(uuid),public.seed_demo(uuid),public.demo_directory(integer),public.can_read_preview(text) from public,anon,authenticated;
grant execute on function public.reserve_demo(uuid,text),public.demo_members(uuid),public.seed_demo(uuid) to service_role;
grant execute on function public.demo_directory(integer) to authenticated;
grant execute on function public.can_read_preview(text) to anon,authenticated;
commit;
