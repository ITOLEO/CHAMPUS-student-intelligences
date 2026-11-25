begin;
alter table public.staff_roles drop constraint staff_roles_role_check;
alter table public.staff_roles add check(role in ('curator','reviewer','teacher','industry'));

create table public.industry_needs(
 id uuid primary key default gen_random_uuid(), institution_id text not null references public.institutions,
 author_id uuid not null default auth.uid(), title text not null check(length(trim(title)) between 1 and 160),
 context text not null check(length(trim(context)) between 1 and 1600), indicator_id text not null references public.skill_indicators,
 updated_at timestamptz not null default now(), unique(id,institution_id));
create table public.teaching_roster(
 id uuid primary key default gen_random_uuid(), institution_id text not null, teacher_id uuid not null,student_id uuid not null,
 program text not null check(trim(program)<>''),course text not null check(trim(course)<>''),student_label text not null check(trim(student_label)<>''),
 foreign key(teacher_id,institution_id) references public.profiles(user_id,institution_id) on delete cascade,
 foreign key(student_id,institution_id) references public.profiles(user_id,institution_id) on delete cascade,
 check(teacher_id<>student_id), unique(teacher_id,student_id,program,course),unique(id,institution_id));
create table public.curriculum_tasks(
 id uuid primary key default gen_random_uuid(),institution_id text not null, roster_id uuid not null, need_id uuid not null,
 indicator_id text not null references public.skill_indicators, title text not null check(length(trim(title)) between 1 and 160),
 outcome text not null check(length(trim(outcome)) between 1 and 1200),brief text not null check(length(trim(brief)) between 1 and 2400),
 need_title text not null, created_at timestamptz not null default now(),
 foreign key(roster_id,institution_id) references public.teaching_roster(id,institution_id) on delete cascade,
 foreign key(need_id,institution_id) references public.industry_needs(id,institution_id));
create function public.capture_need_title() returns trigger language plpgsql set search_path='' as $$
begin
 select title into new.need_title from public.industry_needs where id=new.need_id and institution_id=new.institution_id;
 return new;
end $$;
create trigger capture_need_title before insert on public.curriculum_tasks for each row execute function public.capture_need_title();
alter table public.evidence add column task_id uuid references public.curriculum_tasks on delete set null;
grant insert(task_id) on public.evidence to authenticated;
create table public.learning_preferences(
 user_id uuid primary key default auth.uid() references public.profiles on delete cascade,
 personality_type text check(personality_type ~ '^[EI][NS][FT][JP]$'),
 work_style text check(work_style in ('Explore','Plan','Collaborate','Reflect')));
do $$ declare t text;begin foreach t in array array['industry_needs','teaching_roster','curriculum_tasks','learning_preferences'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
end loop;end $$;
grant insert(institution_id,title,context,indicator_id),update(title,context,indicator_id) on public.industry_needs to authenticated;
create policy see_needs on public.industry_needs for select to authenticated using(author_id=auth.uid() or public.has_staff_role(institution_id,'teacher'));
create policy add_need on public.industry_needs for insert to authenticated with check(author_id=auth.uid() and public.has_staff_role(institution_id,'industry'));
create policy edit_need on public.industry_needs for update to authenticated using(author_id=auth.uid() and public.has_staff_role(institution_id,'industry'));
create function public.touch_need() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end$$;
create trigger touch_need before update on public.industry_needs for each row execute function public.touch_need();
create policy own_roster on public.teaching_roster for select to authenticated using(student_id=auth.uid() or (teacher_id=auth.uid() and public.has_staff_role(institution_id,'teacher')));
grant insert(institution_id,roster_id,need_id,indicator_id,title,outcome,brief) on public.curriculum_tasks to authenticated;
create policy read_tasks on public.curriculum_tasks for select to authenticated using(exists(select from public.teaching_roster r where r.id=roster_id));
create policy assign_task on public.curriculum_tasks for insert to authenticated with check(exists(select from public.teaching_roster r where r.id=roster_id and r.teacher_id=auth.uid()) and public.has_staff_role(institution_id,'teacher'));
create policy task_evidence on public.evidence as restrictive for insert to authenticated with check(task_id is null or exists(select from public.curriculum_tasks t join public.teaching_roster r on r.id=t.roster_id where t.id=task_id and t.indicator_id=evidence.indicator_id and r.student_id=auth.uid()));
create function public.teaches_task(task uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select from public.curriculum_tasks t join public.teaching_roster r on r.id=t.roster_id where t.id=task and r.teacher_id=auth.uid() and public.has_staff_role(r.institution_id,'teacher'))$$;
create policy teacher_reads on public.evidence for select to authenticated using(public.teaches_task(task_id));
create policy teacher_reviews on public.reviews for insert to authenticated with check(reviewer_id=auth.uid() and exists(select from public.evidence e where e.id=evidence_id and public.teaches_task(e.task_id)));
create policy teacher_files on storage.objects for select to authenticated using(bucket_id='evidence' and exists(select from public.evidence e where e.file_path=name and public.teaches_task(e.task_id)));
grant insert(user_id,work_style,personality_type),update(work_style,user_id,personality_type),delete on public.learning_preferences to authenticated;
create policy own_preference on public.learning_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;
