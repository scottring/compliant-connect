

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


ALTER SCHEMA "public" OWNER TO "postgres";





CREATE TYPE "public"."flag_status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'rejected'
);


ALTER TYPE "public"."flag_status" OWNER TO "postgres";


CREATE TYPE "public"."pir_status" AS ENUM (
    'draft',
    'sent',
    'in_progress',
    'submitted',
    'reviewed',
    'rejected',
    'resubmitted',
    'canceled'
);


ALTER TYPE "public"."pir_status" OWNER TO "postgres";


CREATE TYPE "public"."question_type" AS ENUM (
    'text',
    'number',
    'boolean',
    'single_select',
    'multi_select',
    'date',
    'file',
    'LIST_TABLE'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."question_type__old_version_to_be_dropped" AS ENUM (
    'text',
    'number',
    'boolean',
    'single_select',
    'multi_select',
    'date',
    'file',
    'LIST_TABLE',
    'list_table',
    'component_material_list'
);


ALTER TYPE "public"."question_type__old_version_to_be_dropped" OWNER TO "postgres";


CREATE TYPE "public"."relationship_status" AS ENUM (
    'pending',
    'active',
    'inactive',
    'rejected'
);


ALTER TYPE "public"."relationship_status" OWNER TO "postgres";


CREATE TYPE "public"."response_status" AS ENUM (
    'draft',
    'submitted',
    'flagged',
    'approved'
);


ALTER TYPE "public"."response_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_supplier_response_access_and_log"("response_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  supplier_company_id uuid;
  access_granted boolean;
BEGIN
  -- Get the supplier_company_id from pir_requests based on the response_id
  SELECT pir.supplier_company_id INTO supplier_company_id
  FROM pir_requests pir
  JOIN pir_responses resp ON pir.id = resp.pir_request_id
  WHERE resp.id = response_id;

  -- Check if the current user is linked to the supplier company
  access_granted := EXISTS (
    SELECT 1
    FROM company_users cu
    WHERE cu.company_id = supplier_company_id
    AND cu.user_id = auth.uid()
  );

  -- Log the details
  RAISE NOTICE 'Response ID: %, User ID: %, Supplier Company ID: %, Access Granted: %', response_id, auth.uid(), supplier_company_id, access_granted;

  -- Return the access status
  RETURN access_granted;
END;
$$;



SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "section_id" "uuid",
    "text" "text" NOT NULL,
    "description" "text",
    "type" "public"."question_type__old_version_to_be_dropped" NOT NULL,
    "options" "jsonb",
    "required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_index" integer DEFAULT 0 NOT NULL
);










CREATE OR REPLACE FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type__old_version_to_be_dropped", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[]) RETURNS "public"."questions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_question public.questions;
    tag_id uuid;
BEGIN
    -- Insert the new question
    INSERT INTO public.questions (section_id, text, description, type, required, options)
    VALUES (p_subsection_id, p_text, p_description, p_type, p_required, p_options)
    RETURNING * INTO new_question;

    -- Insert associations into question_tags
    IF array_length(p_tag_ids, 1) > 0 THEN
        FOREACH tag_id IN ARRAY p_tag_ids
        LOOP
            INSERT INTO public.question_tags (question_id, tag_id)
            VALUES (new_question.id, tag_id);
        END LOOP;
    END IF;

    -- Return the newly created question record
    RETURN new_question;
END;
$$;




CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;




CREATE OR REPLACE FUNCTION "public"."is_company_member_or_admin"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  FOUND BOOLEAN;
BEGIN
  FOUND := EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = p_company_id
      AND cu.role IN ('admin', 'member') -- Adjust roles as needed
  );
  RETURN FOUND;
END;
$$;




CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;




