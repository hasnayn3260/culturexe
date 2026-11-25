-- Validator for 20261125170000_preserve_partial_survey_answers.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Required draft columns'::text as check_name,
    greatest(3 - count(*), 0)::bigint as issue_count,
    'survey_respondents must contain draft_answers, draft_saved_at and started_at.'::text as expectation
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'survey_respondents'
    and column_name in ('draft_answers', 'draft_saved_at', 'started_at')

  union all

  select
    'Draft-saving function exists',
    case when to_regprocedure('public.save_survey_draft(uuid,jsonb)') is null then 1 else 0 end,
    'Expected public.save_survey_draft(uuid,jsonb).'

  union all

  select
    'Response-window dependency exists',
    case when to_regprocedure('public.survey_accepting_responses(uuid,uuid)') is null then 1 else 0 end,
    'Expected public.survey_accepting_responses(uuid,uuid).'

  union all

  select
    'Function security configuration',
    count(*) filter (where not p.prosecdef or p.provolatile <> 'v'),
    'save_survey_draft must be SECURITY DEFINER and VOLATILE.'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = to_regprocedure('public.save_survey_draft(uuid,jsonb)')

  union all

  select
    'Function search path',
    case when exists (
      select 1
      from pg_proc p
      where p.oid = to_regprocedure('public.save_survey_draft(uuid,jsonb)')
        and coalesce(p.proconfig, array[]::text[]) @> array['search_path=public, pg_temp']::text[]
    ) then 0 else 1 end,
    'The function search_path must be public, pg_temp.'

  union all

  select
    'Required execute permissions',
    (
      case when has_function_privilege('anon', 'public.save_survey_draft(uuid,jsonb)', 'EXECUTE') then 0 else 1 end
      + case when has_function_privilege('authenticated', 'public.save_survey_draft(uuid,jsonb)', 'EXECUTE') then 0 else 1 end
      + case when has_function_privilege('service_role', 'public.save_survey_draft(uuid,jsonb)', 'EXECUTE') then 0 else 1 end
    )::bigint,
    'anon, authenticated and service_role must have EXECUTE permission.'

  union all

  select
    'Public execute permission revoked',
    count(*),
    'PUBLIC must not have EXECUTE permission.'
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'save_survey_draft'
    and grantee = 'PUBLIC'
    and privilege_type = 'EXECUTE'

  union all

  select
    'Registered CultureXE error codes',
    count(*),
    'The function must retain CX001 through CX006 for frontend toast mapping.'
  from (
    values ('CX001'), ('CX002'), ('CX003'), ('CX004'), ('CX005'), ('CX006')
  ) as required_codes(code)
  where position(
    required_codes.code in pg_get_functiondef(to_regprocedure('public.save_survey_draft(uuid,jsonb)'))
  ) = 0

  union all

  select
    'Respondent finalisation function',
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'finalize_respondent_on_response'
        and p.prorettype = 'trigger'::regtype
        and p.prosecdef
        and coalesce(p.proconfig, array[]::text[]) @> array['search_path=public, pg_temp']::text[]
    ) then 0 else 1 end,
    'Expected a SECURITY DEFINER trigger function with the restricted search path.'

  union all

  select
    'Respondent finalisation trigger',
    case when exists (
      select 1
      from pg_trigger trigger_record
      where trigger_record.tgrelid = 'public.survey_responses'::regclass
        and trigger_record.tgname = 'finalize_respondent_after_response'
        and not trigger_record.tgisinternal
        and trigger_record.tgenabled <> 'D'
    ) then 0 else 1 end,
    'Expected the enabled finalize_respondent_after_response trigger on survey_responses.'

  union all

  select
    'Draft answers are JSON objects',
    count(*),
    'Every stored draft_answers value must be a JSON object.'
  from public.survey_respondents
  where draft_answers is not null
    and jsonb_typeof(draft_answers) <> 'object'

  union all

  select
    'Draft values have matching timestamps',
    count(*),
    'draft_answers and draft_saved_at must either both be populated or both be null.'
  from public.survey_respondents
  where (draft_answers is null) <> (draft_saved_at is null)

  union all

  select
    'Submitted responses do not retain drafts',
    count(*),
    'Respondents with a submitted response must not retain partial draft data.'
  from public.survey_respondents sr
  where (sr.draft_answers is not null or sr.draft_saved_at is not null)
    and exists (
      select 1
      from public.survey_responses response
      where response.respondent_id = sr.id
    )
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
