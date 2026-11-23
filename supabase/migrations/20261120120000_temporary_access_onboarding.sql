alter table public.organisations
  add column if not exists logo_path text,
  add column if not exists banner_path text;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temporary_password_issued_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_email_message_id text,
  add column if not exists onboarding_email_sent_at timestamptz;

comment on column public.organisations.logo_path is
  'Object path inside the Company Logos storage bucket.';

comment on column public.organisations.banner_path is
  'Object path inside the Company Banners storage bucket.';

comment on column public.profiles.must_change_password is
  'Forces accounts created with temporary credentials through first-login password setup.';
