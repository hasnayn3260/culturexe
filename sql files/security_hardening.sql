-- ─────────────────────────────────────────────────────────────────────────────
-- CultureXe — SECURITY HARDENING MIGRATION
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to run multiple times.
--
-- Fixes (in priority order):
--   1. CRITICAL — Privilege escalation: new users could self-assign role=superadmin
--      via signup metadata, and any user could change their own role via UPDATE.
--   2. HIGH — Legacy anon survey tables (response_tokens / responses) let ANY
--      unauthenticated visitor read every token + invitee email and insert
--      arbitrary survey responses.
--   3. MEDIUM — SECURITY DEFINER helper functions had a mutable search_path.
--
-- After running, scroll to section 5 (AUDIT) and run those SELECTs to verify the
-- live state of every table's RLS — including the survey_* tables, whose policies
-- are not in source control and must be checked in the dashboard.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PRIVILEGE ESCALATION — the most important fix
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1a. Sign-up trigger must NEVER trust the role coming from user metadata ──
-- A self-registering user controls raw_user_meta_data (they can call the public
-- auth API directly with the publishable key and pass {"role":"superadmin"}).
-- So the trigger now clamps to non-privileged roles only. Privileged accounts
-- (consultant / superadmin) are created exclusively by the create-user Edge
-- Function, which runs as the service role and upserts the real role afterwards.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  safe_role      text;
BEGIN
  -- Only these roles may ever be self-assigned at sign-up.
  safe_role := CASE
    WHEN requested_role IN ('client', 'employee') THEN requested_role
    ELSE 'client'
  END;

  INSERT INTO public.profiles (id, email, full_name, role, job_title, username, position, active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    safe_role,
    COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'position'), ''),
    true,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── 1b. Users must NOT be able to change their own role / org_id / active ─────
-- profiles_update_own already restricts which ROW a user can update (their own),
-- but RLS WITH CHECK cannot compare against the OLD row, so a user could still
-- flip their own `role` to 'superadmin'. This BEFORE UPDATE trigger freezes the
-- privilege columns for normal users. The service role (Edge Function / SQL
-- editor) and existing consultants/superadmins can still change them.
CREATE OR REPLACE FUNCTION enforce_profile_privilege_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_role text;
BEGIN
  -- Service role / SQL editor (no end-user JWT) is fully trusted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  -- Superadmins and consultants may legitimately manage these fields.
  IF caller_role IN ('superadmin', 'consultant') THEN
    RETURN NEW;
  END IF;

  -- Everyone else: privilege columns are frozen to their previous values.
  NEW.role   := OLD.role;
  NEW.org_id := OLD.org_id;
  NEW.active := OLD.active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_privilege_lock ON profiles;
CREATE TRIGGER profiles_privilege_lock
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_profile_privilege_lock();


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. HELPER FUNCTIONS — pin search_path (prevents search_path hijacking)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. LEGACY ANON SURVEY TABLES (response_tokens / responses)
-- ═══════════════════════════════════════════════════════════════════════════
-- These tables had wide-open anon access:
--   • response_tokens: anon SELECT USING(true) → anyone could dump every token
--     and the invitee email tied to it (PII + lets them answer as someone else).
--   • responses: anon INSERT WITH CHECK(true) → anyone could poison results.
--   • response_tokens: anon UPDATE → anyone could mark every token "used" (DoS).
--
-- The current app uses survey_respondents / survey_responses instead, so these
-- legacy tables can almost certainly be locked down with no functional impact.
-- If you have confirmed nothing reads /assess via response_tokens any more, run
-- the lockdown below. (If unsure, run the AUDIT in section 5 first.)

DO $$ BEGIN
  IF to_regclass('public.response_tokens') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE response_tokens ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "anon_read_response_tokens" ON response_tokens';
    EXECUTE 'DROP POLICY IF EXISTS "anon_mark_token_used"      ON response_tokens';
  END IF;
  IF to_regclass('public.responses') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE responses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "anon_insert_responses" ON responses';
  END IF;
END $$;
-- NOTE: the authenticated/consultant policies on these tables are left intact.
-- If you DO still serve surveys through response_tokens, do NOT run the block
-- above; instead replace the blanket anon policies with a SECURITY DEFINER RPC
-- that validates a single token (see comment at the bottom of this file).


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. (REVIEW) survey_respondents / survey_responses
-- ═══════════════════════════════════════════════════════════════════════════
-- The live anon survey (/assess/:token) reads survey_respondents by `token`.
-- If those tables use a blanket "anon SELECT USING(true)" policy, an attacker
-- can enumerate ALL respondents (emails, draft answers, tokens) — breaking
-- anonymity. RLS cannot read the `?token=` filter, so the correct pattern is a
-- SECURITY DEFINER RPC that takes the token and returns only that respondent.
-- Run the AUDIT below to see what is currently deployed, then tell me the
-- output and I'll generate the token-scoped policies/RPC for these tables.


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. AUDIT — run these SELECTs to inspect the LIVE security state
-- ═══════════════════════════════════════════════════════════════════════════

-- 5a. Which tables have RLS enabled? (rowsecurity should be true for all)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- 5b. Every policy, who it applies to, and its predicates.
--     Look for roles = {anon} combined with qual = 'true' — those are open doors.
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5c. Any users who managed to get a privileged role (sanity check post-fix).
SELECT id, email, role, created_at
FROM profiles
WHERE role IN ('superadmin', 'consultant')
ORDER BY created_at;


-- ─────────────────────────────────────────────────────────────────────────────
-- REFERENCE: token-scoped RPC pattern (use if surveys still rely on a token in
-- a table that anon must read). Lets anon fetch exactly one row by its secret
-- token, without exposing the whole table.
--
-- CREATE OR REPLACE FUNCTION get_respondent_by_token(p_token text)
-- RETURNS SETOF survey_respondents
-- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
--   SELECT * FROM survey_respondents WHERE token = p_token LIMIT 1;
-- $$;
-- REVOKE ALL ON FUNCTION get_respondent_by_token(text) FROM public;
-- GRANT EXECUTE ON FUNCTION get_respondent_by_token(text) TO anon, authenticated;
-- -- then drop the blanket "anon SELECT USING(true)" on survey_respondents.
-- ─────────────────────────────────────────────────────────────────────────────
