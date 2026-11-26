-- Survey response files can contain personal or confidential information.
-- Keep the bucket private and allow access only through validated server
-- endpoints that issue path-specific upload tokens and short-lived read URLs.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'survey-files',
  'survey-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon_upload_survey_files" on storage.objects;
drop policy if exists "auth_manage_survey_files" on storage.objects;
drop policy if exists "public_read_survey_files" on storage.objects;
