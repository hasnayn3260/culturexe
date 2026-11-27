


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."enforce_profile_privilege_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."enforce_profile_privilege_lock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_respondent_on_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update public.survey_respondents
  set
    used = true,

    -- Preserve the first final submission timestamp.
    submitted_at = coalesce(
      submitted_at,
      new.submitted_at,
      now()
    ),

    -- Preserve the original start. If no start exists because of a race,
    -- use submission time and record a zero-second duration.
    started_at = coalesce(
      started_at,
      new.submitted_at,
      now()
    ),

    completion_duration_seconds = case
      when coalesce(
        submitted_at,
        new.submitted_at,
        now()
      ) >= coalesce(
        started_at,
        new.submitted_at,
        now()
      )
      then floor(
        extract(
          epoch from (
            coalesce(
              submitted_at,
              new.submitted_at,
              now()
            )
            -
            coalesce(
              started_at,
              new.submitted_at,
              now()
            )
          )
        )
      )::integer
      else 0
    end,

    draft_answers = null,
    draft_saved_at = null
  where id = new.respondent_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."finalize_respondent_on_response"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."finalize_respondent_on_response"() IS 'Marks a respondent submitted and removes redundant draft data whenever the final response is committed.';



CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT email
  FROM   public.profiles
  WHERE  lower(username) = lower(p_username)
  LIMIT  1;
$$;


ALTER FUNCTION "public"."get_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_org"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  requested_role    text := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  safe_role         text;
BEGIN
  -- Never trust the role from user metadata (self-registrants control it).
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('consultant', 'admin', 'superadmin')
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_superadmin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;


