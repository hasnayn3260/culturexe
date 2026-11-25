-- Validator for 20261125190000_track_unique_repeat_survey_access.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Access event table'::text as check_name,
    case when to_regclass('public.survey_access_events') is not null
      then 0 else 1 end::bigint as issue_count,
    'Expected public.survey_access_events.'::text as expectation

  union all

  select
    'Respondent access summary columns',
    case when (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'survey_respondents'
        and column_name in ('first_accessed_at', 'last_accessed_at', 'access_count')
    ) = 3 then 0 else 1 end,
    'Expected first_accessed_at, last_accessed_at and integer access_count columns.'

  union all

  select
    'Access summary constraint',
    case when exists (
      select 1
      from pg_constraint constraint_record
      where constraint_record.conrelid = 'public.survey_respondents'::regclass
        and constraint_record.conname = 'survey_respondents_access_summary_valid'
        and constraint_record.convalidated
    ) then 0 else 1 end,
    'Expected the validated respondent access summary constraint.'

  union all

  select
    'Access event constraints',
    case when (
      select count(*)
      from pg_constraint constraint_record
      where constraint_record.conrelid = 'public.survey_access_events'::regclass
        and constraint_record.conname in (
          'survey_access_events_access_type_check',
          'survey_access_events_respondent_access_key',
          'survey_access_events_pkey',
          'survey_access_events_respondent_id_fkey',
          'survey_access_events_respondent_survey_fkey',
          'survey_access_events_survey_id_fkey'
        )
        and constraint_record.convalidated
    ) = 6 then 0 else 1 end,
    'Expected validated primary, foreign-key, cross-survey and idempotency constraints.'

  union all

  select
    'First-access uniqueness index',
    case when to_regclass('public.survey_access_events_first_per_respondent_idx') is not null
      then 0 else 1 end,
    'Expected one first-access event at most per respondent.'

  union all

  select
    'Access event row-level security',
    case when exists (
      select 1
      from pg_class table_record
      where table_record.oid = 'public.survey_access_events'::regclass
        and table_record.relrowsecurity
    ) then 0 else 1 end,
    'Row Level Security must be enabled on survey_access_events.'

  union all

  select
    'Staff access event policy',
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'survey_access_events'
        and policyname = 'survey_access_events_staff_read'
        and cmd = 'SELECT'
        and roles = array['authenticated']::name[]
        and position('is_admin' in coalesce(qual, '')) > 0
    ) then 0 else 1 end,
    'Only authenticated administrative staff may select raw access events.'

  union all

  select
    'Anonymous access event privileges',
    count(*),
    'anon must have no direct survey_access_events privileges.'
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'survey_access_events'
    and grantee = 'anon'

  union all

  select
    'Authenticated access event write privileges',
    count(*),
    'authenticated must not directly insert, update or delete access events.'
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'survey_access_events'
    and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE')

  union all

  select
    'Access recording function',
    case when exists (
      select 1
      from pg_proc function_record
      where function_record.oid = to_regprocedure(
        'public.record_survey_access(uuid,uuid)'
      )
        and function_record.prosecdef
        and function_record.provolatile = 'v'
        and coalesce(function_record.proconfig, array[]::text[])
          @> array['search_path=public, pg_temp']::text[]
    ) then 0 else 1 end,
    'Expected a VOLATILE SECURITY DEFINER function with a restricted search path.'

  union all

  select
    'Access recording execute permissions',
    (
      case when has_function_privilege(
        'anon', 'public.record_survey_access(uuid,uuid)', 'EXECUTE'
      ) then 0 else 1 end
      + case when has_function_privilege(
        'authenticated', 'public.record_survey_access(uuid,uuid)', 'EXECUTE'
      ) then 0 else 1 end
      + case when has_function_privilege(
        'service_role', 'public.record_survey_access(uuid,uuid)', 'EXECUTE'
      ) then 0 else 1 end
    )::bigint,
    'anon, authenticated and service_role must have EXECUTE permission.'

  union all

  select
    'Access recording public permission revoked',
    count(*),
    'PUBLIC must not have EXECUTE permission on record_survey_access.'
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'record_survey_access'
    and grantee = 'PUBLIC'
    and privilege_type = 'EXECUTE'

  union all

  select
    'Access recording error codes',
    count(*),
    'The function must retain CX001, CX004 and CX007 for toast mapping.'
  from (
    values ('CX001'), ('CX004'), ('CX007')
  ) as required_codes(code)
  where position(
    required_codes.code in pg_get_functiondef(
      to_regprocedure('public.record_survey_access(uuid,uuid)')
    )
  ) = 0

  union all

  select
    'Access events match respondent surveys',
    count(*),
    'Every access event survey_id must match its respondent survey_id.'
  from public.survey_access_events as event
  join public.survey_respondents as respondent
    on respondent.id = event.respondent_id
  where event.survey_id <> respondent.survey_id

  union all

  select
    'Respondent access counters match events',
    count(*),
    'Respondent access_count and first/last timestamps must match the event ledger.'
  from public.survey_respondents as respondent
  left join (
    select
      event.respondent_id,
      count(*)::integer as event_count,
      min(event.accessed_at) as first_accessed_at,
      max(event.accessed_at) as last_accessed_at
    from public.survey_access_events as event
    group by event.respondent_id
  ) as summary on summary.respondent_id = respondent.id
  where respondent.access_count <> coalesce(summary.event_count, 0)
    or respondent.first_accessed_at is distinct from summary.first_accessed_at
    or respondent.last_accessed_at is distinct from summary.last_accessed_at

  union all

  select
    'Access event first/repeat classification',
    count(*),
    'Each accessed respondent needs exactly one first event and all later events must be repeat.'
  from (
    select
      event.respondent_id,
      count(*) filter (where event.access_type = 'first') as first_count,
      count(*) filter (where event.access_type = 'repeat') as repeat_count,
      count(*) as total_count
    from public.survey_access_events as event
    group by event.respondent_id
  ) as classification
  where classification.first_count <> 1
    or classification.repeat_count <> classification.total_count - 1
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
