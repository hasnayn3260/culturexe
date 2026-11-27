create or replace function public.list_my_culture_score_history()
returns table (
  survey_id uuid,
  survey_title text,
  assessment_date timestamptz,
  score integer,
  response_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with eligible_surveys as (
    select survey_record.*
    from public.survey as survey_record
    where survey_record.assessment_type = 'culture'
      and survey_record.is_full_culture_assessment
      and (
        survey_record.status = 'closed'
        or survey_record.live_end <= now()
      )
      and exists (
        select 1
        from public.survey_respondents as assignment
        where assignment.survey_id = survey_record.id
          and (
            assignment.user_id = auth.uid()
            or lower(assignment.email) = lower(auth.email())
          )
      )
  ), scored_surveys as (
    select
      eligible.id as survey_id,
      eligible.title as survey_title,
      coalesce(eligible.live_end, eligible.live_start, eligible.created_at) as assessment_date,
      round(((avg(answer.value::numeric) - 1) / 4) * 100)::integer as score,
      count(distinct response.respondent_id)::bigint as response_count
    from eligible_surveys as eligible
    join public.survey_questions as question
      on question.survey_id = eligible.id
     and lower(question.question_type) = 'likert'
    join public.survey_responses as response
      on response.survey_id = eligible.id
    cross join lateral jsonb_each_text(response.answers) as answer(key, value)
    where answer.key = question.id::text
      and answer.value ~ '^[1-5](\.0+)?$'
    group by eligible.id, eligible.title, eligible.live_end,
      eligible.live_start, eligible.created_at
  )
  select
    scored.survey_id,
    scored.survey_title,
    scored.assessment_date,
    scored.score,
    scored.response_count
  from scored_surveys as scored
  order by scored.assessment_date desc nulls last
  limit 2;
$$;

revoke all on function public.list_my_culture_score_history() from public;
revoke all on function public.list_my_culture_score_history() from anon;
grant execute on function public.list_my_culture_score_history() to authenticated;

comment on function public.list_my_culture_score_history() is
  'Returns at most two aggregate full-model culture scores for assessments assigned to the signed-in client. Pulse, 360, other and raw respondent data are excluded.';
