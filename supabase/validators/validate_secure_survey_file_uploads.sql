-- Validator for 20261126130000_secure_survey_file_uploads.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Private survey file bucket'::text as check_name,
    case when exists (
      select 1
      from storage.buckets
      where id = 'survey-files'
        and public = false
    ) then 0 else 1 end::bigint as issue_count,
    'Expected storage.buckets.survey-files to exist and be private.'::text as expectation

  union all

  select
    'Survey file size limit',
    case when exists (
      select 1
      from storage.buckets
      where id = 'survey-files'
        and file_size_limit = 10485760
    ) then 0 else 1 end,
    'Expected an exact 10 MB survey-file upload limit.'

  union all

  select
    'Survey file MIME allowlist',
    case when exists (
      select 1
      from storage.buckets
      where id = 'survey-files'
        and allowed_mime_types @> array[
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
        and allowed_mime_types <@ array[
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
    ) then 0 else 1 end,
    'Expected only the approved document and image MIME types.'

  union all

  select
    'No direct survey file storage policies',
    count(*),
    'The browser must use path-specific signed operations instead of direct bucket policies.'
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and (
      coalesce(qual, '') ilike '%survey-files%'
      or coalesce(with_check, '') ilike '%survey-files%'
      or policyname in (
        'anon_upload_survey_files',
        'auth_manage_survey_files',
        'public_read_survey_files'
      )
    )
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
