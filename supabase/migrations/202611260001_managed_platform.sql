begin;

alter table public.profiles
  add column workspace text check (workspace in ('student','campus','industry','admin')),
  add column cohort smallint check (cohort between 1 and 4),
  add column enabled boolean not null default true;
alter table public.staff_roles drop constraint staff_roles_role_check;
alter table public.staff_roles add check(role in ('curator','reviewer','teacher','industry','admin'));

-- Keep existing staff permissions. Students without administrator approval await assignment.
update public.profiles p set workspace = case
  when exists(select from public.staff_roles r where r.user_id=p.user_id and r.role='teacher') then 'campus'
  when exists(select from public.staff_roles r where r.user_id=p.user_id and r.role='industry') then 'industry'
  else 'campus' end where exists(select from public.staff_roles r where r.user_id=p.user_id);
revoke update(program,semester) on public.profiles from authenticated;
revoke execute on function public.choose_institution(text) from authenticated;

create function public.active_workspace() returns text language sql stable security definer set search_path='' as $$
  select workspace from public.profiles where user_id=auth.uid() and enabled
$$;
create or replace function public.has_staff_role(inst text,staff_role text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select from public.staff_roles r join public.profiles p using(user_id,institution_id)
    where r.user_id=auth.uid() and r.institution_id=inst and r.role=staff_role and p.enabled and case r.role when 'admin' then p.workspace='admin' when 'industry' then p.workspace='industry' else p.workspace='campus' end)
$$;
revoke all on function public.active_workspace() from public;
grant execute on function public.active_workspace() to authenticated;

create table public.account_events (
 id bigint generated always as identity primary key, institution_id text not null references public.institutions,
 actor_id uuid, target_id uuid not null, event text not null, created_at timestamptz not null default now()
);
alter table public.account_events enable row level security;
revoke all on public.account_events from anon,authenticated;
grant select on public.account_events to authenticated;
create policy admin_events on public.account_events for select to authenticated using(public.has_staff_role(institution_id,'admin'));

create or replace function public.create_student_profile() returns trigger language plpgsql security definer set search_path='' as $$
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
end $$;

create function public.account_directory() returns table(user_id uuid,name text,email text,workspace text,program text,cohort smallint,enabled boolean)
language sql stable security definer set search_path='' as $$
 select p.user_id,p.name,u.email::text,p.workspace,p.program,p.cohort,p.enabled from public.profiles p join auth.users u on u.id=p.user_id
 where public.has_staff_role(p.institution_id,'admin') order by p.name,p.user_id
$$;
create function public.manage_account(target uuid, active boolean, assigned_program text, assigned_cohort int)
returns void language plpgsql security definer set search_path='' as $$
declare p public.profiles;
begin
 select * into p from public.profiles where user_id=target for update;
 if p.user_id is null or not public.has_staff_role(p.institution_id,'admin') or p.workspace='admin' or p.workspace is null then raise exception 'Account cannot be changed'; end if;
 if p.workspace='student' and (assigned_program not in ('bizai','culinary','hospitality','events') or assigned_program is null or assigned_cohort is null or assigned_cohort not between 1 and 4) then raise exception 'Choose a program and cohort'; end if;
 update public.profiles set enabled=active,program=case when p.workspace='student' then assigned_program else p.program end,
 cohort=case when p.workspace='student' then assigned_cohort else null end where user_id=target;
 insert into public.account_events(institution_id,actor_id,target_id,event) values(p.institution_id,auth.uid(),target,
 case when active<>p.enabled then case when active then 'Restored access' else 'Suspended access' end else 'Updated academic placement' end);
end $$;
create function public.assign_enrollment(teacher uuid, student uuid, subject text) returns void language plpgsql security definer set search_path='' as $$
declare p public.profiles;
begin
 select * into p from public.profiles where user_id=student and workspace='student' and enabled;
 if not public.has_staff_role(p.institution_id,'admin') or not exists(select from public.profiles where user_id=teacher and workspace='campus' and enabled and institution_id=p.institution_id)
 then raise exception 'Choose accounts from this institution'; end if;
 if length(trim(subject)) not between 1 and 160 then raise exception 'Enter a course'; end if;
 insert into public.teaching_roster(institution_id,teacher_id,student_id,program,course,student_label)
 values(p.institution_id,teacher,student,p.program,trim(subject),coalesce(nullif(p.name,''),'Student'))
 on conflict(teacher_id,student_id,program,course) do nothing;
