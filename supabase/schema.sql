


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
  current_survey_id uuid;
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

  -- Auto-enrol participants into the current survey (the oldest survey that
  -- isn't closed — matches how the app picks the active survey). Skip silently
  -- if no open survey exists yet; the backfill in Part 2 (re-run) will catch
  -- them once a survey is live.
  IF safe_role IN ('client', 'employee') THEN
    SELECT id INTO current_survey_id
    FROM public.survey
    WHERE status <> 'closed'
    ORDER BY created_at ASC
    LIMIT 1;

    IF current_survey_id IS NOT NULL THEN
      INSERT INTO public.survey_respondents (survey_id, email, name, job_title)
      VALUES (
        current_survey_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'job_title'), '')
      )
      ON CONFLICT (survey_id, email) DO NOTHING;  -- never clobber a manually-added respondent
    END IF;
  END IF;

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
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "live_start" timestamp with time zone,
    "live_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "open_link_enabled" boolean DEFAULT false NOT NULL,
    "open_link_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL
);


ALTER TABLE "public"."survey" OWNER TO "postgres";


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
    "job_grade" "text"
);


ALTER TABLE "public"."survey_respondents" OWNER TO "postgres";


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


ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."survey"
    ADD CONSTRAINT "survey_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_respondents"
    ADD CONSTRAINT "survey_respondents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_respondents"
    ADD CONSTRAINT "survey_respondents_survey_id_email_key" UNIQUE ("survey_id", "email");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_respondent_id_key" UNIQUE ("respondent_id");



CREATE INDEX "idx_profiles_org_id" ON "public"."profiles" USING "btree" ("org_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "organisations_country_idx" ON "public"."organisations" USING "btree" ("country");



CREATE INDEX "organisations_industry_idx" ON "public"."organisations" USING "btree" ("industry");



CREATE UNIQUE INDEX "organisations_registration_number_idx" ON "public"."organisations" USING "btree" ("lower"("registration_number")) WHERE (("registration_number" IS NOT NULL) AND (TRIM(BOTH FROM "registration_number") <> ''::"text"));



CREATE INDEX "organisations_status_idx" ON "public"."organisations" USING "btree" ("status");



CREATE INDEX "organisations_type_idx" ON "public"."organisations" USING "btree" ("organisation_type");



CREATE UNIQUE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "survey_org_id_idx" ON "public"."survey" USING "btree" ("org_id");



CREATE OR REPLACE TRIGGER "organisations_set_updated_at" BEFORE UPDATE ON "public"."organisations" FOR EACH ROW EXECUTE FUNCTION "public"."set_organisations_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_privilege_lock" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_profile_privilege_lock"();



CREATE OR REPLACE TRIGGER "survey_completion_receipt" AFTER INSERT ON "public"."survey_responses" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://www.culture-xe.com/api/surveys/receipt', 'POST', '{"Content-type":"application/json","x-webhook-secret":"17dbefbf63722a2d3bac9817d1901d80c8d08a6399ec32941857dfbcf7c8cb5d+"}', '{}', '10000');



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE SET NULL;



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



ALTER TABLE "public"."organisations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_admin_all" ON "public"."organisations" TO "authenticated" USING (("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "orgs_client_view" ON "public"."organisations" FOR SELECT TO "authenticated" USING ((("public"."get_my_role"() = ANY (ARRAY['client'::"text", 'employee'::"text"])) AND ("id" = "public"."get_my_org"())));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_superadmin" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = 'superadmin'::"text"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'admin'::"text", 'superadmin'::"text"]))));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "sq_admin_write" ON "public"."survey_questions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sq_read_all" ON "public"."survey_questions" FOR SELECT USING (true);



CREATE POLICY "sr_admin_all" ON "public"."survey_respondents" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sr_anon_token_select" ON "public"."survey_respondents" FOR SELECT TO "anon" USING (true);



CREATE POLICY "sr_anon_token_update" ON "public"."survey_respondents" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "sr_own_insert" ON "public"."survey_respondents" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "sr_own_select" ON "public"."survey_respondents" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("lower"("email") = "lower"("auth"."email"()))));



CREATE POLICY "sr_own_update" ON "public"."survey_respondents" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("lower"("email") = "lower"("auth"."email"()))));



CREATE POLICY "sresp_admin_all" ON "public"."survey_responses" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "sresp_anon_insert" ON "public"."survey_responses" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "sresp_own_read" ON "public"."survey_responses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."survey_respondents" "sr"
  WHERE (("sr"."id" = "survey_responses"."respondent_id") AND (("sr"."user_id" = "auth"."uid"()) OR ("lower"("sr"."email") = "lower"("auth"."email"())))))));



CREATE POLICY "sresp_own_write" ON "public"."survey_responses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."survey_respondents" "sr"
  WHERE (("sr"."id" = "survey_responses"."respondent_id") AND (("sr"."user_id" = "auth"."uid"()) OR ("lower"("sr"."email") = "lower"("auth"."email"())))))));



CREATE POLICY "staff_delete_respondents" ON "public"."survey_respondents" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'superadmin'::"text"])));



CREATE POLICY "staff_delete_responses" ON "public"."survey_responses" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = ANY (ARRAY['consultant'::"text", 'superadmin'::"text"])));



ALTER TABLE "public"."survey" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_admin_write" ON "public"."survey" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."survey_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_read_all" ON "public"."survey" FOR SELECT USING (true);



ALTER TABLE "public"."survey_respondents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_open_respondent"("p_open_token" "uuid", "p_department" "text", "p_job_title" "text", "p_tenure" "text", "p_job_grade" "text", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_organisations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_organisations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_organisations_updated_at"() TO "service_role";



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



GRANT ALL ON TABLE "public"."survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_respondents" TO "anon";
GRANT ALL ON TABLE "public"."survey_respondents" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_respondents" TO "service_role";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



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







