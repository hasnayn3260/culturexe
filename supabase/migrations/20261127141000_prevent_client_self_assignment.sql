-- Only staff-controlled Add company users and Invite by email workflows may
-- create survey assignments. Authenticated clients must not self-enrol.
drop policy if exists sr_own_insert on public.survey_respondents;