ALTER FUNCTION "public"."is_superadmin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_my_profile_managers"() RETURNS TABLE("id" "uuid", "label" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    manager.id,
    coalesce(nullif(trim(manager.full_name), ''), manager.email, 'Manager')
      || ' — ' || manager.position as label
  from public.profiles as current_profile
  join public.profiles as manager
    on manager.org_id = current_profile.org_id
  where current_profile.id = auth.uid()
    and manager.id <> current_profile.id
    and manager.active is not false
    and manager.position in ('Manager', 'Senior Manager')
  order by label;
$$;


ALTER FUNCTION "public"."list_my_profile_managers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_survey_access"("p_token" "uuid", "p_access_id" "uuid") RETURNS TABLE("respondent_id" "uuid", "first_accessed_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "access_count" integer, "access_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_respondent public.survey_respondents%rowtype;
  v_accessed_at timestamptz := clock_timestamp();
  v_access_type text;
  v_inserted boolean := false;
begin
  if p_token is null then
    raise exception 'A survey access token is required.' using errcode = 'CX001';
  end if;

  if p_access_id is null then
    raise exception 'A survey access identifier is required.' using errcode = 'CX007';
  end if;

  select sr.*
    into v_respondent
  from public.survey_respondents as sr
  where sr.token = p_token
  for update;

  if not found then
    raise exception 'This survey link is invalid.' using errcode = 'CX004';
  end if;

  v_access_type := case
    when v_respondent.access_count = 0 then 'first'
    else 'repeat'
  end;

  insert into public.survey_access_events (
    survey_id,
    respondent_id,
    access_id,
    accessed_at,
    access_type
  )
  values (
    v_respondent.survey_id,
    v_respondent.id,
    p_access_id,
    v_accessed_at,
    v_access_type
  )
  on conflict (respondent_id, access_id) do nothing
  returning true into v_inserted;

  if v_inserted then
    update public.survey_respondents as sr
    set
      access_count = sr.access_count + 1,
      first_accessed_at = coalesce(sr.first_accessed_at, v_accessed_at),
      last_accessed_at = v_accessed_at
    where sr.id = v_respondent.id
    returning
      sr.id,
      sr.first_accessed_at,
      sr.last_accessed_at,
      sr.access_count
    into
      respondent_id,
      first_accessed_at,
      last_accessed_at,
      access_count;
  else
    select event.access_type
      into v_access_type
    from public.survey_access_events as event
    where event.respondent_id = v_respondent.id
      and event.access_id = p_access_id;

    select
      sr.id,
      sr.first_accessed_at,
      sr.last_accessed_at,
      sr.access_count
    into
      respondent_id,
      first_accessed_at,
      last_accessed_at,
      access_count
    from public.survey_respondents as sr
    where sr.id = v_respondent.id;
  end if;

  access_type := v_access_type;
  return next;
end;
$$;


ALTER FUNCTION "public"."record_survey_access"("p_token" "uuid", "p_access_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_survey_access"("p_token" "uuid", "p_access_id" "uuid") IS 'Records one idempotent survey page access. The first event is unique; later page loads are repeat accesses.';



CREATE OR REPLACE FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text" DEFAULT NULL::"text") RETURNS TABLE("respondent_token" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_survey_draft"("p_token" "uuid", "p_answers" "jsonb") RETURNS TABLE("respondent_id" "uuid", "started_at" timestamp with time zone, "draft_saved_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_respondent public.survey_respondents%rowtype;
  v_saved_at timestamptz := now();
begin
  if p_token is null then
    raise exception 'A survey access token is required.' using errcode = 'CX001';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Draft answers must be a JSON object.' using errcode = 'CX002';
  end if;

  if octet_length(p_answers::text) > 1048576 then
    raise exception 'Draft answers exceed the 1 MB limit.' using errcode = 'CX003';
  end if;

  select sr.*
    into v_respondent
  from public.survey_respondents as sr
  where sr.token = p_token
  for update;

  if not found then
    raise exception 'This survey link is invalid.' using errcode = 'CX004';
  end if;

  if v_respondent.used or v_respondent.submitted_at is not null then
    raise exception 'This survey has already been submitted.' using errcode = 'CX005';
  end if;

  if not public.survey_accepting_responses(
    v_respondent.survey_id,
    v_respondent.id
  ) then
    raise exception 'This survey is closed and is no longer accepting responses.'
      using errcode = 'CX006';
  end if;

  update public.survey_respondents as sr
  set
    started_at = coalesce(sr.started_at, v_saved_at),
    draft_answers = p_answers,
    draft_saved_at = v_saved_at
  where sr.id = v_respondent.id
  returning sr.id, sr.started_at, sr.draft_saved_at
    into respondent_id, started_at, draft_saved_at;

  return next;
end;
$$;


ALTER FUNCTION "public"."save_survey_draft"("p_token" "uuid", "p_answers" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_survey_draft"("p_token" "uuid", "p_answers" "jsonb") IS 'Saves token-scoped partial survey answers while the survey response window is open. Drafts do not count as submitted responses.';



CREATE OR REPLACE FUNCTION "public"."set_organisations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_organisations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_survey_response"("p_token" "uuid") RETURNS TABLE("respondent_id" "uuid", "started_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_respondent public.survey_respondents%rowtype;
begin
  if p_token is null then
    raise exception 'A survey access token is required.'
      using errcode = 'CX001';
  end if;

  select sr.*
  into v_respondent
  from public.survey_respondents as sr
  where sr.token = p_token
  for update;

  if not found then
    raise exception 'This survey link is invalid.'
      using errcode = 'CX004';
  end if;

  if v_respondent.used
    or v_respondent.submitted_at is not null
  then
    raise exception 'This survey has already been submitted.'
      using errcode = 'CX005';
  end if;

  if not public.survey_accepting_responses(
    v_respondent.survey_id,
    v_respondent.id
  ) then
    raise exception
      'This survey is closed and is no longer accepting responses.'
      using errcode = 'CX006';
  end if;

  update public.survey_respondents as sr
  set started_at = coalesce(sr.started_at, now())
  where sr.id = v_respondent.id
  returning
    sr.id,
    sr.started_at
  into
    respondent_id,
    started_at;

  return next;
end;
$$;


ALTER FUNCTION "public"."start_survey_response"("p_token" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."start_survey_response"("p_token" "uuid") IS 'Records the first time a respondent opens an active survey without resetting resumed sessions.';



CREATE OR REPLACE FUNCTION "public"."survey_accepting_responses"("p_survey_id" "uuid", "p_respondent_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.survey as s
    join public.survey_respondents as sr
      on sr.survey_id = s.id
    where s.id = p_survey_id
      and sr.id = p_respondent_id
      and s.status = 'live'
      and s.live_start is not null
      and s.live_end is not null
      and s.live_end > s.live_start
      and now() >= s.live_start
      and now() < s.live_end
  );
$$;


ALTER FUNCTION "public"."survey_accepting_responses"("p_survey_id" "uuid", "p_respondent_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."survey_accepting_responses"("p_survey_id" "uuid", "p_respondent_id" "uuid") IS 'Returns true only when the respondent belongs to the survey and its live response window is currently open.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."organisations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "industry" "text",
    "size" integer,
    "country" "text" DEFAULT 'South Africa'::"text",
    "contact_name" "text",
    "contact_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "employee_count" integer,
    "website" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "logo_path" "text",
    "banner_path" "text",
    "legal_name" "text",
    "registration_number" "text",
    "province" "text",
    "city" "text",
    "timezone" "text" DEFAULT 'Africa/Johannesburg'::"text" NOT NULL,
    "phone" "text",
    "email_domain" "text",
    "address_line_1" "text",
    "address_line_2" "text",
    "postal_code" "text",
    "trading_name" "text",
    "organisation_type" "text",
    "year_established" smallint,
    "country_of_registration" "text",
    "registered_address" "text",
    "general_email" "text",
    "main_phone" "text",
    "contact_first_name" "text",
    "contact_surname" "text",
    "contact_job_title" "text",
    "contact_phone" "text",
    "contact_department" "text",
    "preferred_locale" "text" DEFAULT 'en-ZA'::"text" NOT NULL,
    "external_reference" "text",
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organisations_email_domain_format_check" CHECK ((("email_domain" IS NULL) OR (("email_domain" = "lower"("email_domain")) AND ("email_domain" ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'::"text")))),
    CONSTRAINT "organisations_employee_count_check" CHECK ((("employee_count" IS NULL) OR ("employee_count" >= 0))),
    CONSTRAINT "organisations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'onboarding'::"text"]))),
    CONSTRAINT "organisations_type_check" CHECK ((("organisation_type" IS NULL) OR ("organisation_type" = ANY (ARRAY['Private Company'::"text", 'Public Company'::"text", 'State-Owned Enterprise (SOE)'::"text", 'Government Department'::"text", 'Municipality / Local Government'::"text", 'Non-Profit Organisation (NPO)'::"text", 'Non-Governmental Organisation (NGO)'::"text", 'Trust'::"text", 'Partnership'::"text", 'Other'::"text"])))),
    CONSTRAINT "organisations_year_established_check" CHECK ((("year_established" IS NULL) OR (("year_established" >= 1700) AND ("year_established" <= 2100))))
);


ALTER TABLE "public"."organisations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organisations"."name" IS 'Registered or legal organisation name.';



COMMENT ON COLUMN "public"."organisations"."industry" IS 'Displayed as Sector on the frontend.';



COMMENT ON COLUMN "public"."organisations"."contact_name" IS 'Deprecated. Use contact_first_name and contact_surname for new functionality.';



COMMENT ON COLUMN "public"."organisations"."employee_count" IS 'Exact total employee headcount.';



COMMENT ON COLUMN "public"."organisations"."logo_path" IS 'Object path inside the Company Logos storage bucket.';



COMMENT ON COLUMN "public"."organisations"."banner_path" IS 'Object path inside the Company Banners storage bucket.';



COMMENT ON COLUMN "public"."organisations"."email_domain" IS 'Canonical lowercase domain required for organisation user CSV imports, without @ or protocol.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text",
    "org_id" "uuid",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "department" "text",
    "job_title" "text",
    "manager_id" "uuid",
    "hire_date" "date",
    "phone" "text",
    "username" "text",
    "position" "text",
    "branch" "text",
    "location_site" "text",
    "must_change_password" boolean DEFAULT false NOT NULL,
    "temporary_password_issued_at" timestamp with time zone,
    "onboarding_completed_at" timestamp with time zone,
    "onboarding_email_message_id" "text",
    "onboarding_email_sent_at" timestamp with time zone,
    CONSTRAINT "profiles_position_check" CHECK (("position" = ANY (ARRAY['Executive'::"text", 'Senior Manager'::"text", 'Manager'::"text", 'Team Lead'::"text", 'Supervisor'::"text", 'Senior Employee'::"text", 'Employee'::"text", 'Intern'::"text", 'Contractor'::"text", 'Other'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."branch" IS 'Employee branch, managed by authorised administrators and consultants.';



COMMENT ON COLUMN "public"."profiles"."location_site" IS 'Employee work location or site, managed by authorised administrators and consultants.';



COMMENT ON COLUMN "public"."profiles"."must_change_password" IS 'Forces accounts created with temporary credentials through first-login password setup.';



CREATE TABLE IF NOT EXISTS "public"."survey" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" DEFAULT 'DBN Culture Survey'::"text" NOT NULL,
    "description" "text",
    "assessment_type" "text" DEFAULT 'culture'::"text" NOT NULL,
    "is_full_culture_assessment" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "live_start" timestamp with time zone,
    "live_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "open_link_enabled" boolean DEFAULT false NOT NULL,
    "open_link_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "reminders_enabled" boolean DEFAULT false NOT NULL,
    "reminder_first_send_at" timestamp with time zone,
    "reminder_frequency_days" smallint DEFAULT 3 NOT NULL,
    "reminder_send_time" time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    "reminder_timezone" "text" DEFAULT 'Africa/Johannesburg'::"text" NOT NULL,
    "reminder_max_sends" smallint DEFAULT 3 NOT NULL,
    "email_invitations_enabled" boolean DEFAULT true NOT NULL,
    "email_reminders_enabled" boolean DEFAULT true NOT NULL,
    "email_receipts_enabled" boolean DEFAULT true NOT NULL,
    "sms_invitations_enabled" boolean DEFAULT false NOT NULL,
    "sms_reminders_enabled" boolean DEFAULT false NOT NULL,
    "sms_receipts_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "survey_reminder_frequency_days_check" CHECK ((("reminder_frequency_days" >= 1) AND ("reminder_frequency_days" <= 30))),
    CONSTRAINT "survey_assessment_type_check" CHECK (("assessment_type" = ANY (ARRAY['culture'::"text", 'pulse'::"text", '360'::"text", 'other'::"text"]))),
    CONSTRAINT "survey_full_culture_assessment_check" CHECK (((NOT "is_full_culture_assessment") OR ("assessment_type" = 'culture'::"text"))),
    CONSTRAINT "survey_reminder_max_sends_check" CHECK ((("reminder_max_sends" >= 1) AND ("reminder_max_sends" <= 20))),
    CONSTRAINT "survey_reminder_timezone_check" CHECK ((("length"("btrim"("reminder_timezone")) >= 1) AND ("length"("btrim"("reminder_timezone")) <= 100))),
    CONSTRAINT "survey_schedule_dates_check" CHECK ((("live_start" IS NULL) OR ("live_end" IS NULL) OR ("live_end" > "live_start")))
);


ALTER TABLE "public"."survey" OWNER TO "postgres";


COMMENT ON COLUMN "public"."survey"."reminders_enabled" IS 'Enables scheduled reminders. A scheduler must still invoke the reminder delivery endpoint.';



COMMENT ON COLUMN "public"."survey"."reminder_first_send_at" IS 'Earliest timestamp at which the automatic reminder schedule may begin.';



COMMENT ON COLUMN "public"."survey"."reminder_frequency_days" IS 'Number of days between automatic reminder runs.';



COMMENT ON COLUMN "public"."survey"."reminder_send_time" IS 'Preferred local delivery time for automatic reminders.';



COMMENT ON COLUMN "public"."survey"."reminder_timezone" IS 'IANA timezone used to interpret reminder_send_time.';



COMMENT ON COLUMN "public"."survey"."reminder_max_sends" IS 'Maximum number of reminders that may be sent to one respondent for this survey.';



CREATE TABLE IF NOT EXISTS "public"."survey_access_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "respondent_id" "uuid" NOT NULL,
    "access_id" "uuid" NOT NULL,
    "accessed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "access_type" "text" NOT NULL,
    CONSTRAINT "survey_access_events_access_type_check" CHECK (("access_type" = ANY (ARRAY['first'::"text", 'repeat'::"text"])))
);


ALTER TABLE "public"."survey_access_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."survey_access_events" IS 'Append-only ledger of idempotent survey page accesses used to distinguish first and repeat visits.';



CREATE TABLE IF NOT EXISTS "public"."survey_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "hint" "text",
    "question_type" "text" DEFAULT 'likert'::"text" NOT NULL,
    "dimension" "text",
    "order_num" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "options" "jsonb"
);


ALTER TABLE "public"."survey_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_respondents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "department" "text",
    "job_title" "text",
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "reminded_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "response_timing" "text",
    "user_id" "uuid",
    "draft_answers" "jsonb",
    "draft_saved_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "source" "text" DEFAULT 'invited'::"text" NOT NULL,
    "tenure" "text",
    "job_grade" "text",
    "reminder_count" smallint DEFAULT 0 NOT NULL,
    "last_reminder_attempted_at" timestamp with time zone,
    "last_reminder_error" "text",
    "completion_duration_seconds" integer,
    "first_accessed_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone,
    "access_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "survey_respondents_access_summary_valid" CHECK (((("access_count" = 0) AND ("first_accessed_at" IS NULL) AND ("last_accessed_at" IS NULL)) OR (("access_count" > 0) AND ("first_accessed_at" IS NOT NULL) AND ("last_accessed_at" IS NOT NULL) AND ("last_accessed_at" >= "first_accessed_at")))),
    CONSTRAINT "survey_respondents_completion_duration_nonnegative" CHECK ((("completion_duration_seconds" IS NULL) OR (("completion_duration_seconds" >= 0) AND ("started_at" IS NOT NULL) AND ("submitted_at" IS NOT NULL) AND ("submitted_at" >= "started_at")))),
    CONSTRAINT "survey_respondents_reminder_count_check" CHECK (("reminder_count" >= 0))
);


ALTER TABLE "public"."survey_respondents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."survey_respondents"."reminder_count" IS 'Number of successfully delivered reminders for this respondent and survey.';



COMMENT ON COLUMN "public"."survey_respondents"."last_reminder_attempted_at" IS 'Timestamp of the latest reminder delivery attempt, whether successful or failed.';



COMMENT ON COLUMN "public"."survey_respondents"."last_reminder_error" IS 'Latest reminder delivery error. Cleared after a successful delivery.';



COMMENT ON COLUMN "public"."survey_respondents"."completion_duration_seconds" IS 'Elapsed whole seconds from the respondent first opening the survey to final submission.';



COMMENT ON COLUMN "public"."survey_respondents"."access_count" IS 'Total valid survey page loads recorded for this respondent after page-load deduplication.';



CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "respondent_id" "uuid" NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "receipt_email_attempted_at" timestamp with time zone,
    "receipt_email_sent_at" timestamp with time zone,
    "receipt_email_message_id" "text"
);


ALTER TABLE "public"."survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_template_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "hint" "text",
    "question_type" "text" DEFAULT 'LIKERT'::"text" NOT NULL,
    "dimension" "text",
    "order_num" integer DEFAULT 0 NOT NULL,
    "options" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "survey_template_questions_dimension_length" CHECK ((("dimension" IS NULL) OR ("length"("dimension") <= 180))),
    CONSTRAINT "survey_template_questions_hint_length" CHECK ((("hint" IS NULL) OR ("length"("hint") <= 2000))),
    CONSTRAINT "survey_template_questions_order_nonnegative" CHECK (("order_num" >= 0)),
    CONSTRAINT "survey_template_questions_text_not_blank" CHECK ((("length"("btrim"("text")) >= 1) AND ("length"("btrim"("text")) <= 5000)))
);


ALTER TABLE "public"."survey_template_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."survey_template_questions" IS 'Ordered reusable question content belonging to a survey template.';



CREATE TABLE IF NOT EXISTS "public"."survey_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "survey_templates_description_length" CHECK ((("description" IS NULL) OR ("length"("description") <= 5000))),
    CONSTRAINT "survey_templates_name_not_blank" CHECK ((("length"("btrim"("name")) >= 2) AND ("length"("btrim"("name")) <= 180)))
);


ALTER TABLE "public"."survey_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."survey_templates" IS 'Reusable global or organisation-specific survey definitions. Managed by super administrators.';



COMMENT ON COLUMN "public"."survey_templates"."org_id" IS 'Null for a global template; otherwise limits the template to one organisation.';



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."survey_access_events"
    ADD CONSTRAINT "survey_access_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_access_events"
    ADD CONSTRAINT "survey_access_events_respondent_access_key" UNIQUE ("respondent_id", "access_id");



ALTER TABLE ONLY "public"."survey"
    ADD CONSTRAINT "survey_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_respondents"
    ADD CONSTRAINT "survey_respondents_id_survey_key" UNIQUE ("id", "survey_id");



ALTER TABLE ONLY "public"."survey_respondents"
    ADD CONSTRAINT "survey_respondents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_respondents"
    ADD CONSTRAINT "survey_respondents_survey_id_email_key" UNIQUE ("survey_id", "email");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_respondent_id_key" UNIQUE ("respondent_id");



ALTER TABLE ONLY "public"."survey_template_questions"
    ADD CONSTRAINT "survey_template_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_template_questions"
    ADD CONSTRAINT "survey_template_questions_template_order_unique" UNIQUE ("template_id", "order_num");



ALTER TABLE ONLY "public"."survey_templates"
    ADD CONSTRAINT "survey_templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_profiles_org_id" ON "public"."profiles" USING "btree" ("org_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_survey_automatic_reminders" ON "public"."survey" USING "btree" ("reminder_first_send_at", "live_end") WHERE (("reminders_enabled" = true) AND ("status" = 'live'::"text"));



CREATE INDEX "organisations_country_idx" ON "public"."organisations" USING "btree" ("country");



CREATE INDEX "organisations_industry_idx" ON "public"."organisations" USING "btree" ("industry");



CREATE UNIQUE INDEX "organisations_registration_number_idx" ON "public"."organisations" USING "btree" ("lower"("registration_number")) WHERE (("registration_number" IS NOT NULL) AND (TRIM(BOTH FROM "registration_number") <> ''::"text"));



CREATE INDEX "organisations_status_idx" ON "public"."organisations" USING "btree" ("status");



CREATE INDEX "organisations_type_idx" ON "public"."organisations" USING "btree" ("organisation_type");



CREATE UNIQUE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE UNIQUE INDEX "survey_access_events_first_per_respondent_idx" ON "public"."survey_access_events" USING "btree" ("respondent_id") WHERE ("access_type" = 'first'::"text");



CREATE INDEX "survey_access_events_respondent_accessed_idx" ON "public"."survey_access_events" USING "btree" ("respondent_id", "accessed_at" DESC);



CREATE INDEX "survey_access_events_survey_accessed_idx" ON "public"."survey_access_events" USING "btree" ("survey_id", "accessed_at" DESC);



CREATE INDEX "survey_org_id_idx" ON "public"."survey" USING "btree" ("org_id");



CREATE INDEX "survey_template_questions_template_id_idx" ON "public"."survey_template_questions" USING "btree" ("template_id", "order_num");



CREATE INDEX "survey_templates_active_idx" ON "public"."survey_templates" USING "btree" ("active");



CREATE UNIQUE INDEX "survey_templates_global_name_unique" ON "public"."survey_templates" USING "btree" ("lower"("btrim"("name"))) WHERE ("org_id" IS NULL);



CREATE INDEX "survey_templates_org_id_idx" ON "public"."survey_templates" USING "btree" ("org_id");



CREATE UNIQUE INDEX "survey_templates_org_name_unique" ON "public"."survey_templates" USING "btree" ("org_id", "lower"("btrim"("name"))) WHERE ("org_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "finalize_respondent_after_response" AFTER INSERT OR UPDATE OF "submitted_at" ON "public"."survey_responses" FOR EACH ROW EXECUTE FUNCTION "public"."finalize_respondent_on_response"();



CREATE OR REPLACE TRIGGER "organisations_set_updated_at" BEFORE UPDATE ON "public"."organisations" FOR EACH ROW EXECUTE FUNCTION "public"."set_organisations_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_privilege_lock" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_profile_privilege_lock"();



CREATE OR REPLACE TRIGGER "survey_completion_receipt" AFTER INSERT ON "public"."survey_responses" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://www.culture-xe.com/api/surveys/receipt', 'POST', '{"Content-type":"application/json","x-webhook-secret":"17dbefbf63722a2d3bac9817d1901d80c8d08a6399ec32941857dfbcf7c8cb5d+"}', '{}', '10000');



CREATE OR REPLACE TRIGGER "survey_template_questions_set_updated_at" BEFORE UPDATE ON "public"."survey_template_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "survey_templates_set_updated_at" BEFORE UPDATE ON "public"."survey_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_access_events"
    ADD CONSTRAINT "survey_access_events_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "public"."survey_respondents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_access_events"
    ADD CONSTRAINT "survey_access_events_respondent_survey_fkey" FOREIGN KEY ("respondent_id", "survey_id") REFERENCES "public"."survey_respondents"("id", "survey_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_access_events"
    ADD CONSTRAINT "survey_access_events_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."survey"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey"
    ADD CONSTRAINT "survey_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."survey"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_respondents"
    ADD CONSTRAINT "survey_respondents_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."survey"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_respondents"
    ADD CONSTRAINT "survey_respondents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "public"."survey_respondents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."survey"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_template_questions"
    ADD CONSTRAINT "survey_template_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."survey_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_templates"
    ADD CONSTRAINT "survey_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_templates"
    ADD CONSTRAINT "survey_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;


CREATE OR REPLACE FUNCTION "public"."get_survey_assignment_bundle"("p_token" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'respondent', to_jsonb(respondent),
    'survey', to_jsonb(survey_record),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(question) order by question.order_num)
      from public.survey_questions as question
      where question.survey_id = survey_record.id
    ), '[]'::jsonb)
  )
  from public.survey_respondents as respondent
  join public.survey as survey_record on survey_record.id = respondent.survey_id
  where respondent.token = p_token
  limit 1;
$$;


CREATE OR REPLACE FUNCTION "public"."get_open_survey_bundle"("p_open_token" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'survey', to_jsonb(survey_record),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(question) order by question.order_num)
      from public.survey_questions as question
      where question.survey_id = survey_record.id
    ), '[]'::jsonb)
  )
  from public.survey as survey_record
  where survey_record.open_link_token = p_open_token
    and survey_record.open_link_enabled
  limit 1;
$$;


CREATE OR REPLACE FUNCTION "public"."submit_survey_response"("p_token" "uuid", "p_answers" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  respondent public.survey_respondents%rowtype;
  saved_response public.survey_responses%rowtype;
  survey_record public.survey%rowtype;
  submitted_time timestamptz := now();
begin
  select * into respondent from public.survey_respondents where token = p_token;
  if not found then raise exception 'This survey invitation is invalid.'; end if;
  if respondent.used or respondent.submitted_at is not null then
    raise exception 'This survey has already been submitted.';
  end if;
  if not public.survey_accepting_responses(respondent.survey_id, respondent.id) then
    raise exception 'This survey is not currently accepting responses.';
  end if;
  select * into survey_record from public.survey where id = respondent.survey_id;
  insert into public.survey_responses (survey_id, respondent_id, answers, submitted_at)
  values (respondent.survey_id, respondent.id, coalesce(p_answers, '{}'::jsonb), submitted_time)
  returning * into saved_response;
  update public.survey_respondents
  set response_timing = case
    when survey_record.live_end is not null and submitted_time > survey_record.live_end then 'late'
    when survey_record.live_start is not null and survey_record.live_end is not null
      and submitted_time < survey_record.live_start + ((survey_record.live_end - survey_record.live_start) / 2)
      then 'early'
    else 'on_time'
  end
  where id = respondent.id;
  return to_jsonb(saved_response);
end;
$$;



ALTER TABLE "public"."organisations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_admin_all" ON "public"."organisations" TO "authenticated" USING (("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "orgs_client_view" ON "public"."organisations" FOR SELECT TO "authenticated" USING ((("public"."get_my_role"() = ANY (ARRAY['client'::"text", 'employee'::"text"])) AND ("id" = "public"."get_my_org"())));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_superadmin" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = 'superadmin'::"text"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "sq_admin_write" ON "public"."survey_questions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sq_staff_read" ON "public"."survey_questions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());


CREATE POLICY "sq_assigned_read" ON "public"."survey_questions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."survey_respondents" "assignment"
  WHERE (("assignment"."survey_id" = "survey_questions"."survey_id") AND (("assignment"."user_id" = "auth"."uid"()) OR (lower("assignment"."email") = lower("auth"."email"())))))));



CREATE POLICY "sr_admin_all" ON "public"."survey_respondents" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sr_own_select" ON "public"."survey_respondents" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("lower"("email") = "lower"("auth"."email"()))));



CREATE POLICY "sr_own_update" ON "public"."survey_respondents" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("lower"("email") = "lower"("auth"."email"()))));



