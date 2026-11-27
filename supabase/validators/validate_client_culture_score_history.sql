-- Validator for 20261127142000_client_culture_score_history.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Client culture score function exists'::text as check_name,
    case when to_regprocedure('public.list_my_culture_score_history()') is null
      then 1 else 0 end::bigint as issue_count,
    'Expected public.list_my_culture_score_history() to exist.'::text as expectation

  union all

  select
    'Client culture score function is security definer',
    case when exists (
      select 1 from pg_proc
      where oid = to_regprocedure('public.list_my_culture_score_history()')
        and prosecdef
    ) then 0 else 1 end,
    'Expected aggregate scoring to securely read assigned response data.'

  union all

  select
    'Client culture score function has fixed search path',
    case when exists (
      select 1 from pg_proc
      where oid = to_regprocedure('public.list_my_culture_score_history()')
        and proconfig @> array['search_path=""']
    ) then 0 else 1 end,
    'Expected an empty fixed search_path on the security-definer function.'

  union all

  select
    'Authenticated clients can read aggregate history',
    case when has_function_privilege(
      'authenticated',
      'public.list_my_culture_score_history()',
      'EXECUTE'
    ) then 0 else 1 end,
    'Expected authenticated users to execute the aggregate history function.'

  union all

  select
    'Anonymous users cannot read culture history',
    case when has_function_privilege(
      'anon',
      'public.list_my_culture_score_history()',
      'EXECUTE'
    ) then 1 else 0 end,
    'Culture score history must require an authenticated client.'

  union all

  select
    'Culture history exposes aggregate columns only',
    case when lower(pg_get_function_result(
      to_regprocedure('public.list_my_culture_score_history()')
    )) similar to '%(answers|respondent_id|email|full_name)%'
      then 1 else 0 end,
    'The function must not return raw answers or respondent identity fields.'
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