end $$;
revoke all on function public.account_directory(),public.manage_account(uuid,boolean,text,int),public.assign_enrollment(uuid,uuid,text) from public;
grant execute on function public.account_directory(),public.manage_account(uuid,boolean,text,int),public.assign_enrollment(uuid,uuid,text) to authenticated;
create policy admin_roster on public.teaching_roster for select to authenticated using(public.has_staff_role(institution_id,'admin'));

-- Apply managed access to data behind the workspace, including existing sessions.
do $$ declare t text; begin foreach t in array array['self_assessments','saved_opportunities','completed_resources','confirmations','evidence','reviews','learning_preferences','teaching_roster','curriculum_tasks','industry_needs','staff_roles'] loop
 execute format('create policy managed_access on public.%I as restrictive for all to authenticated using(public.active_workspace() is not null) with check(public.active_workspace() is not null)',t);
end loop;end $$;
create policy active_profile_edits on public.profiles as restrictive for update to authenticated using(public.active_workspace() is not null);
create policy managed_evidence_files on storage.objects as restrictive for all to authenticated
 using(bucket_id<>'evidence' or public.active_workspace() is not null) with check(bucket_id<>'evidence' or public.active_workspace() is not null);

create table public.partner_briefs (
 id uuid primary key default gen_random_uuid(), institution_id text not null references public.institutions,
 author_id uuid not null default auth.uid(), organization text not null check(length(trim(organization)) between 1 and 120),
 kind text not null check(kind in ('Project','Placement','Curriculum input')), title text not null check(length(trim(title)) between 1 and 160),
 brief text not null check(length(trim(brief)) between 1 and 2400), status text not null default 'Submitted' check(status in ('Submitted','In discussion','Accepted','Closed')),
 response text not null default '' check(length(response)<=1600),created_at timestamptz not null default now()
);
alter table public.partner_briefs enable row level security;
revoke all on public.partner_briefs from anon,authenticated;
grant select,insert(institution_id,organization,kind,title,brief),update(status,response) on public.partner_briefs to authenticated;
create policy partner_reads on public.partner_briefs for select to authenticated using((author_id=auth.uid() and public.has_staff_role(institution_id,'industry')) or public.has_staff_role(institution_id,'teacher'));
create policy partner_adds on public.partner_briefs for insert to authenticated with check(author_id=auth.uid() and public.has_staff_role(institution_id,'industry'));
create policy campus_responds on public.partner_briefs for update to authenticated using(public.has_staff_role(institution_id,'teacher'));

create table public.advisor_turns (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,
 record_context boolean not null default false, type_context boolean not null default false,
 progress_snapshot jsonb, question text not null check(length(trim(question)) between 1 and 2500), answer text check(length(answer)<=16000),
 status text not null default 'pending' check(status in ('pending','complete','failed')), created_at timestamptz not null default now()
);
create index advisor_history on public.advisor_turns(user_id,created_at desc);
alter table public.advisor_turns enable row level security;
revoke all on public.advisor_turns from anon,authenticated;
grant select on public.advisor_turns to authenticated;
grant select,update(answer,status,progress_snapshot,record_context,type_context) on public.advisor_turns to service_role;
create policy private_chat on public.advisor_turns for select to authenticated using(user_id=auth.uid() and public.active_workspace() in ('student','campus','industry'));
create function public.start_advisor_turn(question_text text) returns uuid language plpgsql security definer set search_path='' as $$
declare turn_id uuid;
begin
 if coalesce(public.active_workspace(),'') not in ('student','campus','industry') then raise exception 'Workspace access required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(auth.uid()::text));
 if (select count(*) from public.advisor_turns where user_id=auth.uid() and created_at>now()-interval '10 minutes')>=12 then raise exception 'Please try again in ten minutes'; end if;
 insert into public.advisor_turns(user_id,question) values(auth.uid(),trim(question_text)) returning id into turn_id;
 return turn_id;
end $$;
revoke all on function public.start_advisor_turn(text) from public;
grant execute on function public.start_advisor_turn(text) to authenticated;

