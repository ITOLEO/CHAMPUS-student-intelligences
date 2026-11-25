begin;
alter policy active_profile_edits on public.profiles using (public.active_workspace() in ('campus','industry','admin'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-photos','profile-photos',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy profile_photo_owner on storage.objects for all to authenticated
using (bucket_id='profile-photos' and split_part(name,'/',1)=auth.uid()::text and public.active_workspace() in ('campus','industry','admin'))
with check (bucket_id='profile-photos' and split_part(name,'/',1)=auth.uid()::text and public.active_workspace() in ('campus','industry','admin'));
alter table public.advisor_turns add column thread_id uuid;
create index advisor_thread_history on public.advisor_turns(user_id,thread_id,created_at desc);
create function public.start_advisor_thread_turn(question_text text, thread uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare turn_id uuid;
begin
 turn_id:=public.start_advisor_turn(question_text);
 update public.advisor_turns set thread_id=thread where id=turn_id;
 return turn_id;
end $$;
revoke all on function public.start_advisor_thread_turn(text,uuid) from public;
grant execute on function public.start_advisor_thread_turn(text,uuid) to authenticated;
commit;
