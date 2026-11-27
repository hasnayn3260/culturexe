-- Validator for 20261127144000_normalise_submit_error_codes.sql
-- Every returned row must report PASS with issue_count = 0.
with function_details as (
  select
    p.prosecdef,
    p.proconfig,
    pg_get_functiondef(p.oid) as definition
  from pg_proc as p
  where p.oid = to_regprocedure('public.submit_survey_response(uuid,jsonb)')
), checks as (
  select
    'Submission function exists'::text as check_name,
    case when exists (select 1 from function_details) then 0 else 1 end::bigint as issue_count,
    'Expected public.submit_survey_response(uuid, jsonb) to exist.'::text as expectation

  union all

  select
    'Submission errors use registered codes',
    case when exists (
      select 1
      from function_details
      where definition like '%CX004%'
        and definition like '%CX005%'
        and definition like '%CX006%'
    ) then 0 else 1 end,
    'Expected invalid, submitted and closed response branches to use CX004, CX005 and CX006.'

  union all

  select
    'Submission function remains security definer',
    case when exists (
      select 1 from function_details where prosecdef
    ) then 0 else 1 end,
    'Expected the token-scoped submission function to remain SECURITY DEFINER.'

  union all

  select
    'Submission function keeps fixed search path',
    case when exists (
      select 1 from function_details where proconfig @> array['search_path=""']
    ) then 0 else 1 end,
    'Expected an empty fixed search_path on the security-definer function.'

  union all

  select
    'Respondent roles retain submission access',
    case when
      has_function_privilege('anon', 'public.submit_survey_response(uuid,jsonb)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.submit_survey_response(uuid,jsonb)', 'EXECUTE')
      then 0 else 1 end,
    'Expected anonymous token respondents and authenticated assignees to retain submission access.'

  union all

  select
    'Submission timing remains recorded',
    case when exists (
      select 1
      from function_details
      where definition like '%response_timing%'
        and definition like '%submitted_time%'
    ) then 0 else 1 end,
    'Expected the existing submission timing update to remain in place.'
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
