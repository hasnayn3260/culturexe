# CultureXe API

This directory is reserved for server-only Vercel functions.

Each API capability should be grouped by business domain instead of being added
to one large router or controller:

```text
api/
  auth/
  organisations/
  surveys/
  reports/
  notifications/
  _shared/
```

Files inside `api/` are already HTTP routes on Vercel. For example,
`api/surveys/send.ts` becomes `/api/surveys/send`, so an additional `routes/`
directory is unnecessary.

Use `api/_shared/` for server-only utilities such as authentication checks,
Supabase admin clients, validation, and response helpers. Never import these
modules into the browser application under `src/`.

Supabase Edge Functions remain under `supabase/functions/`. Before adding a new
backend operation, choose one runtime for that complete operation; do not split
the same workflow between a Vercel function and a Supabase Edge Function.
