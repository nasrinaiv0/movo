-- Private receipt storage. Paths are always rooted at the authenticated user's UUID.
alter table public.transactions add column if not exists receipt_path text;
alter table public.transactions add column if not exists payment_reference text;
alter table public.transactions add column if not exists receipt_note text;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('movo-receipts','movo-receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users read their MOVO receipts" on storage.objects;
create policy "Users read their MOVO receipts" on storage.objects
for select to authenticated using (bucket_id='movo-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users upload their MOVO receipts" on storage.objects;
create policy "Users upload their MOVO receipts" on storage.objects
for insert to authenticated with check (bucket_id='movo-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users update their MOVO receipts" on storage.objects;
create policy "Users update their MOVO receipts" on storage.objects
for update to authenticated using (bucket_id='movo-receipts' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='movo-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete their MOVO receipts" on storage.objects;
create policy "Users delete their MOVO receipts" on storage.objects
for delete to authenticated using (bucket_id='movo-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