CREATE POLICY "sresp_admin_all" ON "public"."survey_responses" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sresp_own_read" ON "public"."survey_responses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."survey_respondents" "sr"
  WHERE (("sr"."id" = "survey_responses"."respondent_id") AND (("sr"."user_id" = "auth"."uid"()) OR ("lower"("sr"."email") = "lower"("auth"."email"())))))));



CREATE POLICY "sresp_own_write" ON "public"."survey_responses" FOR INSERT TO "authenticated" WITH CHECK (("public"."survey_accepting_responses"("survey_id", "respondent_id") AND (EXISTS ( SELECT 1
   FROM "public"."survey_respondents" "sr"
  WHERE (("sr"."id" = "survey_responses"."respondent_id") AND ("sr"."survey_id" = "survey_responses"."survey_id") AND (("sr"."user_id" = "auth"."uid"()) OR ("lower"("sr"."email") = "lower"("auth"."email"()))))))));



CREATE POLICY "staff_delete_respondents" ON "public"."survey_respondents" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'superadmin'::"text"])));



CREATE POLICY "staff_delete_responses" ON "public"."survey_responses" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'superadmin'::"text"])));



ALTER TABLE "public"."survey" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_access_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_access_events_staff_read" ON "public"."survey_access_events" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "survey_admin_write" ON "public"."survey" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."survey_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_staff_read" ON "public"."survey" FOR SELECT TO "authenticated" USING ("public"."is_admin"());


