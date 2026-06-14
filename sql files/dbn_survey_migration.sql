-- ============================================================
-- DBN Survey Migration
-- Run each block on Supabase. After running, blocks are
-- commented out to track what has been applied.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- BLOCK 1: Drop old tables  [APPLIED]
-- ──────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.leadership_360_responses CASCADE;
-- DROP TABLE IF EXISTS public.leadership_360_raters CASCADE;
-- DROP TABLE IF EXISTS public.leadership_360_subjects CASCADE;
-- DROP TABLE IF EXISTS public.yswh_items CASCADE;
-- DROP TABLE IF EXISTS public.pulse_entries CASCADE;
-- DROP TABLE IF EXISTS public.reports CASCADE;
-- DROP TABLE IF EXISTS public.responses CASCADE;
-- DROP TABLE IF EXISTS public.invitations CASCADE;
-- DROP TABLE IF EXISTS public.response_tokens CASCADE;
-- DROP TABLE IF EXISTS public.assessment_stats CASCADE;
-- DROP TABLE IF EXISTS public.org_overview CASCADE;
-- DROP TABLE IF EXISTS public.assessments CASCADE;
-- DROP TABLE IF EXISTS public.questions CASCADE;


-- ──────────────────────────────────────────────────────────
-- BLOCK 2: Create new tables  [APPLIED]
-- ──────────────────────────────────────────────────────────

-- -- Single survey (DBN's survey)
-- CREATE TABLE public.survey (
--   id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
--   title       TEXT        NOT NULL DEFAULT 'DBN Culture Survey',
--   description TEXT,
--   status      TEXT        NOT NULL DEFAULT 'draft',  -- draft | live | closed
--   live_start  TIMESTAMPTZ,
--   live_end    TIMESTAMPTZ,
--   created_at  TIMESTAMPTZ DEFAULT NOW(),
--   updated_at  TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Survey questions (built by the consultant)
-- CREATE TABLE public.survey_questions (
--   id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
--   survey_id     UUID        NOT NULL REFERENCES public.survey(id) ON DELETE CASCADE,
--   text          TEXT        NOT NULL,
--   hint          TEXT,
--   question_type TEXT        NOT NULL DEFAULT 'likert',
--   dimension     TEXT,
--   order_num     INTEGER     NOT NULL DEFAULT 0,
--   created_at    TIMESTAMPTZ DEFAULT NOW(),
--   updated_at    TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Survey respondents (replaces response_tokens + invitations)
-- CREATE TABLE public.survey_respondents (
--   id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
--   survey_id       UUID        NOT NULL REFERENCES public.survey(id) ON DELETE CASCADE,
--   email           TEXT        NOT NULL,
--   name            TEXT,
--   department      TEXT,
--   job_title       TEXT,
--   token           UUID        NOT NULL DEFAULT gen_random_uuid(),
--   used            BOOLEAN     NOT NULL DEFAULT FALSE,
--   invited_at      TIMESTAMPTZ DEFAULT NOW(),
--   reminded_at     TIMESTAMPTZ,
--   submitted_at    TIMESTAMPTZ,
--   response_timing TEXT,        -- early | on_time | late
--   UNIQUE(survey_id, email)
-- );

-- -- Survey responses (answers submitted by respondents)
-- CREATE TABLE public.survey_responses (
--   id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
--   survey_id     UUID        NOT NULL REFERENCES public.survey(id) ON DELETE CASCADE,
--   respondent_id UUID        NOT NULL REFERENCES public.survey_respondents(id) ON DELETE CASCADE,
--   answers       JSONB       NOT NULL DEFAULT '{}',
--   submitted_at  TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(respondent_id)
-- );


-- ──────────────────────────────────────────────────────────
-- BLOCK 3: Enable RLS and create policies  [APPLIED]
-- ──────────────────────────────────────────────────────────
-- ALTER TABLE public.survey ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.survey_respondents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- -- Authenticated users (consultants) get full access
-- CREATE POLICY "auth_all_survey" ON public.survey
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CREATE POLICY "auth_all_questions" ON public.survey_questions
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CREATE POLICY "auth_all_respondents" ON public.survey_respondents
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CREATE POLICY "auth_all_responses" ON public.survey_responses
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -- Anon users (employees taking the survey) get limited access
-- CREATE POLICY "anon_read_survey" ON public.survey
--   FOR SELECT TO anon USING (true);

-- CREATE POLICY "anon_read_questions" ON public.survey_questions
--   FOR SELECT TO anon USING (true);

-- CREATE POLICY "anon_read_respondents" ON public.survey_respondents
--   FOR SELECT TO anon USING (true);

-- CREATE POLICY "anon_update_respondents" ON public.survey_respondents
--   FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- CREATE POLICY "anon_insert_responses" ON public.survey_responses
--   FOR INSERT TO anon WITH CHECK (true);


-- ──────────────────────────────────────────────────────────
-- BLOCK 4: Seed the initial DBN survey  [APPLIED]
-- ──────────────────────────────────────────────────────────
-- INSERT INTO public.survey (title, description, status)
-- VALUES (
--   'DBN Culture Survey',
--   'Development Bank of Namibia organisational culture assessment.',
--   'draft'
-- );


-- ──────────────────────────────────────────────────────────
-- BLOCK 5: Add options column for rich question types  [APPLIED]
-- ──────────────────────────────────────────────────────────
-- ALTER TABLE public.survey_questions
--   ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

-- -- question_type values now supported:
-- --   LIKERT | SHORT_TEXT | LONG_TEXT | SINGLE_CHOICE | MULTI_CHOICE |
-- --   DROPDOWN | RATING_SCALE | MATRIX | DATE | TIME | FILE


-- ──────────────────────────────────────────────────────────
-- BLOCK 6: Supabase Storage bucket for FILE upload questions  [APPLIED]
-- ──────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('survey-files', 'survey-files', true)
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "anon_upload_survey_files" ON storage.objects
--   FOR INSERT TO anon
--   WITH CHECK (bucket_id = 'survey-files');

-- CREATE POLICY "public_read_survey_files" ON storage.objects
--   FOR SELECT TO anon
--   USING (bucket_id = 'survey-files');

-- CREATE POLICY "auth_manage_survey_files" ON storage.objects
--   FOR ALL TO authenticated
--   USING (bucket_id = 'survey-files') WITH CHECK (bucket_id = 'survey-files');


-- ──────────────────────────────────────────────────────────
-- BLOCK 7: Client auth columns on survey_respondents
-- Adds user_id to link respondents to Supabase auth accounts,
-- and draft_answers / draft_saved_at to support multi-sitting
-- responses that auto-save before final submission.
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.survey_respondents
  ADD COLUMN IF NOT EXISTS user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS draft_answers   JSONB       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS draft_saved_at  TIMESTAMPTZ DEFAULT NULL;
