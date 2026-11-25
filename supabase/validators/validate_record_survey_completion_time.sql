-- Validator for 20261125180000_record_survey_completion_time.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Completion duration column'::text as check_name,
    case when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'survey_respondents'
        and column_name = 'completion_duration_seconds'
        and data_type = 'integer'
    ) then 0 else 1 end::bigint as issue_count,
    'Expected the integer survey_respondents.completion_duration_seconds column.'::text as expectation

  union all

  select
    'Completion duration constraint',
    case when exists (
      select 1
      from pg_constraint constraint_record
      where constraint_record.conrelid = 'public.survey_respondents'::regclass
        and constraint_record.conname = 'survey_respondents_completion_duration_nonnegative'
        and constraint_record.convalidated
    ) then 0 else 1 end,
    'Expected the validated duration and timestamp integrity constraint.'

  union all

  select
    'Survey start function',
    case when exists (
      select 1
      from pg_proc p
      where p.oid = to_regprocedure('public.start_survey_response(uuid)')
        and p.prosecdef
        and p.provolatile = 'v'
        and coalesce(p.proconfig, array[]::text[]) @> array['search_path=public, pg_temp']::text[]
    ) then 0 else 1 end,
    'Expected a VOLATILE SECURITY DEFINER start function with the restricted search path.'

  union all

  select
    'Survey start execute permissions',
    (
      case when has_function_privilege('anon', 'public.start_survey_response(uuid)', 'EXECUTE') then 0 else 1 end
      + case when has_function_privilege('authenticated', 'public.start_survey_response(uuid)', 'EXECUTE') then 0 else 1 end
      + case when has_function_privilege('service_role', 'public.start_survey_response(uuid)', 'EXECUTE') then 0 else 1 end
    )::bigint,
    'anon, authenticated and service_role must have EXECUTE permission.'

  union all

  select
    'Survey start public permission revoked',
    count(*),
    'PUBLIC must not have EXECUTE permission on start_survey_response.'
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'start_survey_response'
    and grantee = 'PUBLIC'
    and privilege_type = 'EXECUTE'

  union all

  select
    'Survey timing error codes',
    count(*),
    'The start function must retain CX001, CX004, CX005 and CX006 for toast mapping.'
  from (
    values ('CX001'), ('CX004'), ('CX005'), ('CX006')
  ) as required_codes(code)
  where position(
    required_codes.code in pg_get_functiondef(
      to_regprocedure('public.start_survey_response(uuid)')
    )
  ) = 0

  union all

  select
    'Completion finalisation trigger',
    case when exists (
      select 1
      from pg_trigger trigger_record
      where trigger_record.tgrelid = 'public.survey_responses'::regclass
        and trigger_record.tgname = 'finalize_respondent_after_response'
        and not trigger_record.tgisinternal
        and trigger_record.tgenabled <> 'D'
    ) then 0 else 1 end,
    'Expected the enabled response finalisation trigger.'

  union all

  select
    'Finalisation calculates duration',
    case when position(
      'completion_duration_seconds' in pg_get_functiondef(
        to_regprocedure('public.finalize_respondent_on_response()')
      )
    ) > 0 then 0 else 1 end,
    'The finalisation function must calculate completion_duration_seconds.'

  union all

  select
    'Invalid completion durations',
    count(*),
    'Stored durations must be non-negative and require valid start/submission timestamps.'
  from public.survey_respondents
  where completion_duration_seconds is not null
    and (
      completion_duration_seconds < 0
      or started_at is null
      or submitted_at is null
      or submitted_at < started_at
    )

  union all

  select
    'Missing calculable completion durations',
    count(*),
    'Submitted respondents with valid start and submission timestamps require a stored duration.'
  from public.survey_respondents
  where submitted_at is not null
    and started_at is not null
    and submitted_at >= started_at
    and completion_duration_seconds is null

  union all

  select
    'Incorrect completion durations',
    count(*),
    'Stored duration must equal the elapsed whole seconds between first start and submission.'
  from public.survey_respondents
  where completion_duration_seconds is not null
    and completion_duration_seconds <> floor(
      extract(epoch from (submitted_at - started_at))
    )::integer

  union all

  select
    'Incomplete respondents without final duration',
    count(*),
    'Respondents without a final submission must not have a completion duration.'
  from public.survey_respondents
  where submitted_at is null
    and completion_duration_seconds is not null
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
