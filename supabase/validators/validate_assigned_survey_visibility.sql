-- Validator for 20261127140000_enforce_assigned_survey_visibility.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'New users are not automatically enrolled'::text as check_name,
    case when pg_get_functiondef('public.handle_new_user()'::regprocedure)
      ilike '%survey_respondents%'
      then 1 else 0 end::bigint as issue_count,
    'The auth trigger must create the profile only; survey assignment happens through Add users or Invite by email.'::text as expectation

  union all

  select
    'Broad survey read policy removed',
    count(*),
    'The public survey_read_all policy must not exist.'
  from pg_policies
  where schemaname = 'public' and tablename = 'survey'
    and policyname = 'survey_read_all'

  union all

  select
    'Broad question read policy removed',
    count(*),
    'The public sq_read_all policy must not exist.'
  from pg_policies
  where schemaname = 'public' and tablename = 'survey_questions'
    and policyname = 'sq_read_all'

  union all

  select
    'Assignment-only survey policy exists',
    case when exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'survey'
        and policyname = 'survey_assigned_read'
        and roles = array['authenticated'::name]
    ) then 0 else 1 end,
    'Authenticated clients must read surveys through their respondent assignment.'

  union all

  select
    'Assignment-only question policy exists',
    case when exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'survey_questions'
        and policyname = 'sq_assigned_read'
        and roles = array['authenticated'::name]
    ) then 0 else 1 end,
    'Authenticated clients must read questions only for assigned surveys.'

  union all

  select
    'Unsafe anonymous respondent policies removed',
    count(*),
    'Anonymous users must use token-scoped functions rather than reading or updating respondent rows directly.'
  from pg_policies
  where schemaname = 'public' and tablename = 'survey_respondents'
    and policyname in ('sr_anon_token_select', 'sr_anon_token_update')

  union all

  select
    'Clients cannot create their own assignments',
    count(*),
    'Only staff workflows may insert survey respondent assignments.'
  from pg_policies
  where schemaname = 'public' and tablename = 'survey_respondents'
    and policyname = 'sr_own_insert'

  union all

  select
    'Token-scoped functions are secured',
    count(*),
    'All token-scoped functions must be SECURITY DEFINER with an empty fixed search_path.'
  from (values
    ('public.get_survey_assignment_bundle(uuid)'::regprocedure),
    ('public.get_open_survey_bundle(uuid)'::regprocedure),
    ('public.submit_survey_response(uuid,jsonb)'::regprocedure)
  ) as expected(function_oid)
  where not exists (
    select 1
    from pg_proc
    where oid = expected.function_oid
      and prosecdef
      and proconfig @> array['search_path=""']::text[]
  )
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
