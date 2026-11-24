create table if not exists public.survey_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_templates_name_not_blank
    check (length(btrim(name)) between 2 and 180),
  constraint survey_templates_description_length
    check (description is null or length(description) <= 5000)
);

create table if not exists public.survey_template_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.survey_templates(id) on delete cascade,
  text text not null,
  hint text,
  question_type text not null default 'LIKERT',
  dimension text,
  order_num integer not null default 0,
  options jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_template_questions_text_not_blank
    check (length(btrim(text)) between 1 and 5000),
  constraint survey_template_questions_hint_length
    check (hint is null or length(hint) <= 2000),
  constraint survey_template_questions_dimension_length
    check (dimension is null or length(dimension) <= 180),
  constraint survey_template_questions_order_nonnegative
    check (order_num >= 0),
  constraint survey_template_questions_template_order_unique
    unique (template_id, order_num)
);

create unique index if not exists survey_templates_global_name_unique
  on public.survey_templates (lower(btrim(name)))
  where org_id is null;

create unique index if not exists survey_templates_org_name_unique
  on public.survey_templates (org_id, lower(btrim(name)))
  where org_id is not null;

create index if not exists survey_templates_org_id_idx
  on public.survey_templates (org_id);

create index if not exists survey_templates_active_idx
  on public.survey_templates (active);

create index if not exists survey_template_questions_template_id_idx
  on public.survey_template_questions (template_id, order_num);

drop trigger if exists survey_templates_set_updated_at
  on public.survey_templates;

create trigger survey_templates_set_updated_at
before update on public.survey_templates
for each row execute function public.update_updated_at();

drop trigger if exists survey_template_questions_set_updated_at
  on public.survey_template_questions;

create trigger survey_template_questions_set_updated_at
before update on public.survey_template_questions
for each row execute function public.update_updated_at();

alter table public.survey_templates enable row level security;
alter table public.survey_template_questions enable row level security;

drop policy if exists survey_templates_superadmin_all
  on public.survey_templates;

create policy survey_templates_superadmin_all
on public.survey_templates
for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists survey_template_questions_superadmin_all
  on public.survey_template_questions;

create policy survey_template_questions_superadmin_all
on public.survey_template_questions
for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

revoke all on table public.survey_templates from anon;
revoke all on table public.survey_template_questions from anon;

grant select, insert, update, delete
  on table public.survey_templates to authenticated;
grant select, insert, update, delete
  on table public.survey_template_questions to authenticated;

grant all on table public.survey_templates to service_role;
grant all on table public.survey_template_questions to service_role;

comment on table public.survey_templates is
  'Reusable global or organisation-specific survey definitions. Managed by super administrators.';

comment on column public.survey_templates.org_id is
  'Null for a global template; otherwise limits the template to one organisation.';

comment on table public.survey_template_questions is
  'Ordered reusable question content belonging to a survey template.';