create table public.guidance_requests (
 id uuid primary key default gen_random_uuid(),roster_id uuid not null references public.teaching_roster on delete cascade,
 proposal text not null check(length(trim(proposal)) between 1 and 4200),source text not null check(source in ('Student','AI draft')),
 decision text not null default 'Awaiting review' check(decision in ('Awaiting review','Recommended','Revise')),
 feedback text not null default '' check(length(feedback)<=2000),created_at timestamptz not null default now()
);
alter table public.guidance_requests enable row level security;
revoke all on public.guidance_requests from anon,authenticated;
grant select,insert(roster_id,proposal,source),update(decision,feedback) on public.guidance_requests to authenticated;
create policy assigned_guidance on public.guidance_requests for select to authenticated using(exists(select from public.teaching_roster r where r.id=roster_id and auth.uid() in (r.student_id,r.teacher_id)));
create policy student_proposal on public.guidance_requests for insert to authenticated with check(public.active_workspace()='student' and exists(select from public.teaching_roster r where r.id=roster_id and r.student_id=auth.uid()));
create policy teacher_response on public.guidance_requests for update to authenticated using(public.active_workspace()='campus' and exists(select from public.teaching_roster r where r.id=roster_id and r.teacher_id=auth.uid())) with check(decision in ('Recommended','Revise') and length(trim(feedback))>0);

create table public.program_lessons(
 id text primary key, institution_id text not null references public.institutions,
 program text not null check(program in ('bizai','culinary','hospitality','events')),title text not null,
 outcome text not null, practice text not null, artifact text not null,indicator_id text not null references public.skill_indicators,
 source_url text not null check(source_url ~ '^https://'), origin text not null check(origin in ('CHAMPUS practice','Campus practice'))
);
alter table public.program_lessons enable row level security;
revoke all on public.program_lessons from anon,authenticated;
grant select on public.program_lessons to anon,authenticated;
create policy public_lessons on public.program_lessons for select using(true);
create function public.publish_practice(program_id text,lesson_title text,outcome_text text,practice_text text,indicator_text text,artifact_text text,resource_url text)
returns text language plpgsql security definer set search_path='' as $$
declare inst text; lesson text:='course-'||gen_random_uuid()::text;
begin
 select institution_id into inst from public.profiles where user_id=auth.uid();
 if not public.has_staff_role(inst,'teacher') then raise exception 'Teacher access required'; end if;
 if program_id not in ('bizai','culinary','hospitality','events') or length(trim(lesson_title)) not between 1 and 160 or length(trim(outcome_text)) not between 1 and 1000 or length(trim(practice_text)) not between 1 and 2000 or length(trim(indicator_text)) not between 1 and 1200 or length(trim(artifact_text)) not between 1 and 600 or resource_url !~ '^https://[^[:space:]/]+' then raise exception 'Complete the lesson and enter an HTTPS learning resource'; end if;
 insert into public.skill_indicators values(lesson,jsonb_build_object('id',lesson,'title',lesson_title,'cluster',program_id,'specificSkill',outcome_text,'indicator',indicator_text,'relationship','practice','sourceUrl',resource_url,'resource',jsonb_build_object('title',lesson_title,'provider','Campus resource','url',resource_url)));
 insert into public.program_lessons values(lesson,inst,program_id,lesson_title,outcome_text,practice_text,artifact_text,lesson,resource_url,'Campus practice');
 return lesson;
