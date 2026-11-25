-- CXW-15: enforce survey response windows at the database boundary.
-- The UI also checks these dates, but RLS prevents a late submission made
-- directly through the Supabase REST API.

create or replace function public.survey_accepting_responses(
  p_survey_id uuid,
  p_respondent_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.survey as s
    join public.survey_respondents as sr
      on sr.survey_id = s.id
    where s.id = p_survey_id
      and sr.id = p_respondent_id
      and s.status = 'live'
      and s.live_start is not null
      and s.live_end is not null
      and s.live_end > s.live_start
      and now() >= s.live_start
      and now() < s.live_end
  );
$$;

revoke all on function public.survey_accepting_responses(uuid, uuid) from public;
grant execute on function public.survey_accepting_responses(uuid, uuid)
  to anon, authenticated, service_role;

drop policy if exists "sresp_anon_insert" on public.survey_responses;
create policy "sresp_anon_insert"
  on public.survey_responses
  for insert
  to anon
  with check (
    public.survey_accepting_responses(survey_id, respondent_id)
  );

drop policy if exists "sresp_own_write" on public.survey_responses;
create policy "sresp_own_write"
  on public.survey_responses
  for insert
  to authenticated
  with check (
    public.survey_accepting_responses(survey_id, respondent_id)
    and exists (
      select 1
      from public.survey_respondents as sr
      where sr.id = survey_responses.respondent_id
        and sr.survey_id = survey_responses.survey_id
        and (
          sr.user_id = auth.uid()
          or lower(sr.email) = lower(auth.email())
        )
    )
  );

comment on function public.survey_accepting_responses(uuid, uuid) is
  'Returns true only when the respondent belongs to the survey and its live response window is currently open.';
