-- Private, per-user bank QR images. Each upload is immutable/versioned; clients never overwrite objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('movo-account-qrs', 'movo-account-qrs', false, 1258291, array['image/png'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their MOVO account QR images" on storage.objects;
create policy "Users read their MOVO account QR images" on storage.objects
for select to authenticated
using (bucket_id = 'movo-account-qrs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users upload their MOVO account QR images" on storage.objects;
create policy "Users upload their MOVO account QR images" on storage.objects
for insert to authenticated
with check (bucket_id = 'movo-account-qrs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their MOVO account QR images" on storage.objects;
create policy "Users delete their MOVO account QR images" on storage.objects
for delete to authenticated
using (bucket_id = 'movo-account-qrs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- No UPDATE policy: immutable versioned object names make upsert/overwrite unnecessary.
