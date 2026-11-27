-- Validator for 20261127141000_prevent_client_self_assignment.sql
-- The returned row must report PASS with issue_count = 0.

select
  'Clients cannot create their own assignments'::text as check_name,
  case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
  count(*)::bigint as issue_count,
  'Only staff workflows may insert survey respondent assignments.'::text as expectation
from pg_policies
where schemaname = 'public'
  and tablename = 'survey_respondents'
  and policyname = 'sr_own_insert';
