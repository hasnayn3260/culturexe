-- Keep respondent submission failures consistent with the CultureXE error registry.
-- The response, timing, assignment and permission behaviour is unchanged.
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
    raise exception 'This survey invitation is invalid.' using errcode = 'CX004';
  end if;

  if respondent.used or respondent.submitted_at is not null then
    raise exception 'This survey has already been submitted.' using errcode = 'CX005';
  end if;

  if not public.survey_accepting_responses(respondent.survey_id, respondent.id) then
    raise exception 'This survey is not currently accepting responses.' using errcode = 'CX006';
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

comment on function public.submit_survey_response(uuid, jsonb) is
  'Submits an assigned response, records timing and raises stable CultureXE error codes.';
