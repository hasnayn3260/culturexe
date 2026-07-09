-- ============================================================
-- DBN Survey Migration
-- Only pending/current SQL lives here. Once a block has been
-- run in Supabase, it is deleted from this file rather than
-- kept as a comment — git history is the record of what ran.
-- ============================================================

-- Open-link intake fields — name optional, department/job title/
-- tenure/job grade captured up front using the exact same choice
-- lists as the live "About You" survey questions.
ALTER TABLE public.survey_respondents
  ADD COLUMN IF NOT EXISTS tenure    TEXT,
  ADD COLUMN IF NOT EXISTS job_grade TEXT;

DROP FUNCTION IF EXISTS register_open_respondent(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS register_open_respondent(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION register_open_respondent(
  p_open_token UUID,
  p_department TEXT,
  p_job_title  TEXT,
  p_tenure     TEXT,
  p_job_grade  TEXT,
  p_name       TEXT DEFAULT NULL
)
RETURNS TABLE(respondent_token UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_survey_id UUID;
  v_new_token UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_survey_id
  FROM public.survey
  WHERE open_link_token = p_open_token
    AND open_link_enabled = TRUE
    AND status = 'live';

  IF v_survey_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive open link';
  END IF;

  IF p_department IS NULL OR length(trim(p_department)) = 0 THEN
    RAISE EXCEPTION 'Department is required';
  END IF;
  IF p_job_title IS NULL OR length(trim(p_job_title)) = 0 THEN
    RAISE EXCEPTION 'Job title is required';
  END IF;
  IF p_tenure IS NULL OR length(trim(p_tenure)) = 0 THEN
    RAISE EXCEPTION 'Tenure is required';
  END IF;
  IF p_job_grade IS NULL OR length(trim(p_job_grade)) = 0 THEN
    RAISE EXCEPTION 'Job grade is required';
  END IF;

  INSERT INTO public.survey_respondents (survey_id, email, name, department, job_title, tenure, job_grade, token, source)
  VALUES (
    v_survey_id,
    'walkin-' || v_new_token || '@no-email.culturexe.internal',
    NULLIF(trim(p_name), ''),
    trim(p_department),
    trim(p_job_title),
    trim(p_tenure),
    trim(p_job_grade),
    v_new_token,
    'open_link'
  );

  RETURN QUERY SELECT v_new_token;
END;
$$;

REVOKE ALL ON FUNCTION register_open_respondent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION register_open_respondent(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