CREATE OR REPLACE FUNCTION "public"."update_question_order"("p_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.questions q
  SET order_index = (elem->>'order_index')::integer
  FROM jsonb_array_elements(p_updates) AS elem
  WHERE q.id = (elem->>'question_id')::uuid;

  -- Optional: Add error handling or logging if needed
END;
$$;




CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$;




CREATE OR REPLACE FUNCTION "public"."validate_pir_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'in_progress' THEN -- Keep existing
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'submitted' THEN -- Keep existing (from previous migration)
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'submitted' THEN -- Keep existing
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('reviewed', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'rejected' AND NEW.status = 'resubmitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'submitted' THEN -- Keep existing
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'reviewed' THEN -- *** Add this condition ***
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$;




CREATE OR REPLACE FUNCTION "public"."validate_response_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'submitted' AND NEW.status IN ('approved', 'flagged') THEN
    RETURN NEW;
  ELSIF OLD.status = 'flagged' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid response status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$;




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text"
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."company_relationships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "supplier_id" "uuid",
    "status" "public"."relationship_status" DEFAULT 'pending'::"public"."relationship_status" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE OR REPLACE VIEW "public"."company_relationships_view" AS
 SELECT "cr"."id",
    "cr"."customer_id",
    "cr"."supplier_id",
    "cr"."status",
    "cr"."type",
    "cr"."created_at",
    "cr"."updated_at",
    "c1"."name" AS "customer_name",
    "c2"."name" AS "supplier_name"
   FROM (("public"."company_relationships" "cr"
     JOIN "public"."companies" "c1" ON (("cr"."customer_id" = "c1"."id")))
     JOIN "public"."companies" "c2" ON (("cr"."supplier_id" = "c2"."id")));




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."company_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."pir_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "customer_id" "uuid",
    "supplier_company_id" "uuid",
    "title" "text",
    "description" "text",
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "suggested_product_name" "text",
    "status" "public"."pir_status" DEFAULT 'draft'::"public"."pir_status" NOT NULL,
    CONSTRAINT "pir_requests_status_check" CHECK ((("status")::"text" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'in_progress'::"text", 'submitted'::"text", 'reviewed'::"text", 'rejected'::"text", 'resubmitted'::"text", 'canceled'::"text"])))
);







CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "supplier_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE OR REPLACE VIEW "public"."pir_access_view" AS
 SELECT "pir"."id",
    "pir"."product_id",
    "pir"."customer_id",
    "pir"."supplier_company_id",
    "pir"."title",
    "pir"."description",
    "pir"."status",
    "pir"."due_date",
    "pir"."created_at",
    "pir"."updated_at",
    "p"."name" AS "product_name",
    "c1"."name" AS "customer_name",
    "c2"."name" AS "supplier_name"
   FROM ((("public"."pir_requests" "pir"
     LEFT JOIN "public"."products" "p" ON (("p"."id" = "pir"."product_id")))
     JOIN "public"."companies" "c1" ON (("c1"."id" = "pir"."customer_id")))
     JOIN "public"."companies" "c2" ON (("c2"."id" = "pir"."supplier_company_id")));




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."pir_response_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "response_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."pir_response_component_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "component_id" "uuid" NOT NULL,
    "material_name" "text",
    "percentage" numeric,
    "recyclable" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."pir_response_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pir_response_id" "uuid" NOT NULL,
    "component_name" "text",
    "position" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."pir_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pir_id" "uuid",
    "question_id" "uuid",
    "answer" "jsonb" NOT NULL,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."response_status" DEFAULT 'draft'::"public"."response_status" NOT NULL,
    "customer_review_status" "public"."response_status",
    CONSTRAINT "pir_responses_status_check" CHECK ((("status")::"text" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'flagged'::"text", 'approved'::"text"])))
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."pir_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pir_id" "uuid",
    "tag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);