end $$;
revoke all on function public.publish_practice(text,text,text,text,text,text,text) from public;
grant execute on function public.publish_practice(text,text,text,text,text,text,text) to authenticated;
insert into public.skill_indicators values('bizai-web-and-apps-development','{"id": "bizai-web-and-apps-development", "title": "Web and Apps Development", "cluster": "Business Technology & AI Innovation", "specificSkill": "Build a page that lets a user make a selection and see the result.", "indicator": "A reviewer can reach the control using the keyboard, change the selection and see the corresponding result at both widths.", "relationship": "practice", "sourceUrl": "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website", "resource": {"title": "Your first website", "url": "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website", "provider": "MDN Web Docs"}}');
insert into public.program_lessons values('bizai-web-and-apps-development','pib','bizai','Web and Apps Development','Build a page that lets a user make a selection and see the result.','Sketch one screen. Add a labelled control and a result area. Use the page with a keyboard at phone and desktop widths. Save the result of each check.','A runnable page and a short record of the four checks.','bizai-web-and-apps-development','https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website','CHAMPUS practice');
insert into public.skill_indicators values('bizai-database','{"id": "bizai-database", "title": "Database", "cluster": "Business Technology & AI Innovation", "specificSkill": "Model a one-to-many relationship and retrieve related records with a join.", "indicator": "The join returns the correct parent for each child. The database rejects a child whose parent is missing.", "relationship": "practice", "sourceUrl": "https://www.postgresql.org/docs/current/tutorial.html", "resource": {"title": "PostgreSQL tutorial", "url": "https://www.postgresql.org/docs/current/tutorial.html", "provider": "PostgreSQL Global Development Group"}}');
insert into public.program_lessons values('bizai-database','pib','bizai','Database','Model a one-to-many relationship and retrieve related records with a join.','Create two tables with primary keys. Add a foreign key to the child table. Insert sample records, run a join and try inserting a child with an unknown parent.','A schema, sample inserts, a join query and the results of both checks.','bizai-database','https://www.postgresql.org/docs/current/tutorial.html','CHAMPUS practice');
insert into public.skill_indicators values('bizai-human-behaviour','{"id": "bizai-human-behaviour", "title": "Human Behaviour", "cluster": "Business Technology & AI Innovation", "specificSkill": "Separate an observed action from a possible explanation for it.", "indicator": "The note describes a visible action, considers a feature of the situation and keeps the volunteer''s answer distinct from the observer''s interpretation.", "relationship": "practice", "sourceUrl": "https://openstax.org/books/psychology-2e/pages/12-1-what-is-social-psychology", "resource": {"title": "What Is Social Psychology?", "url": "https://openstax.org/books/psychology-2e/pages/12-1-what-is-social-psychology", "provider": "OpenStax"}}');
insert into public.program_lessons values('bizai-human-behaviour','pib','bizai','Human Behaviour','Separate an observed action from a possible explanation for it.','With permission, observe a volunteer doing a short task. Write down one action, two possible reasons and a neutral follow-up question. Remove identifying details.','An anonymous observation note with the follow-up question and response.','bizai-human-behaviour','https://openstax.org/books/psychology-2e/pages/12-1-what-is-social-psychology','CHAMPUS practice');
insert into public.skill_indicators values('bizai-seo-and-geo','{"id": "bizai-seo-and-geo", "title": "SEO and GEO", "cluster": "Business Technology & AI Innovation", "specificSkill": "Revise a page so a reader can find a supported answer to a specific search question.", "indicator": "The revised page identifies the question, gives a direct answer and links to a source that supports the answer. Appearance in search results remains uncertain.", "relationship": "practice", "sourceUrl": "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide", "resource": {"title": "Optimizing for generative AI features on Google Search", "url": "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide", "provider": "Google Search Central"}}');
insert into public.program_lessons values('bizai-seo-and-geo','pib','bizai','SEO and GEO','Revise a page so a reader can find a supported answer to a specific search question.','Choose one question and inspect an existing page. Revise its title, heading and answer. Cite the source for each factual claim. Keep a copy of both versions.','The original and revised page with a short explanation of each change.','bizai-seo-and-geo','https://developers.google.com/search/docs/fundamentals/ai-optimization-guide','CHAMPUS practice');
insert into public.skill_indicators values('bizai-digital-marketing','{"id": "bizai-digital-marketing", "title": "Digital Marketing", "cluster": "Business Technology & AI Innovation", "specificSkill": "Use a conversion measure to decide one change to a campaign.", "indicator": "Both counts cover the same channel and period. Each converted visit is counted once. The report identifies the denominator and leaves the rate undefined when there are no visits.", "relationship": "practice", "sourceUrl": "https://openstax.org/books/principles-marketing/pages/16-3-metrics-used-to-evaluate-the-success-of-online-marketing", "resource": {"title": "Metrics Used to Evaluate the Success of Online Marketing", "url": "https://openstax.org/books/principles-marketing/pages/16-3-metrics-used-to-evaluate-the-success-of-online-marketing", "provider": "OpenStax"}}');
insert into public.program_lessons values('bizai-digital-marketing','pib','bizai','Digital Marketing','Use a conversion measure to decide one change to a campaign.','Define a target action. For one channel and one period, record total visits and visits with the target action. Divide the second count by the first. Explain one limit of the result.','A campaign brief and a worksheet showing the counts, calculation and proposed change.','bizai-digital-marketing','https://openstax.org/books/principles-marketing/pages/16-3-metrics-used-to-evaluate-the-success-of-online-marketing','CHAMPUS practice');
insert into public.skill_indicators values('bizai-big-data','{"id": "bizai-big-data", "title": "Big Data", "cluster": "Business Technology & AI Innovation", "specificSkill": "Produce a repeatable grouped count and reconcile the result with the input.", "indicator": "Grouped totals plus the missing-category count equal the number of unique records. Running the same steps on the same input produces the same totals.", "relationship": "practice", "sourceUrl": "https://spark.apache.org/docs/latest/api/python/getting_started/quickstart_df.html", "resource": {"title": "DataFrame quickstart", "url": "https://spark.apache.org/docs/latest/api/python/getting_started/quickstart_df.html", "provider": "Apache Spark"}}');
insert into public.program_lessons values('bizai-big-data','pib','bizai','Big Data','Produce a repeatable grouped count and reconcile the result with the input.','Read two sample files with the same schema into a Spark DataFrame. Define a stable record ID. Remove duplicates by ID, count rows with missing categories and group the remaining records.','A notebook, two small input files and a table that reconciles the counts.','bizai-big-data','https://spark.apache.org/docs/latest/api/python/getting_started/quickstart_df.html','CHAMPUS practice');
insert into public.skill_indicators values('bizai-business-model','{"id": "bizai-business-model", "title": "Business Model", "cluster": "Business Technology & AI Innovation", "specificSkill": "Connect a customer need, a value proposition, a revenue source and a delivery cost in one model.", "indicator": "The model identifies who pays, what they receive and one cost of supplying it. A proposed test addresses a named assumption.", "relationship": "practice", "sourceUrl": "https://www.strategyzer.com/library/the-business-model-canvas", "resource": {"title": "The Business Model Canvas", "url": "https://www.strategyzer.com/library/the-business-model-canvas", "provider": "Strategyzer"}}');
insert into public.program_lessons values('bizai-business-model','pib','bizai','Business Model','Connect a customer need, a value proposition, a revenue source and a delivery cost in one model.','Draft a one-page canvas. Select one customer segment and follow its path from need to purchase and delivery. Flag one assumption and describe how you would test it.','An annotated canvas and one assumption test.','bizai-business-model','https://www.strategyzer.com/library/the-business-model-canvas','CHAMPUS practice');
insert into public.skill_indicators values('bizai-entrepreneurship','{"id": "bizai-entrepreneurship", "title": "Entrepreneurship", "cluster": "Business Technology & AI Innovation", "specificSkill": "Use evidence from a customer conversation to decide which business assumption to test next.", "indicator": "The record separates what the person reported from the student''s interpretation. The proposed next test addresses uncertainty that the conversation exposed.", "relationship": "practice", "sourceUrl": "https://openstax.org/books/entrepreneurship/pages/5-2-researching-potential-business-opportunities", "resource": {"title": "Researching Potential Business Opportunities", "url": "https://openstax.org/books/entrepreneurship/pages/5-2-researching-potential-business-opportunities", "provider": "OpenStax"}}');
insert into public.program_lessons values('bizai-entrepreneurship','pib','bizai','Entrepreneurship','Use evidence from a customer conversation to decide which business assumption to test next.','Write one assumption about a customer''s problem. With consent, ask a potential customer to describe a recent instance. Record the current workaround and one observation that challenges your idea.','An anonymous interview note, an assumption and a plan for the next test.','bizai-entrepreneurship','https://openstax.org/books/entrepreneurship/pages/5-2-researching-potential-business-opportunities','CHAMPUS practice');
insert into public.skill_indicators values('bizai-english-for-business','{"id": "bizai-english-for-business", "title": "English for Business", "cluster": "Business Technology & AI Innovation", "specificSkill": "Write a concise English email that enables a business contact to confirm an arrangement.", "indicator": "A reader can identify the purpose, proposed time, preparation and next action without asking for missing details.", "relationship": "practice", "sourceUrl": "https://learnenglish.britishcouncil.org/free-resources/business/english-emails/unit-5-making-arrangements", "resource": {"title": "Making arrangements", "url": "https://learnenglish.britishcouncil.org/free-resources/business/english-emails/unit-5-making-arrangements", "provider": "British Council LearnEnglish"}}');
insert into public.program_lessons values('bizai-english-for-business','pib','bizai','English for Business','Write a concise English email that enables a business contact to confirm an arrangement.','Draft a subject line and a short message. Propose a date and time with a time zone. State what each participant needs to prepare. Ask the recipient to confirm or suggest an alternative.','A draft email and a short peer check of the four details.','bizai-english-for-business','https://learnenglish.britishcouncil.org/free-resources/business/english-emails/unit-5-making-arrangements','CHAMPUS practice');

