begin;
drop trigger champus_new_user on auth.users;
drop trigger champus_new_demo on auth.users;

-- Auth inserts the identity before writing trusted app metadata in the same transaction.
create function public.finish_champus_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  select u.* into new from auth.users u where u.id=new.id;
  if not found then return null; end if;
  if new.raw_app_meta_data->'champus_demo' is not null then

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
end;
  else

declare m jsonb:=new.raw_app_meta_data->'champus'; inst text:=m->>'institution'; kind text:=m->>'workspace';
 actor uuid:=(m->>'actor')::uuid;
begin
 if kind='admin' and m->>'bootstrap'='true' then
   perform pg_catalog.pg_advisory_xact_lock(2136739901);
   if exists(select from public.profiles where workspace='admin') then raise exception 'Administrator already exists'; end if;
   insert into public.profiles(user_id,institution_id,name,workspace) values(new.id,inst,m->>'name','admin');
   insert into public.staff_roles values(new.id,inst,'admin');
   insert into public.account_events(institution_id,target_id,event) values(inst,new.id,'Bootstrapped administrator');
   return new;
 end if;
 if kind is null or kind not in ('student','campus','industry') or not exists(
   select from public.profiles where user_id=actor and institution_id=inst and workspace='admin' and enabled)
 then raise exception 'Ask the campus administrator to create this account'; end if;
 if kind='student' and (coalesce(m->>'program','') not in ('bizai','culinary','hospitality','events')
   or coalesce((m->>'cohort')::int,0) not between 1 and 4) then raise exception 'Choose a program and cohort'; end if;
 insert into public.profiles(user_id,institution_id,name,program,cohort,workspace)
 values(new.id,inst,m->>'name',coalesce(m->>'program',''),(m->>'cohort')::smallint,kind);
 if kind='campus' then insert into public.staff_roles values(new.id,inst,'teacher'),(new.id,inst,'curator');
 elsif kind='industry' then insert into public.staff_roles values(new.id,inst,'industry'); end if;
 insert into public.account_events(institution_id,actor_id,target_id,event) values(inst,actor,new.id,'Created '||kind||' account');
 return new;
end;
  end if;
end $$;
revoke all on function public.finish_champus_profile() from public, anon, authenticated;
create constraint trigger champus_finish_profile after insert on auth.users
deferrable initially deferred for each row execute function public.finish_champus_profile();
commit;
