SET local check_function_bodies = off;

CREATE TABLE "public"."organisations" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"           text                     NOT NULL,
  "industry"       text,
  "size"           integer,
  "country"        text                     DEFAULT 'South Africa'::text,
  "contact_name"   text,
  "contact_email"  text,
  "created_at"     timestamp with time zone DEFAULT now(),
  "employee_count" integer,
  "website"        text,
  "status"         text                     NOT NULL DEFAULT 'active'::text,
  CONSTRAINT "organisations_pkey" PRIMARY KEY (id),
  CONSTRAINT "organisations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'onboarding'::text])))
);

ALTER TABLE "public"."organisations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"            uuid                     NOT NULL,
  "email"         text,
  "role"          text,
  "org_id"        uuid,
  "full_name"     text,
  "created_at"    timestamp with time zone DEFAULT now(),
  "active"        boolean                  DEFAULT true,
  "department"    text,
  "job_title"     text,
  "manager_id"    uuid,
  "hire_date"     date,
  "phone"         text,
  "username"      text,
  "position"      text,
  "branch"        text,
  "location_site" text,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_position_check"
    CHECK
    (("position" = ANY (ARRAY['Executive'::text, 'Senior Manager'::text, 'Manager'::text, 'Team Lead'::text, 'Supervisor'::text, 'Senior Employee'::text, 'Employee'::text,
    'Intern'::text, 'Contractor'::text, 'Other'::text]))),
  CONSTRAINT "profiles_username_key" UNIQUE (username)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."survey_questions" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "survey_id"     uuid                     NOT NULL,
  "text"          text                     NOT NULL,
  "hint"          text,
  "question_type" text                     NOT NULL DEFAULT 'likert'::text,
  "dimension"     text,
  "order_num"     integer                  NOT NULL DEFAULT 0,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  "options"       jsonb,
  CONSTRAINT "survey_questions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."survey_questions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."survey_respondents" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "survey_id"       uuid                     NOT NULL,
  "email"           text                     NOT NULL,
  "name"            text,
  "department"      text,
  "job_title"       text,
  "token"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "used"            boolean                  NOT NULL DEFAULT false,
  "invited_at"      timestamp with time zone DEFAULT now(),
  "reminded_at"     timestamp with time zone,
  "submitted_at"    timestamp with time zone,
  "response_timing" text,
  "user_id"         uuid,
  "draft_answers"   jsonb,
  "draft_saved_at"  timestamp with time zone,
  "started_at"      timestamp with time zone,
  "source"          text                     NOT NULL DEFAULT 'invited'::text,
  "tenure"          text,
  "job_grade"       text,
  CONSTRAINT "survey_respondents_pkey" PRIMARY KEY (id),
  CONSTRAINT "survey_respondents_survey_id_email_key" UNIQUE (survey_id, email)
);

ALTER TABLE "public"."survey_respondents"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."survey_responses" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "survey_id"     uuid                     NOT NULL,
  "respondent_id" uuid                     NOT NULL,
  "answers"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "submitted_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "survey_responses_pkey" PRIMARY KEY (id),
  CONSTRAINT "survey_responses_respondent_id_key" UNIQUE (respondent_id)
);

ALTER TABLE "public"."survey_responses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."survey" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "title"             text                     NOT NULL DEFAULT 'DBN Culture Survey'::text,
  "description"       text,
  "status"            text                     NOT NULL DEFAULT 'draft'::text,
  "live_start"        timestamp with time zone,
  "live_end"          timestamp with time zone,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  "open_link_enabled" boolean                  NOT NULL DEFAULT false,
  "open_link_token"   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "org_id"            uuid                     NOT NULL,
  CONSTRAINT "survey_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."survey"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enforce_profile_privilege_lock()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_email_by_username (
  p_username text
)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT email
  FROM   public.profiles
  WHERE  lower(username) = lower(p_username)
  LIMIT  1;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_org()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.get_my_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT role FROM profiles WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('consultant', 'admin', 'superadmin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.register_open_respondent (
  p_open_token uuid,
  p_department text,
  p_job_title  text,
  p_tenure     text,
  p_job_grade  text,
  p_name       text DEFAULT NULL::text
)
  RETURNS TABLE (
    respondent_token uuid
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id);

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE SET NULL;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."survey"
  ADD CONSTRAINT "survey_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE RESTRICT;

ALTER TABLE "public"."survey_questions"
  ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY (survey_id) REFERENCES public.survey(id) ON DELETE CASCADE;

ALTER TABLE "public"."survey_respondents"
  ADD CONSTRAINT "survey_respondents_survey_id_fkey" FOREIGN KEY (survey_id) REFERENCES public.survey(id) ON DELETE CASCADE;

ALTER TABLE "public"."survey_respondents"
  ADD CONSTRAINT "survey_respondents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."survey_responses"
  ADD CONSTRAINT "survey_responses_respondent_id_fkey" FOREIGN KEY (respondent_id) REFERENCES public.survey_respondents(id) ON DELETE CASCADE;