create table public.partner_profiles (
 user_id uuid primary key default auth.uid(),institution_id text not null, name text not null check(length(trim(name)) between 1 and 120),
 sector text not null check(length(trim(sector)) between 1 and 120),description text not null check(length(trim(description)) between 1 and 1400),
 foreign key(user_id,institution_id) references public.profiles(user_id,institution_id) on delete cascade
);
alter table public.partner_profiles enable row level security;
revoke all on public.partner_profiles from anon,authenticated;
grant select,insert,update on public.partner_profiles to authenticated;
create policy partner_directory on public.partner_profiles for select to authenticated using(public.has_staff_role(institution_id,'teacher') or (user_id=auth.uid() and public.has_staff_role(institution_id,'industry')));
create policy own_partner_profile on public.partner_profiles for all to authenticated using(user_id=auth.uid() and public.has_staff_role(institution_id,'industry')) with check(user_id=auth.uid() and public.has_staff_role(institution_id,'industry'));

create function public.teaches_program_work(owner_id uuid, indicator text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from public.teaching_roster r join public.program_lessons l on l.institution_id=r.institution_id and l.program=r.program and lower(l.title)=lower(r.course)
 where r.student_id=owner_id and r.teacher_id=auth.uid() and l.indicator_id=indicator and public.has_staff_role(r.institution_id,'teacher'))