CREATE OR REPLACE VIEW "public"."product_access_view" AS
 SELECT "p"."id",
    "p"."supplier_id",
    "p"."name",
    "p"."description",
    "p"."created_at",
    "p"."updated_at",
    "c"."name" AS "supplier_name"
   FROM ("public"."products" "p"
     JOIN "public"."companies" "c" ON (("p"."supplier_id" = "c"."id")));




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."product_answer_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_answer_id" "uuid",
    "answer" "jsonb" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."product_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "question_id" "uuid",
    "current_answer" "jsonb" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."question_sections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid"
);










CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."question_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid",
    "tag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."response_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "flag_id" "uuid",
    "user_id" "uuid",
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."response_flags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "response_id" "uuid",
    "created_by" "uuid",
    "description" "text" NOT NULL,
    "status" "public"."flag_status" DEFAULT 'open'::"public"."flag_status" NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE TABLE IF NOT EXISTS IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);




CREATE OR REPLACE VIEW "public"."v_question_bank_numbered_temp" AS
 WITH RECURSIVE "section_hierarchy" AS (
         SELECT "question_sections"."id",
            "question_sections"."name",
            "question_sections"."order_index",
            "question_sections"."parent_id",
            1 AS "level",
            ("question_sections"."order_index")::"text" AS "path_string"
           FROM "public"."question_sections"
          WHERE ("question_sections"."parent_id" IS NULL)
        UNION ALL
         SELECT "qs"."id",
            "qs"."name",
            "qs"."order_index",
            "qs"."parent_id",
            ("sh_1"."level" + 1),
            (("sh_1"."path_string" || '.'::"text") || ("qs"."order_index")::"text")
           FROM ("public"."question_sections" "qs"
             JOIN "section_hierarchy" "sh_1" ON (("qs"."parent_id" = "sh_1"."id")))
        )
 SELECT "q"."id" AS "question_id",
    "q"."text" AS "question_text",
    "q"."description" AS "question_description",
    "q"."type" AS "question_type",
    "q"."required" AS "question_required",
    "q"."options" AS "question_options",
    "q"."created_at" AS "question_created_at",
    "q"."updated_at" AS "question_updated_at",
    "sh"."id" AS "section_id",
    "sh"."name" AS "section_name",
    (("sh"."path_string" || '.'::"text") || ("row_number"() OVER (PARTITION BY "sh"."id" ORDER BY "q"."order_index"))::"text") AS "hierarchical_number",
    "sh"."level" AS "section_level",
    "q"."order_index" AS "question_order_index"
   FROM ("public"."questions" "q"
     JOIN "section_hierarchy" "sh" ON (("q"."section_id" = "sh"."id")))
  ORDER BY "sh"."path_string", "q"."order_index";




ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_customer_id_supplier_id_key" UNIQUE ("customer_id", "supplier_id");



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pir_requests"
    ADD CONSTRAINT "pir_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pir_response_comments"
    ADD CONSTRAINT "pir_response_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pir_response_component_materials"
    ADD CONSTRAINT "pir_response_component_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pir_response_components"
    ADD CONSTRAINT "pir_response_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pir_responses"
    ADD CONSTRAINT "pir_responses_pir_id_question_id_key" UNIQUE ("pir_id", "question_id");



ALTER TABLE ONLY "public"."pir_responses"
    ADD CONSTRAINT "pir_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pir_tags"
    ADD CONSTRAINT "pir_tags_pir_id_tag_id_key" UNIQUE ("pir_id", "tag_id");



