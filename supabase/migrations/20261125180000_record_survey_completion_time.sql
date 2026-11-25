-- CXW-19: record the first survey start and persist server-calculated elapsed
-- completion time. Resuming a survey never resets its original start time.

alter table public.survey_respondents
  add column if not exists completion_duration_seconds integer;

update public.survey_respondents
set completion_duration_seconds = floor(
  extract(epoch from (submitted_at - started_at))
)::integer
where submitted_at is not null
  and started_at is not null
  and submitted_at >= started_at
  and completion_duration_seconds is null;

alter table public.survey_respondents
  drop constraint if exists survey_respondents_completion_duration_nonnegative;

alter table public.survey_respondents
  add constraint survey_respondents_completion_duration_nonnegative
  check (
    completion_duration_seconds is null
    or (
      completion_duration_seconds >= 0
      and started_at is not null
      and submitted_at is not null
      and submitted_at >= started_at
    )
  );

create or replace function public.start_survey_response(p_token uuid)
returns table (
  respondent_id uuid,
  started_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_respondent public.survey_respondents%rowtype;
begin
  if p_token is null then
    raise exception 'A survey access token is required.' using errcode = 'CX001';
  end if;

  select sr.*
    into v_respondent
  from public.survey_respondents as sr
  where sr.token = p_token
  for update;

  if not found then
    raise exception 'This survey link is invalid.' using errcode = 'CX004';
  end if;

  if v_respondent.used or v_respondent.submitted_at is not null then
    raise exception 'This survey has already been submitted.' using errcode = 'CX005';
  end if;

  if not public.survey_accepting_responses(
    v_respondent.survey_id,
    v_respondent.id
  ) then
    raise exception 'This survey is closed and is no longer accepting responses.'
      using errcode = 'CX006';
  end if;

  update public.survey_respondents as sr
  set started_at = coalesce(sr.started_at, now())
  where sr.id = v_respondent.id
  returning sr.id, sr.started_at
    into respondent_id, started_at;

  return next;
end;
$$;

revoke all on function public.start_survey_response(uuid) from public;
grant execute on function public.start_survey_response(uuid)
  to anon, authenticated, service_role;

comment on function public.start_survey_response(uuid) is
  'Records the first time a respondent opens an active survey without resetting resumed sessions.';

create or replace function public.finalize_respondent_on_response()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.survey_respondents
  set
    used = true,
    submitted_at = coalesce(submitted_at, new.submitted_at, now()),
    started_at = coalesce(
      started_at,
      new.submitted_at,
      now()
    ),
    completion_duration_seconds = case
      when coalesce(submitted_at, new.submitted_at, now()) >= coalesce(
        started_at,
        new.submitted_at,
        now()
      ) then floor(
          extract(
            epoch from (
              coalesce(submitted_at, new.submitted_at, now())
              - coalesce(started_at, new.submitted_at, now())
            )
          )
        )::integer
      else 0
    end,
    draft_answers = null,
    draft_saved_at = null
  where id = new.respondent_id;

  return new;
end;
$$;

revoke all on function public.finalize_respondent_on_response() from public;

drop trigger if exists finalize_respondent_after_response
  on public.survey_responses;

create trigger finalize_respondent_after_response
after insert or update of submitted_at on public.survey_responses
for each row
execute function public.finalize_respondent_on_response();

comment on column public.survey_respondents.completion_duration_seconds is
  'Elapsed whole seconds from the respondent first opening the survey to final submission.';