$$;
revoke all on function public.teaches_program_work(uuid,text) from public;
grant execute on function public.teaches_program_work(uuid,text) to authenticated;
create policy teacher_reads_program_work on public.evidence for select to authenticated using(task_id is null and public.teaches_program_work(user_id,indicator_id));
create policy teacher_reviews_program_work on public.reviews for insert to authenticated with check(reviewer_id=auth.uid() and exists(select from public.evidence e where e.id=evidence_id and e.task_id is null and public.teaches_program_work(e.user_id,e.indicator_id)));
create policy teacher_reads_program_files on storage.objects for select to authenticated using(bucket_id='evidence' and exists(select from public.evidence e where e.file_path=name and e.task_id is null and public.teaches_program_work(e.user_id,e.indicator_id)));
create policy student_submissions on public.evidence as restrictive for insert to authenticated with check(public.active_workspace()='student');
create policy student_uploads on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'evidence' or public.active_workspace()='student');
do $$ declare t text; begin foreach t in array array['learning_preferences','self_assessments','completed_resources'] loop
 execute format('create policy student_only on public.%I as restrictive for all to authenticated using(public.active_workspace()=''student'') with check(public.active_workspace()=''student'')',t);
end loop;end $$;
-- Adopt existing students after the institution has verified them.
create function public.approve_legacy_student(target uuid,assigned_program text,assigned_cohort int) returns void language plpgsql security definer set search_path='' as $$
declare p public.profiles;
begin
 select * into p from public.profiles where user_id=target for update;
 if p.user_id is null or p.workspace is not null or not public.has_staff_role(p.institution_id,'admin') then raise exception 'Cannot approve this account'; end if;
 if assigned_program is null or assigned_program not in ('bizai','culinary','hospitality','events') or assigned_cohort is null or assigned_cohort not between 1 and 4 then raise exception 'Choose a program and cohort'; end if;
 update public.profiles set workspace='student',program=assigned_program,cohort=assigned_cohort,enabled=true where user_id=target;
 insert into public.account_events(institution_id,actor_id,target_id,event) values(p.institution_id,auth.uid(),target,'Approved existing student');
end $$;
revoke all on function public.approve_legacy_student(uuid,text,int) from public;
grant execute on function public.approve_legacy_student(uuid,text,int) to authenticated;

create function public.teaching_placements() returns table(id uuid,student_label text,program text,course text,cohort smallint)
language sql stable security definer set search_path='' as $$
 select r.id,r.student_label,r.program,r.course,p.cohort from public.teaching_roster r join public.profiles p on p.user_id=r.student_id
 where r.teacher_id=auth.uid() and public.has_staff_role(r.institution_id,'teacher') order by r.course,r.student_label
$$;
revoke all on function public.teaching_placements() from public;
grant execute on function public.teaching_placements() to authenticated;
commit;
