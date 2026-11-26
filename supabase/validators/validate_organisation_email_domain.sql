-- Validator for 20261126110000_enforce_organisation_email_domain.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Organisation email domain column'::text as check_name,
    case when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'organisations'
        and column_name = 'email_domain'
        and data_type = 'text'
    ) then 0 else 1 end::bigint as issue_count,
    'Expected the text organisations.email_domain column.'::text as expectation

  union all

  select
    'Email domain format constraint',
    case when exists (
      select 1
      from pg_constraint
      where conrelid = 'public.organisations'::regclass
        and conname = 'organisations_email_domain_format_check'
        and convalidated
    ) then 0 else 1 end,
    'Expected the validated organisation email-domain format constraint.'

  union all

  select
    'Organisations missing an import domain',
    count(*),
    'Every organisation used for user imports must have an email domain configured.'
  from public.organisations
  where email_domain is null or trim(email_domain) = ''

  union all

  select
    'Invalid organisation email domains',
    count(*),
    'Domains must be lowercase hostnames without a protocol, path, www prefix or @.'
  from public.organisations
  where email_domain is not null
    and (
      email_domain <> lower(email_domain)
      or email_domain !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
    )

  union all

  select
    'Existing users outside organisation domains',
    count(*),
    'Every linked profile email must match its organisation email domain.'
  from public.profiles profile
  join public.organisations organisation on organisation.id = profile.org_id
  where organisation.email_domain is not null
    and lower(split_part(coalesce(profile.email, ''), '@', 2))
      <> organisation.email_domain
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
