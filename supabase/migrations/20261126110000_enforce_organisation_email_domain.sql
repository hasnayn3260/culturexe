alter table public.organisations
  add column if not exists email_domain text;

update public.organisations
set email_domain = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(email_domain), '^https?://', '', 'i'),
        '^www\.',
        '',
        'i'
      ),
      '^@',
      ''
    ),
    '/.*$',
    ''
  )
)
where email_domain is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organisations'::regclass
      and conname = 'organisations_email_domain_format_check'
  ) then
    alter table public.organisations
      add constraint organisations_email_domain_format_check
      check (
        email_domain is null
        or (
          email_domain = lower(email_domain)
          and email_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
        )
      ) not valid;
  end if;
end
$$;

alter table public.organisations
  validate constraint organisations_email_domain_format_check;

comment on column public.organisations.email_domain is
  'Canonical lowercase domain required for organisation user CSV imports, without @ or protocol.';
