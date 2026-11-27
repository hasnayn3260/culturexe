-- Validator for 20261127143000_revoke_anonymous_culture_history.sql
-- The returned row must report PASS with issue_count = 0.

select
  'Anonymous users cannot read culture history'::text as check_name,
  case when has_function_privilege(
    'anon',
    'public.list_my_culture_score_history()',
    'EXECUTE'
  ) then 'FAIL' else 'PASS' end as result,
  case when has_function_privilege(
    'anon',
    'public.list_my_culture_score_history()',
    'EXECUTE'
  ) then 1 else 0 end::bigint as issue_count,
  'Culture score history must require an authenticated client.'::text as expectation;
