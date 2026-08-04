insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workflow-images',
  'workflow-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Team members can view workflow images" on storage.objects;
drop policy if exists "Team members can upload workflow images" on storage.objects;
drop policy if exists "Owners or admins can update workflow images" on storage.objects;
drop policy if exists "Owners or admins can delete workflow images" on storage.objects;

create policy "Team members can view workflow images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'workflow-images'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Team members can upload workflow images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'workflow-images'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
    and ((storage.foldername(name))[2])::uuid = auth.uid()
  );

create policy "Owners or admins can update workflow images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'workflow-images'
    and (
      ((storage.foldername(name))[2])::uuid = auth.uid()
      or public.is_team_admin(((storage.foldername(name))[1])::uuid)
    )
  )
  with check (
    bucket_id = 'workflow-images'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Owners or admins can delete workflow images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'workflow-images'
    and (
      ((storage.foldername(name))[2])::uuid = auth.uid()
      or public.is_team_admin(((storage.foldername(name))[1])::uuid)
    )
  );
