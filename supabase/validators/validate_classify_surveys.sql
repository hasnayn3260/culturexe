-- Validator for 20261127130000_classify_surveys.sql
-- Every returned row must report PASS with issue_count = 0.

with checks as (
  select
    'Survey assessment type column'::text as check_name,
    case when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'survey'
        and column_name = 'assessment_type'
        and data_type = 'text'
        and is_nullable = 'NO'
    ) then 0 else 1 end::bigint as issue_count,
    'Expected the required survey.assessment_type text column.'::text as expectation

  union all

  select
    'Full culture assessment column',
    case when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'survey'
        and column_name = 'is_full_culture_assessment'
        and data_type = 'boolean'
        and is_nullable = 'NO'
    ) then 0 else 1 end,
    'Expected the required survey.is_full_culture_assessment boolean column.'

  union all

  select
    'Assessment type constraint',
    case when exists (
      select 1
      from pg_constraint
      where conrelid = 'public.survey'::regclass
        and conname = 'survey_assessment_type_check'
        and convalidated
    ) then 0 else 1 end,
    'Expected the validated culture, pulse, 360 and other assessment type constraint.'

  union all

  select
    'Full culture assessment constraint',
    case when exists (
      select 1
      from pg_constraint
      where conrelid = 'public.survey'::regclass
        and conname = 'survey_full_culture_assessment_check'
        and convalidated
    ) then 0 else 1 end,
    'Expected only culture assessments to be eligible as full-model assessments.'

  union all

  select
    'Invalid survey classifications',
    count(*),
    'Every survey must use a supported assessment type and only culture assessments may be marked as full model.'
  from public.survey
  where assessment_type not in ('culture', 'pulse', '360', 'other')
     or (is_full_culture_assessment and assessment_type <> 'culture')
)
select
  check_name,
  case when issue_count = 0 then 'PASS' else 'FAIL' end as result,
  issue_count,
  expectation
from checks
order by check_name;
