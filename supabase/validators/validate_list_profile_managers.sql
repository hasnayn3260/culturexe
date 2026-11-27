-- Validator for 20261127120000_list_profile_managers.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Profile manager function exists'::text as check_name,
    case when to_regprocedure('public.list_my_profile_managers()') is null then 1 else 0 end::bigint as issue_count,
    'Expected public.list_my_profile_managers() to exist.'::text as expectation

  union all

  select
    'Profile manager function is security definer',
    case when exists (
      select 1
      from pg_proc
      where oid = to_regprocedure('public.list_my_profile_managers()')
        and prosecdef
    ) then 0 else 1 end,
    'Expected the manager lookup to securely bypass profile row visibility.'

  union all

  select
    'Profile manager function has fixed search path',
    case when exists (
      select 1
      from pg_proc
      where oid = to_regprocedure('public.list_my_profile_managers()')
        and proconfig @> array['search_path=""']
    ) then 0 else 1 end,
    'Expected an empty fixed search_path on the security-definer function.'

  union all

  select
    'Authenticated users can list eligible managers',
    case when has_function_privilege('authenticated', 'public.list_my_profile_managers()', 'EXECUTE') then 0 else 1 end,
    'Expected authenticated users to execute the scoped manager lookup.'
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
