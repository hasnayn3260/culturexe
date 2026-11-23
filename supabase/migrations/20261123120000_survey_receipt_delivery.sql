alter table public.survey_responses
  add column if not exists receipt_email_attempted_at timestamptz,
  add column if not exists receipt_email_sent_at timestamptz,
  add column if not exists receipt_email_message_id text;

comment on column public.survey_responses.receipt_email_attempted_at is
  'Operational claim used to prevent duplicate survey receipt sends.';

comment on column public.survey_responses.receipt_email_sent_at is
  'Time Postmark accepted the survey completion receipt.';

comment on column public.survey_responses.receipt_email_message_id is
  'Postmark message ID for the survey completion receipt.';
