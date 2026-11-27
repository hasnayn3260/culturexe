-- A client account does not receive a survey merely by belonging to its
-- organisation. Visibility requires a survey_respondents assignment created by
-- Add company users or Invite by email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'client');
  safe_role text;
begin
  safe_role := case
    when requested_role in ('client', 'employee') then requested_role
    else 'client'
  end;

  insert into public.profiles (
    id, email, full_name, role, job_title, username, position, active, created_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role,
    coalesce(new.raw_user_meta_data->>'job_title', ''),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'position'), ''),
    true,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.get_survey_assignment_bundle(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'respondent', to_jsonb(respondent),
    'survey', to_jsonb(survey_record),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(question) order by question.order_num)
      from public.survey_questions as question
      where question.survey_id = survey_record.id
    ), '[]'::jsonb)
  )
  from public.survey_respondents as respondent
  join public.survey as survey_record on survey_record.id = respondent.survey_id
  where respondent.token = p_token
  limit 1;
$$;

create or replace function public.get_open_survey_bundle(p_open_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'survey', to_jsonb(survey_record),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(question) order by question.order_num)
      from public.survey_questions as question
      where question.survey_id = survey_record.id
    ), '[]'::jsonb)
  )
  from public.survey as survey_record
  where survey_record.open_link_token = p_open_token
    and survey_record.open_link_enabled
  limit 1;
$$;

create or replace function public.submit_survey_response(
  p_token uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  respondent public.survey_respondents%rowtype;
  saved_response public.survey_responses%rowtype;
  survey_record public.survey%rowtype;
  submitted_time timestamptz := now();
begin
  select * into respondent
  from public.survey_respondents
  where token = p_token;

  if not found then
    raise exception 'This survey invitation is invalid.';
  end if;

  if respondent.used or respondent.submitted_at is not null then
    raise exception 'This survey has already been submitted.';
  end if;

  if not public.survey_accepting_responses(respondent.survey_id, respondent.id) then
    raise exception 'This survey is not currently accepting responses.';
  end if;

  select * into survey_record
  from public.survey
  where id = respondent.survey_id;

  insert into public.survey_responses (
    survey_id, respondent_id, answers, submitted_at
  ) values (
    respondent.survey_id, respondent.id, coalesce(p_answers, '{}'::jsonb), submitted_time
  )
  returning * into saved_response;

  update public.survey_respondents
  set response_timing = case
    when survey_record.live_end is not null and submitted_time > survey_record.live_end then 'late'
    when survey_record.live_start is not null and survey_record.live_end is not null
      and submitted_time < survey_record.live_start + ((survey_record.live_end - survey_record.live_start) / 2)
      then 'early'
    else 'on_time'
  end
  where id = respondent.id;

  return to_jsonb(saved_response);
end;
$$;

revoke all on function public.get_survey_assignment_bundle(uuid) from public;
revoke all on function public.get_open_survey_bundle(uuid) from public;
revoke all on function public.submit_survey_response(uuid, jsonb) from public;
grant execute on function public.get_survey_assignment_bundle(uuid) to anon, authenticated;
grant execute on function public.get_open_survey_bundle(uuid) to anon, authenticated;
grant execute on function public.submit_survey_response(uuid, jsonb) to anon, authenticated;

drop policy if exists survey_read_all on public.survey;
drop policy if exists survey_staff_read on public.survey;
drop policy if exists survey_assigned_read on public.survey;

create policy survey_staff_read
on public.survey
for select
to authenticated
using (public.is_admin());

create policy survey_assigned_read
on public.survey
for select
to authenticated
using (
  exists (
    select 1
    from public.survey_respondents as assignment
    where assignment.survey_id = survey.id
      and (
        assignment.user_id = auth.uid()
        or lower(assignment.email) = lower(auth.email())
      )
  )
);

drop policy if exists sq_read_all on public.survey_questions;
drop policy if exists sq_staff_read on public.survey_questions;
drop policy if exists sq_assigned_read on public.survey_questions;

create policy sq_staff_read
on public.survey_questions
for select
to authenticated
using (public.is_admin());

create policy sq_assigned_read
on public.survey_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.survey_respondents as assignment
    where assignment.survey_id = survey_questions.survey_id
      and (
        assignment.user_id = auth.uid()
        or lower(assignment.email) = lower(auth.email())
      )
  )
);

drop policy if exists sr_anon_token_select on public.survey_respondents;
drop policy if exists sr_anon_token_update on public.survey_respondents;
drop policy if exists sr_own_insert on public.survey_respondents;
drop policy if exists sresp_anon_insert on public.survey_responses;

comment on function public.get_survey_assignment_bundle(uuid) is
  'Returns one invitation-token-scoped respondent, survey and questionnaire bundle without exposing other assignments.';
comment on function public.get_open_survey_bundle(uuid) is
  'Returns one enabled open-link survey and its questionnaire by unguessable open token.';
comment on function public.submit_survey_response(uuid, jsonb) is
  'Submits a response through its invitation token while enforcing the survey response window.';