ALTER TABLE ONLY "public"."pir_tags"
    ADD CONSTRAINT "pir_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_answer_history"
    ADD CONSTRAINT "product_answer_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_answers"
    ADD CONSTRAINT "product_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_answers"
    ADD CONSTRAINT "product_answers_product_id_question_id_key" UNIQUE ("product_id", "question_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_question_id_tag_id_key" UNIQUE ("question_id", "tag_id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."response_comments"
    ADD CONSTRAINT "response_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."response_flags"
    ADD CONSTRAINT "response_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE INDEX IF NOT EXISTS "idx_pir_response_comments_response_id" ON "public"."pir_response_comments" USING "btree" ("response_id");



CREATE INDEX IF NOT EXISTS "idx_pir_response_comments_user_id" ON "public"."pir_response_comments" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_pir_response_component_materials_component_id" ON "public"."pir_response_component_materials" USING "btree" ("component_id");



CREATE INDEX IF NOT EXISTS "idx_pir_response_components_response_id" ON "public"."pir_response_components" USING "btree" ("pir_response_id");



CREATE INDEX IF NOT EXISTS "idx_question_sections_parent_id" ON "public"."question_sections" USING "btree" ("parent_id");



CREATE INDEX IF NOT EXISTS "idx_questions_section_id_order_index" ON "public"."questions" USING "btree" ("section_id", "order_index");



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."company_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."company_users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."pir_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."pir_responses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."product_answers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."question_sections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."response_flags" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_pir_response_component_materials_updated_at" BEFORE UPDATE ON "public"."pir_response_component_materials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pir_response_components_updated_at" BEFORE UPDATE ON "public"."pir_response_components" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_pir_status_transition_trigger" BEFORE UPDATE OF "status" ON "public"."pir_requests" FOR EACH ROW EXECUTE FUNCTION "public"."validate_pir_status_transition"();



CREATE OR REPLACE TRIGGER "validate_response_status_transition_trigger" BEFORE UPDATE OF "status" ON "public"."pir_responses" FOR EACH ROW EXECUTE FUNCTION "public"."validate_response_status_transition"();



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_relationships"
    ADD CONSTRAINT "company_relationships_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."pir_requests"
    ADD CONSTRAINT "pir_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_requests"
    ADD CONSTRAINT "pir_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_requests"
    ADD CONSTRAINT "pir_requests_supplier_company_id_fkey" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_response_comments"
    ADD CONSTRAINT "pir_response_comments_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."pir_responses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_response_comments"
    ADD CONSTRAINT "pir_response_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_response_component_materials"
    ADD CONSTRAINT "pir_response_component_materials_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."pir_response_components"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_response_components"
    ADD CONSTRAINT "pir_response_components_pir_response_id_fkey" FOREIGN KEY ("pir_response_id") REFERENCES "public"."pir_responses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_responses"
    ADD CONSTRAINT "pir_responses_pir_id_fkey" FOREIGN KEY ("pir_id") REFERENCES "public"."pir_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_responses"
    ADD CONSTRAINT "pir_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_tags"
    ADD CONSTRAINT "pir_tags_pir_id_fkey" FOREIGN KEY ("pir_id") REFERENCES "public"."pir_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pir_tags"
    ADD CONSTRAINT "pir_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_answer_history"
    ADD CONSTRAINT "product_answer_history_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."product_answer_history"
    ADD CONSTRAINT "product_answer_history_product_answer_id_fkey" FOREIGN KEY ("product_answer_id") REFERENCES "public"."product_answers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_answers"
    ADD CONSTRAINT "product_answers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."product_answers"
    ADD CONSTRAINT "product_answers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_answers"
    ADD CONSTRAINT "product_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_sections"
    ADD CONSTRAINT "question_sections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."question_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."question_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."response_comments"
    ADD CONSTRAINT "response_comments_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "public"."response_flags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."response_comments"
    ADD CONSTRAINT "response_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."response_flags"
    ADD CONSTRAINT "response_flags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."response_flags"
    ADD CONSTRAINT "response_flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."response_flags"
    ADD CONSTRAINT "response_flags_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."pir_responses"("id") ON DELETE CASCADE;









   FROM (("public"."pir_requests" "req"
     JOIN "public"."pir_responses" "res" ON (("req"."id" = "res"."pir_id")))
     JOIN "public"."pir_response_components" "comp" ON (("res"."id" = "comp"."pir_response_id")))
  WHERE (("comp"."id" = "pir_response_component_materials"."component_id") AND ("public"."is_company_member_or_admin"("req"."customer_id") OR "public"."is_company_member_or_admin"("req"."supplier_company_id"))))));









   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "pir_requests"."customer_id")))));



   FROM (("public"."pir_responses" "pr"
     JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("pr"."id" = "response_flags"."response_id") AND ("cu"."company_id" = "pir"."customer_id")))) AND ("auth"."uid"() = "created_by")));



   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_tags"."pir_id")))));



   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "pir_requests"."customer_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "pir_requests"."customer_id")))));



   FROM (("public"."products" "p"
     JOIN "public"."company_relationships" "cr" ON (("cr"."supplier_id" = "p"."supplier_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "cr"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("p"."id" = "product_answers"."product_id") AND ("product_answers"."approved_at" IS NOT NULL)))));



   FROM ("public"."company_relationships" "cr"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "cr"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cr"."supplier_id" = "products"."supplier_id")))));



   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_responses"."pir_id")))));















   FROM ("public"."products" "p"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "p"."supplier_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("p"."id" = "product_answers"."product_id")))));



   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "products"."supplier_id")))));



   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."supplier_company_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_responses"."pir_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."supplier_company_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_responses"."pir_id")))));



   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "pir_requests"."supplier_company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "pir_requests"."supplier_company_id")))));












   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND (("cu"."company_id" = "pir_requests"."customer_id") OR ("cu"."company_id" = "pir_requests"."supplier_company_id") OR (("pir_requests"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir_requests"."product_id")))))))));



   FROM ((("public"."response_flags" "rf"
     JOIN "public"."pir_responses" "pr" ON (("pr"."id" = "rf"."response_id")))
     JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("rf"."id" = "response_comments"."flag_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir"."product_id")))))))));



   FROM (("public"."pir_responses" "pr"
     JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("pr"."id" = "response_flags"."response_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir"."product_id")))))))));



   FROM (("public"."pir_responses" "pr"
     JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("pr"."id" = "response_flags"."response_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir"."product_id")))))))));






   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND (("cu"."company_id" = "company_relationships"."customer_id") OR ("cu"."company_id" = "company_relationships"."supplier_id"))))));



   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("pir"."id" = "pir_tags"."pir_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir"."product_id")))))))));