CREATE POLICY "survey_assigned_read" ON "public"."survey" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."survey_respondents" "assignment"
  WHERE (("assignment"."survey_id" = "survey"."id") AND (("assignment"."user_id" = "auth"."uid"()) OR (lower("assignment"."email") = lower("auth"."email"())))))));



ALTER TABLE "public"."survey_respondents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_template_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_template_questions_superadmin_all" ON "public"."survey_template_questions" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



ALTER TABLE "public"."survey_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_templates_superadmin_all" ON "public"."survey_templates" TO "authenticated" USING ("public"."is_superadmin"()) WITH CHECK ("public"."is_superadmin"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_respondent_on_response"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_respondent_on_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_respondent_on_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_respondent_on_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";


REVOKE ALL ON FUNCTION "public"."get_survey_assignment_bundle"("p_token" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_survey_assignment_bundle"("p_token" "uuid") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_survey_assignment_bundle"("p_token" "uuid") TO "authenticated";


REVOKE ALL ON FUNCTION "public"."get_open_survey_bundle"("p_open_token" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_open_survey_bundle"("p_open_token" "uuid") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_open_survey_bundle"("p_open_token" "uuid") TO "authenticated";


REVOKE ALL ON FUNCTION "public"."submit_survey_response"("p_token" "uuid", "p_answers" "jsonb") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."submit_survey_response"("p_token" "uuid", "p_answers" "jsonb") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."submit_survey_response"("p_token" "uuid", "p_answers" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_my_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superadmin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_superadmin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superadmin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_my_profile_managers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_my_profile_managers"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_my_profile_managers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_my_profile_managers"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_survey_access"("p_token" "uuid", "p_access_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_survey_access"("p_token" "uuid", "p_access_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_survey_access"("p_token" "uuid", "p_access_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_survey_access"("p_token" "uuid", "p_access_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_survey_draft"("p_token" "uuid", "p_answers" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_survey_draft"("p_token" "uuid", "p_answers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_survey_draft"("p_token" "uuid", "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_survey_draft"("p_token" "uuid", "p_answers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_organisations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_organisations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_organisations_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_survey_response"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_survey_response"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."start_survey_response"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_survey_response"("p_token" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."survey_accepting_responses"("p_survey_id" "uuid", "p_respondent_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."survey_accepting_responses"("p_survey_id" "uuid", "p_respondent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."survey_accepting_responses"("p_survey_id" "uuid", "p_respondent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."survey_accepting_responses"("p_survey_id" "uuid", "p_respondent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."organisations" TO "anon";
GRANT ALL ON TABLE "public"."organisations" TO "authenticated";
GRANT ALL ON TABLE "public"."organisations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."survey" TO "anon";
GRANT ALL ON TABLE "public"."survey" TO "authenticated";
GRANT ALL ON TABLE "public"."survey" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."survey_access_events" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_access_events" TO "service_role";



GRANT ALL ON TABLE "public"."survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_respondents" TO "anon";
GRANT ALL ON TABLE "public"."survey_respondents" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_respondents" TO "service_role";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."survey_template_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_template_questions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_templates" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







