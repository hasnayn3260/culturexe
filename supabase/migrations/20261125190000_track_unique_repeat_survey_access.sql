-- CXW-16: distinguish the first valid survey access from repeat accesses.
-- One browser page load supplies one access_id, making React retries idempotent
-- while a later page load remains a genuine repeat access.

alter table public.survey_respondents
  add column if not exists first_accessed_at timestamptz,
  add column if not exists last_accessed_at timestamptz,
  add column if not exists access_count integer not null default 0;

alter table public.survey_respondents
  drop constraint if exists survey_respondents_access_summary_valid;

alter table public.survey_respondents
  add constraint survey_respondents_access_summary_valid
  check (
    (access_count = 0 and first_accessed_at is null and last_accessed_at is null)
    or (
      access_count > 0
      and first_accessed_at is not null
      and last_accessed_at is not null
      and last_accessed_at >= first_accessed_at
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.survey_respondents'::regclass
      and conname = 'survey_respondents_id_survey_key'
  ) then
    alter table public.survey_respondents
      add constraint survey_respondents_id_survey_key
      unique (id, survey_id);
  end if;
end;
$$;

create table if not exists public.survey_access_events (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null
    references public.survey(id) on delete cascade,
  respondent_id uuid not null
    references public.survey_respondents(id) on delete cascade,
  access_id uuid not null,
  accessed_at timestamptz not null default now(),
  access_type text not null,
  constraint survey_access_events_access_type_check
    check (access_type in ('first', 'repeat')),
  constraint survey_access_events_respondent_access_key
    unique (respondent_id, access_id),
  constraint survey_access_events_respondent_survey_fkey
    foreign key (respondent_id, survey_id)
    references public.survey_respondents(id, survey_id)
    on delete cascade
);

create unique index if not exists survey_access_events_first_per_respondent_idx
  on public.survey_access_events (respondent_id)
  where access_type = 'first';

create index if not exists survey_access_events_survey_accessed_idx
  on public.survey_access_events (survey_id, accessed_at desc);

create index if not exists survey_access_events_respondent_accessed_idx
  on public.survey_access_events (respondent_id, accessed_at desc);

alter table public.survey_access_events enable row level security;

drop policy if exists survey_access_events_staff_read
  on public.survey_access_events;

create policy survey_access_events_staff_read
on public.survey_access_events
for select
to authenticated
using (public.is_admin());

revoke all on table public.survey_access_events from anon;
revoke insert, update, delete on table public.survey_access_events from authenticated;
grant select on table public.survey_access_events to authenticated;
grant all on table public.survey_access_events to service_role;

-- Existing respondents with a recorded start or submission have at least one
-- historical access. We cannot reconstruct repeat visits that predate CXW-16.
insert into public.survey_access_events (
  survey_id,
  respondent_id,
  access_id,
  accessed_at,
  access_type
)
select
  sr.survey_id,
  sr.id,
  gen_random_uuid(),
  coalesce(sr.started_at, sr.submitted_at),
  'first'
from public.survey_respondents as sr
where coalesce(sr.started_at, sr.submitted_at) is not null
  and not exists (
    select 1
    from public.survey_access_events as event
    where event.respondent_id = sr.id
  );

-- Derive the respondent summary from the append-only event ledger so rerunning
-- this migration repairs counters instead of incrementing them again.
update public.survey_respondents as sr
set
  access_count = summary.event_count,
  first_accessed_at = summary.first_accessed_at,
  last_accessed_at = summary.last_accessed_at
from (
  select
    event.respondent_id,
    count(*)::integer as event_count,
    min(event.accessed_at) as first_accessed_at,
    max(event.accessed_at) as last_accessed_at
  from public.survey_access_events as event
  group by event.respondent_id
) as summary
where sr.id = summary.respondent_id;

create or replace function public.record_survey_access(
  p_token uuid,
  p_access_id uuid
)
returns table (
  respondent_id uuid,
  first_accessed_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer,
  access_type text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_respondent public.survey_respondents%rowtype;
  v_accessed_at timestamptz := clock_timestamp();
  v_access_type text;
  v_inserted boolean := false;
begin
  if p_token is null then
    raise exception 'A survey access token is required.' using errcode = 'CX001';
  end if;

  if p_access_id is null then
    raise exception 'A survey access identifier is required.' using errcode = 'CX007';
  end if;

  select sr.*
    into v_respondent
  from public.survey_respondents as sr
  where sr.token = p_token
  for update;

  if not found then
    raise exception 'This survey link is invalid.' using errcode = 'CX004';
  end if;

  v_access_type := case
    when v_respondent.access_count = 0 then 'first'
    else 'repeat'
  end;

  insert into public.survey_access_events (
    survey_id,
    respondent_id,
    access_id,
    accessed_at,
    access_type
  )
  values (
    v_respondent.survey_id,
    v_respondent.id,
    p_access_id,
    v_accessed_at,
    v_access_type
  )
  on conflict (respondent_id, access_id) do nothing
  returning true into v_inserted;

  if v_inserted then
    update public.survey_respondents as sr
    set
      access_count = sr.access_count + 1,
      first_accessed_at = coalesce(sr.first_accessed_at, v_accessed_at),
      last_accessed_at = v_accessed_at
    where sr.id = v_respondent.id
    returning
      sr.id,
      sr.first_accessed_at,
      sr.last_accessed_at,
      sr.access_count
    into
      respondent_id,
      first_accessed_at,
      last_accessed_at,
      access_count;
  else
    select event.access_type
      into v_access_type
    from public.survey_access_events as event
    where event.respondent_id = v_respondent.id
      and event.access_id = p_access_id;

    select
      sr.id,
      sr.first_accessed_at,
      sr.last_accessed_at,
      sr.access_count
    into
      respondent_id,
      first_accessed_at,
      last_accessed_at,
      access_count
    from public.survey_respondents as sr
    where sr.id = v_respondent.id;
  end if;

  access_type := v_access_type;
  return next;
end;
$$;

revoke all on function public.record_survey_access(uuid, uuid) from public;
grant execute on function public.record_survey_access(uuid, uuid)
  to anon, authenticated, service_role;

comment on table public.survey_access_events is
  'Append-only ledger of idempotent survey page accesses used to distinguish first and repeat visits.';

comment on column public.survey_respondents.access_count is
  'Total valid survey page loads recorded for this respondent after page-load deduplication.';

comment on function public.record_survey_access(uuid, uuid) is
  'Records one idempotent survey page access. The first event is unique; later page loads are repeat accesses.';