ALTER TABLE "public"."pir_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_response_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_answer_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;














REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type__old_version_to_be_dropped", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_question_order"("p_updates" "jsonb") TO "authenticated";



GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."company_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."company_relationships_view" TO "authenticated";
GRANT ALL ON TABLE "public"."company_relationships_view" TO "service_role";



GRANT ALL ON TABLE "public"."company_users" TO "authenticated";
GRANT ALL ON TABLE "public"."company_users" TO "service_role";



GRANT ALL ON TABLE "public"."pir_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_requests" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."pir_response_comments" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pir_response_component_materials" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pir_response_components" TO "authenticated";



GRANT ALL ON TABLE "public"."pir_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pir_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_tags" TO "service_role";



GRANT ALL ON TABLE "public"."product_access_view" TO "authenticated";
GRANT ALL ON TABLE "public"."product_access_view" TO "service_role";



GRANT ALL ON TABLE "public"."product_answer_history" TO "authenticated";
GRANT ALL ON TABLE "public"."product_answer_history" TO "service_role";



GRANT ALL ON TABLE "public"."product_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."product_answers" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."question_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."question_sections" TO "service_role";



GRANT ALL ON TABLE "public"."question_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."question_tags" TO "service_role";



GRANT ALL ON TABLE "public"."response_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."response_comments" TO "service_role";



GRANT ALL ON TABLE "public"."response_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."response_flags" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



