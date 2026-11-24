-- Survey scheduling and delivery preferences.
-- Automated sending is deliberately disabled by default so applying this
-- migration cannot unexpectedly email existing respondents.

ALTER TABLE public.survey
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_first_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_frequency_days smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reminder_send_time time without time zone NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS reminder_timezone text NOT NULL DEFAULT 'Africa/Johannesburg',
  ADD COLUMN IF NOT EXISTS reminder_max_sends smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS email_invitations_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_receipts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_invitations_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_receipts_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.survey_respondents
  ADD COLUMN IF NOT EXISTS reminder_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.survey'::regclass
      AND conname = 'survey_schedule_dates_check'
  ) THEN
    ALTER TABLE public.survey
      ADD CONSTRAINT survey_schedule_dates_check
      CHECK (
        live_start IS NULL
        OR live_end IS NULL
        OR live_end > live_start
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.survey'::regclass
      AND conname = 'survey_reminder_frequency_days_check'
  ) THEN
    ALTER TABLE public.survey
      ADD CONSTRAINT survey_reminder_frequency_days_check
      CHECK (reminder_frequency_days BETWEEN 1 AND 30) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.survey'::regclass
      AND conname = 'survey_reminder_max_sends_check'
  ) THEN
    ALTER TABLE public.survey
      ADD CONSTRAINT survey_reminder_max_sends_check
      CHECK (reminder_max_sends BETWEEN 1 AND 20) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.survey'::regclass
      AND conname = 'survey_reminder_timezone_check'
  ) THEN
    ALTER TABLE public.survey
      ADD CONSTRAINT survey_reminder_timezone_check
      CHECK (length(btrim(reminder_timezone)) BETWEEN 1 AND 100) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.survey_respondents'::regclass
      AND conname = 'survey_respondents_reminder_count_check'
  ) THEN
    ALTER TABLE public.survey_respondents
      ADD CONSTRAINT survey_respondents_reminder_count_check
      CHECK (reminder_count >= 0) NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.survey
  VALIDATE CONSTRAINT survey_schedule_dates_check;

ALTER TABLE public.survey
  VALIDATE CONSTRAINT survey_reminder_frequency_days_check;

ALTER TABLE public.survey
  VALIDATE CONSTRAINT survey_reminder_max_sends_check;

ALTER TABLE public.survey
  VALIDATE CONSTRAINT survey_reminder_timezone_check;

ALTER TABLE public.survey_respondents
  VALIDATE CONSTRAINT survey_respondents_reminder_count_check;

CREATE INDEX IF NOT EXISTS idx_survey_automatic_reminders
  ON public.survey (reminder_first_send_at, live_end)
  WHERE reminders_enabled = true AND status = 'live';

COMMENT ON COLUMN public.survey.reminders_enabled IS
  'Enables scheduled reminders. A scheduler must still invoke the reminder delivery endpoint.';
COMMENT ON COLUMN public.survey.reminder_first_send_at IS
  'Earliest timestamp at which the automatic reminder schedule may begin.';
COMMENT ON COLUMN public.survey.reminder_frequency_days IS
  'Number of days between automatic reminder runs.';
COMMENT ON COLUMN public.survey.reminder_send_time IS
  'Preferred local delivery time for automatic reminders.';
COMMENT ON COLUMN public.survey.reminder_timezone IS
  'IANA timezone used to interpret reminder_send_time.';
COMMENT ON COLUMN public.survey.reminder_max_sends IS
  'Maximum number of reminders that may be sent to one respondent for this survey.';
COMMENT ON COLUMN public.survey_respondents.reminder_count IS
  'Number of successfully delivered reminders for this respondent and survey.';
COMMENT ON COLUMN public.survey_respondents.last_reminder_attempted_at IS
  'Timestamp of the latest reminder delivery attempt, whether successful or failed.';
COMMENT ON COLUMN public.survey_respondents.last_reminder_error IS
  'Latest reminder delivery error. Cleared after a successful delivery.';
