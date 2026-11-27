alter table public.survey
  add column if not exists assessment_type text not null default 'culture',
  add column if not exists is_full_culture_assessment boolean not null default false;

alter table public.survey
  drop constraint if exists survey_assessment_type_check;

alter table public.survey
  add constraint survey_assessment_type_check
  check (assessment_type in ('culture', 'pulse', '360', 'other'));

alter table public.survey
  drop constraint if exists survey_full_culture_assessment_check;

alter table public.survey
  add constraint survey_full_culture_assessment_check
  check (not is_full_culture_assessment or assessment_type = 'culture');

comment on column public.survey.assessment_type is
  'Classifies the assessment so culture, pulse, 360 and other results remain distinct.';

comment on column public.survey.is_full_culture_assessment is
  'True only when the culture assessment covers the complete culture model and may contribute to the overall culture score.';