RESET ALL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow associated users to view comments' AND tablename = 'pir_response_comments' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Allow associated users to view comments" ON "public"."pir_response_comments" FOR SELECT TO "authenticated" USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow authenticated users to insert comments' AND tablename = 'pir_response_comments' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert comments" ON "public"."pir_response_comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Allow insert materials based on parent request company' AND tablename = 'pir_response_component_materials' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Allow insert materials based on parent request company" ON "public"."pir_response_component_materials" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Anyone can view tags' AND tablename = 'tags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Anyone can view tags" ON "public"."tags" FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Authenticated can manage tags' AND tablename = 'tags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Authenticated can manage tags" ON "public"."tags" TO "authenticated" USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can create PIRs' AND tablename = 'pir_requests' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can create PIRs" ON "public"."pir_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can create flags on responses' AND tablename = 'response_flags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can create flags on responses" ON "public"."response_flags" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can link tags to their PIRs' AND tablename = 'pir_tags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can link tags to their PIRs" ON "public"."pir_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can update PIRs they own' AND tablename = 'pir_requests' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can update PIRs they own" ON "public"."pir_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can view approved answers from their suppliers' AND tablename = 'product_answers' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can view approved answers from their suppliers" ON "public"."product_answers" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can view products from their suppliers' AND tablename = 'products' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can view products from their suppliers" ON "public"."products" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can view responses to their PIRs' AND tablename = 'pir_responses' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can view responses to their PIRs" ON "public"."pir_responses" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Enable insert for authenticated users only' AND tablename = 'profiles' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Everyone can view question tags' AND tablename = 'question_tags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Everyone can view question tags" ON "public"."question_tags" FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Everyone can view questions' AND tablename = 'questions' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Everyone can view questions" ON "public"."questions" FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Everyone can view sections' AND tablename = 'question_sections' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Everyone can view sections" ON "public"."question_sections" FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Suppliers can manage their product answers' AND tablename = 'product_answers' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Suppliers can manage their product answers" ON "public"."product_answers" USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Suppliers can manage their products' AND tablename = 'products' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Suppliers can manage their products" ON "public"."products" USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Suppliers can manage their responses' AND tablename = 'pir_responses' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Suppliers can manage their responses" ON "public"."pir_responses" USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Suppliers can update PIRs assigned to them' AND tablename = 'pir_requests' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Suppliers can update PIRs assigned to them" ON "public"."pir_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can delete their own flags' AND tablename = 'response_flags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can delete their own flags" ON "public"."response_flags" FOR DELETE USING (("created_by" = "auth"."uid"()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can update own profile' AND tablename = 'profiles' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can update their own flags' AND tablename = 'response_flags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can update their own flags" ON "public"."response_flags" FOR UPDATE USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view PIRs involving their company' AND tablename = 'pir_requests' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view PIRs involving their company" ON "public"."pir_requests" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view comments on flags they can see' AND tablename = 'response_comments' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view comments on flags they can see" ON "public"."response_comments" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view flags on responses they can access' AND tablename = 'response_flags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view flags on responses they can access" ON "public"."response_flags" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view flags on their responses' AND tablename = 'response_flags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view flags on their responses" ON "public"."response_flags" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view own profile' AND tablename = 'profiles' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view relationships involving their company' AND tablename = 'company_relationships' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view relationships involving their company" ON "public"."company_relationships" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view tags linked to accessible PIRs' AND tablename = 'pir_tags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view tags linked to accessible PIRs" ON "public"."pir_tags" FOR SELECT USING ((EXISTS ( SELECT 1
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'users_create_own_associations' AND tablename = 'company_users' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "users_create_own_associations" ON "public"."company_users" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'users_delete_own_associations' AND tablename = 'company_users' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "users_delete_own_associations" ON "public"."company_users" FOR DELETE USING (("user_id" = "auth"."uid"()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'users_update_own_associations' AND tablename = 'company_users' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "users_update_own_associations" ON "public"."company_users" FOR UPDATE USING (("user_id" = "auth"."uid"()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'users_view_own_associations' AND tablename = 'company_users' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "users_view_own_associations" ON "public"."company_users" FOR SELECT USING (("user_id" = "auth"."uid"()));
    END IF;
END $$;

