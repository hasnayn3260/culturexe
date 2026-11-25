-- CXW-14: persist partial answers for token-based survey participants.
-- Drafts remain separate from survey_responses so they never count as a
-- completed submission or trigger a completion receipt.

alter table public.survey_respondents
  add column if not exists draft_answers jsonb,
  add column if not exists draft_saved_at timestamptz,
  add column if not exists started_at timestamptz;

-- Older clients could leave a redundant draft behind after the submitted
-- response was committed. The submitted response remains the source of truth.
update public.survey_respondents as sr
set
  draft_answers = null,
  draft_saved_at = null
where (sr.draft_answers is not null or sr.draft_saved_at is not null)
  and exists (
    select 1
    from public.survey_responses as response
    where response.respondent_id = sr.id
  );

create or replace function public.save_survey_draft(
  p_token uuid,
  p_answers jsonb
)
returns table (
  respondent_id uuid,
  started_at timestamptz,
  draft_saved_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_respondent public.survey_respondents%rowtype;
  v_saved_at timestamptz := now();
begin
  if p_token is null then
    raise exception 'A survey access token is required.' using errcode = 'CX001';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Draft answers must be a JSON object.' using errcode = 'CX002';
  end if;

  if octet_length(p_answers::text) > 1048576 then
    raise exception 'Draft answers exceed the 1 MB limit.' using errcode = 'CX003';
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
  set
    started_at = coalesce(sr.started_at, v_saved_at),
    draft_answers = p_answers,
    draft_saved_at = v_saved_at
  where sr.id = v_respondent.id
  returning sr.id, sr.started_at, sr.draft_saved_at
    into respondent_id, started_at, draft_saved_at;

  return next;
end;
$$;

revoke all on function public.save_survey_draft(uuid, jsonb) from public;
grant execute on function public.save_survey_draft(uuid, jsonb)
  to anon, authenticated, service_role;

comment on function public.save_survey_draft(uuid, jsonb) is
  'Saves token-scoped partial survey answers while the survey response window is open. Drafts do not count as submitted responses.';

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
    submitted_at = coalesce(new.submitted_at, submitted_at, now()),
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

comment on function public.finalize_respondent_on_response() is
  'Marks a respondent submitted and removes redundant draft data whenever the final response is committed.';