ALTER TABLE "public"."survey_responses"
  ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY (survey_id) REFERENCES public.survey(id) ON DELETE CASCADE;

CREATE INDEX idx_profiles_org_id ON public.profiles USING btree (org_id);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (ROLE);

CREATE UNIQUE INDEX profiles_username_idx ON public.profiles USING btree (lower(username))
  WHERE (username IS NOT NULL);

CREATE INDEX survey_org_id_idx ON public.survey USING btree (org_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_privilege_lock
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_privilege_lock();

CREATE POLICY "orgs_admin_all" ON "public"."organisations"
  FOR ALL
  TO "authenticated"
  USING ((public.get_my_role() = ANY (ARRAY['consultant'::text, 'admin'::text, 'superadmin'::text])));

CREATE POLICY "orgs_client_view" ON "public"."organisations"
  FOR SELECT
  TO "authenticated"
  USING (((public.get_my_role() = ANY (ARRAY['client'::text, 'employee'::text])) AND (id = public.get_my_org())));

CREATE POLICY "profiles_delete_superadmin" ON "public"."profiles"
  FOR DELETE
  TO "authenticated"
  USING ((public.get_my_role() = 'superadmin'::text));

CREATE POLICY "profiles_insert_own" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "profiles_select" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['consultant'::text, 'admin'::text, 'superadmin'::text]))));

CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "survey_admin_write" ON "public"."survey"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "survey_read_all" ON "public"."survey"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "sq_admin_write" ON "public"."survey_questions"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sq_read_all" ON "public"."survey_questions"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "sr_admin_all" ON "public"."survey_respondents"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sr_anon_token_select" ON "public"."survey_respondents"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "sr_anon_token_update" ON "public"."survey_respondents"
  FOR UPDATE
  TO "anon"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sr_own_insert" ON "public"."survey_respondents"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "sr_own_select" ON "public"."survey_respondents"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR (lower(email) = lower(auth.email()))));

CREATE POLICY "sr_own_update" ON "public"."survey_respondents"
  FOR UPDATE
  TO "authenticated"
  USING (((user_id = auth.uid()) OR (lower(email) = lower(auth.email()))));

CREATE POLICY "staff_delete_respondents" ON "public"."survey_respondents"
  FOR DELETE
  TO "authenticated"
  USING ((public.get_my_role() = ANY (ARRAY['consultant'::text, 'superadmin'::text])));

CREATE POLICY "sresp_admin_all" ON "public"."survey_responses"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sresp_anon_insert" ON "public"."survey_responses"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "sresp_own_read" ON "public"."survey_responses"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.survey_respondents sr
  WHERE ((sr.id = survey_responses.respondent_id) AND ((sr.user_id = auth.uid()) OR (lower(sr.email) = lower(auth.email())))))));

CREATE POLICY "sresp_own_write" ON "public"."survey_responses"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.survey_respondents sr
  WHERE ((sr.id = survey_responses.respondent_id) AND ((sr.user_id = auth.uid()) OR (lower(sr.email) = lower(auth.email())))))));

CREATE POLICY "staff_delete_responses" ON "public"."survey_responses"
  FOR DELETE
  TO "authenticated"
  USING ((public.get_my_role() = ANY (ARRAY['consultant'::text, 'superadmin'::text])));

CREATE POLICY "anon_upload_survey_files" ON "storage"."objects"
  FOR INSERT
  TO "anon"
  WITH CHECK ((bucket_id = 'survey-files'::text));

CREATE POLICY "auth_manage_survey_files" ON "storage"."objects"
  FOR ALL
  TO "authenticated"
  USING ((bucket_id = 'survey-files'::text))
  WITH CHECK ((bucket_id = 'survey-files'::text));

CREATE POLICY "public_read_survey_files" ON "storage"."objects"
  FOR SELECT
  TO "anon"
  USING ((bucket_id = 'survey-files'::text));

COMMENT ON COLUMN "public"."profiles"."branch" IS 'Employee branch, managed by authorised administrators and consultants.';

COMMENT ON COLUMN "public"."profiles"."location_site" IS 'Employee work location or site, managed by authorised administrators and consultants.';

GRANT EXECUTE ON FUNCTION "public"."enforce_profile_privilege_lock"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."enforce_profile_privilege_lock"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."enforce_profile_privilege_lock"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_email_by_username"(text) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."get_email_by_username"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_email_by_username"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_email_by_username"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_my_org"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."get_my_org"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_my_org"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_my_org"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_my_role"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."get_my_role"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_my_role"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_my_role"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_superadmin"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_superadmin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_superadmin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_superadmin"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."register_open_respondent"(uuid, text, text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."register_open_respondent"(uuid, text, text, text, text, text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."register_open_respondent"(uuid, text, text, text, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."register_open_respondent"(uuid, text, text, text, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."register_open_respondent"(uuid, text, text, text, text, text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."update_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organisations" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."organisations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organisations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organisations" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."survey" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_questions" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."survey_questions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_questions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_questions" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_respondents" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."survey_respondents" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_respondents" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_respondents" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_responses" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."survey_responses" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_responses" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."survey_responses" TO "service_role";

