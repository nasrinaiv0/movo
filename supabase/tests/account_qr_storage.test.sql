-- Run after 20261104150000_private_account_qr_storage.sql in a test project.
do $$
declare
  bucket storage.buckets%rowtype;
  policies integer;
begin
  select * into bucket from storage.buckets where id = 'movo-account-qrs';
  if not found then raise exception 'movo-account-qrs bucket is missing'; end if;
  if bucket.public is distinct from false then raise exception 'Account QR bucket must be private'; end if;
  if bucket.file_size_limit <> 1258291 then raise exception 'Unexpected QR upload size limit'; end if;
  if bucket.allowed_mime_types <> array['image/png']::text[] then raise exception 'Only normalized PNG files should be accepted'; end if;

  select count(*) into policies from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname in (
      'Users read their MOVO account QR images',
      'Users upload their MOVO account QR images',
      'Users delete their MOVO account QR images'
    );
  if policies <> 3 then raise exception 'Expected exactly three owner-scoped QR storage policies; found %', policies; end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like '%MOVO account QR images%' and cmd = 'UPDATE'
  ) then raise exception 'QR storage must not allow object updates'; end if;
  raise notice 'Account QR storage security checks passed';
end $$;
