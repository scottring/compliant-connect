--
-- PostgreSQL database dump
--

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

-- Including migration: supabase/migrations/20250409205446_remote_schema.sql


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


CREATE EXTENSION IF NOT EXISTS "pgsodium";








ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."flag_status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'rejected'
);


ALTER TYPE "public"."flag_status" OWNER TO "postgres";


CREATE TYPE "public"."pir_status" AS ENUM (
    'draft',
    'submitted',
    'in_review',
    'flagged',
    'approved',
    'rejected'
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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "section_id" "uuid",
    "text" "text" NOT NULL,
    "description" "text",
    "type" "public"."question_type" NOT NULL,
    "options" "jsonb",
    "required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."questions"."section_id" IS 'References the immediate parent section in question_sections.';



COMMENT ON COLUMN "public"."questions"."order_index" IS 'Display order of the question within its parent section.';



CREATE OR REPLACE FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[]) RETURNS "public"."questions"
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


ALTER FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_relationships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "supplier_id" "uuid",
    "status" "public"."relationship_status" DEFAULT 'pending'::"public"."relationship_status" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_relationships" OWNER TO "postgres";


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


ALTER TABLE "public"."company_relationships_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pir_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "customer_id" "uuid",
    "supplier_company_id" "uuid",
    "title" "text",
    "description" "text",
    "status" "public"."pir_status" DEFAULT 'draft'::"public"."pir_status" NOT NULL,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "suggested_product_name" "text"
);


ALTER TABLE "public"."pir_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pir_requests"."suggested_product_name" IS 'Stores the product name suggested by the customer if the product_id is NULL (i.e., product does not exist yet).';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "supplier_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


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
     LEFT JOIN "public"."products" "p" ON (("pir"."product_id" = "p"."id")))
     JOIN "public"."companies" "c1" ON (("pir"."customer_id" = "c1"."id")))
     JOIN "public"."companies" "c2" ON (("pir"."supplier_company_id" = "c2"."id")));


ALTER TABLE "public"."pir_access_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pir_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pir_id" "uuid",
    "question_id" "uuid",
    "answer" "jsonb" NOT NULL,
    "status" "public"."response_status" DEFAULT 'draft'::"public"."response_status" NOT NULL,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pir_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pir_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pir_id" "uuid",
    "tag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pir_tags" OWNER TO "postgres";


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


ALTER TABLE "public"."product_access_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_answer_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_answer_id" "uuid",
    "answer" "jsonb" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_answer_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "question_id" "uuid",
    "current_answer" "jsonb" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_sections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid"
);


ALTER TABLE "public"."question_sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."question_sections" IS 'Stores hierarchical sections for the question bank.';



COMMENT ON COLUMN "public"."question_sections"."parent_id" IS 'References the parent section for nesting.';



CREATE TABLE IF NOT EXISTS "public"."question_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid",
    "tag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."question_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."response_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "flag_id" "uuid",
    "user_id" "uuid",
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."response_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."response_flags" (
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


ALTER TABLE "public"."response_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_question_bank_numbered" AS
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


ALTER TABLE "public"."v_question_bank_numbered" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_question_bank_numbered" IS 'Provides questions with a calculated hierarchical number based on section nesting and order.';



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



CREATE INDEX "idx_question_sections_parent_id" ON "public"."question_sections" USING "btree" ("parent_id");



CREATE INDEX "idx_questions_section_id_order_index" ON "public"."questions" USING "btree" ("section_id", "order_index");



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



CREATE POLICY "Anyone can view tags" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Authenticated can manage tags" ON "public"."tags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Customers can create PIRs" ON "public"."pir_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "pir_requests"."customer_id")))));



CREATE POLICY "Customers can link tags to their PIRs" ON "public"."pir_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_tags"."pir_id")))));



CREATE POLICY "Customers can view approved answers from their suppliers" ON "public"."product_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."products" "p"
     JOIN "public"."company_relationships" "cr" ON (("cr"."supplier_id" = "p"."supplier_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "cr"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("p"."id" = "product_answers"."product_id") AND ("product_answers"."approved_at" IS NOT NULL)))));



CREATE POLICY "Customers can view products from their suppliers" ON "public"."products" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."company_relationships" "cr"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "cr"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cr"."supplier_id" = "products"."supplier_id")))));



CREATE POLICY "Customers can view responses to their PIRs" ON "public"."pir_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."customer_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_responses"."pir_id")))));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Everyone can view question tags" ON "public"."question_tags" FOR SELECT USING (true);



CREATE POLICY "Everyone can view questions" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "Everyone can view sections" ON "public"."question_sections" FOR SELECT USING (true);



CREATE POLICY "Suppliers can manage their product answers" ON "public"."product_answers" USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "p"."supplier_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("p"."id" = "product_answers"."product_id")))));



CREATE POLICY "Suppliers can manage their products" ON "public"."products" USING ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "products"."supplier_id")))));



CREATE POLICY "Suppliers can manage their responses" ON "public"."pir_responses" USING ((EXISTS ( SELECT 1
   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."supplier_company_id")))
  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_responses"."pir_id")))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view PIRs involving their company" ON "public"."pir_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND (("cu"."company_id" = "pir_requests"."customer_id") OR ("cu"."company_id" = "pir_requests"."supplier_company_id") OR (("pir_requests"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir_requests"."product_id")))))))));



CREATE POLICY "Users can view comments on flags they can see" ON "public"."response_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."response_flags" "rf"
     JOIN "public"."pir_responses" "pr" ON (("pr"."id" = "rf"."response_id")))
     JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("rf"."id" = "response_comments"."flag_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir"."product_id")))))))));



CREATE POLICY "Users can view flags on their responses" ON "public"."response_flags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."pir_responses" "pr"
     JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("pr"."id" = "response_flags"."response_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir"."product_id")))))))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view relationships involving their company" ON "public"."company_relationships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."user_id" = "auth"."uid"()) AND (("cu"."company_id" = "company_relationships"."customer_id") OR ("cu"."company_id" = "company_relationships"."supplier_id"))))));



CREATE POLICY "Users can view tags linked to accessible PIRs" ON "public"."pir_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."pir_requests" "pir"
     JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
  WHERE (("pir"."id" = "pir_tags"."pir_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
           FROM "public"."products"
          WHERE ("products"."id" = "pir"."product_id")))))))));



ALTER TABLE "public"."pir_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_answer_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_create_own_associations" ON "public"."company_users" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_delete_own_associations" ON "public"."company_users" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_update_own_associations" ON "public"."company_users" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_view_own_associations" ON "public"."company_users" FOR SELECT USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";


















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



GRANT ALL ON TABLE "public"."pir_access_view" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_access_view" TO "service_role";



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



GRANT SELECT ON TABLE "public"."v_question_bank_numbered" TO "authenticated";



























RESET ALL;



-- Including migration: supabase/migrations/20250410045830_add_pir_requests_update_policy.sql
CREATE POLICY "Suppliers can update PIRs assigned to them"
ON public.pir_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = pir_requests.supplier_company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = pir_requests.supplier_company_id
  )
  -- We could add more specific checks here later if needed,
  -- e.g., restricting which statuses can be set by suppliers.
);


-- Including migration: supabase/migrations/20250410054500_add_response_flags_insert_policy.sql
-- Add INSERT policy for response_flags
CREATE POLICY "Users can insert flags on responses they can access"
ON public.response_flags
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.pir_responses pr
    JOIN public.pir_requests pir ON pir.id = pr.pir_id -- Corrected table name
    JOIN public.company_users cu ON cu.user_id = auth.uid()
    WHERE pr.id = response_flags.response_id -- Check against the row being inserted
      AND (
        cu.company_id = pir.customer_id OR
        cu.company_id = pir.supplier_company_id OR
        (pir.product_id IS NOT NULL AND cu.company_id = (
          SELECT p.supplier_id
          FROM public.products p
          WHERE p.id = pir.product_id -- Corrected table name reference
        ))
      )
  )
);


-- Including migration: supabase/migrations/20250410103533_fix_pir_status_enums.sql
-- Drop existing enums (need to drop dependent objects first)
DROP VIEW IF EXISTS public.pir_access_view;

-- Drop tables that depend on the enums
ALTER TABLE public.pir_responses 
  DROP CONSTRAINT IF EXISTS pir_responses_status_check;

ALTER TABLE public.pir_requests 
  DROP CONSTRAINT IF EXISTS pir_requests_status_check;

-- Drop and recreate pir_status enum with correct values
DROP TYPE IF EXISTS public.pir_status CASCADE;
CREATE TYPE public.pir_status AS ENUM (
    'draft',
    'submitted',
    'in_review',
    'flagged',
    'approved',
    'rejected'
);

-- Drop and recreate response_status enum with correct values
DROP TYPE IF EXISTS public.response_status CASCADE;
CREATE TYPE public.response_status AS ENUM (
    'draft',
    'submitted',
    'flagged',
    'approved'
);

-- Add back the enum constraints and columns
ALTER TABLE public.pir_requests
    ADD COLUMN IF NOT EXISTS status public.pir_status DEFAULT 'draft'::public.pir_status NOT NULL,
    ADD CONSTRAINT pir_requests_status_check CHECK (status::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_review'::text, 'flagged'::text, 'approved'::text, 'rejected'::text]));

ALTER TABLE public.pir_responses
    ADD COLUMN IF NOT EXISTS status public.response_status DEFAULT 'draft'::public.response_status NOT NULL,
    ADD CONSTRAINT pir_responses_status_check CHECK (status::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'flagged'::text, 'approved'::text]));

-- Recreate the pir_access_view
CREATE OR REPLACE VIEW public.pir_access_view AS
SELECT 
    pir.id,
    pir.product_id,
    pir.customer_id,
    pir.supplier_company_id,
    pir.title,
    pir.description,
    pir.status,
    pir.due_date,
    pir.created_at,
    pir.updated_at,
    p.name AS product_name,
    c1.name AS customer_name,
    c2.name AS supplier_name
FROM public.pir_requests pir
LEFT JOIN public.products p ON p.id = pir.product_id
JOIN public.companies c1 ON c1.id = pir.customer_id
JOIN public.companies c2 ON c2.id = pir.supplier_company_id;

-- Add function to validate status transitions
CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status = 'in_review' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_review' AND NEW.status IN ('approved', 'flagged', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'flagged' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'rejected' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for PIR status transitions
DROP TRIGGER IF EXISTS validate_pir_status_transition_trigger ON public.pir_requests;
CREATE TRIGGER validate_pir_status_transition_trigger
  BEFORE UPDATE OF status ON public.pir_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pir_status_transition();

-- Add function to validate response status transitions
CREATE OR REPLACE FUNCTION public.validate_response_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('approved', 'flagged') THEN
    RETURN NEW;
  ELSIF OLD.status = 'flagged' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid response status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for response status transitions
DROP TRIGGER IF EXISTS validate_response_status_transition_trigger ON public.pir_responses;
CREATE TRIGGER validate_response_status_transition_trigger
  BEFORE UPDATE OF status ON public.pir_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_response_status_transition();



-- Including migration: supabase/migrations/20250410103600_fix_response_flags_policy.sql
-- Drop existing policies on response_flags
DROP POLICY IF EXISTS "Users can insert flags on responses they can access" ON public.response_flags;
DROP POLICY IF EXISTS "Allow authenticated full access on response_flags" ON public.response_flags;

-- Create new policies for response_flags
CREATE POLICY "Users can view flags on responses they can access"
ON public.response_flags
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.pir_responses pr
        JOIN public.pir_requests pir ON pir.id = pr.pir_id
        JOIN public.company_users cu ON cu.user_id = auth.uid()
        WHERE pr.id = response_flags.response_id
        AND (
            cu.company_id = pir.customer_id
            OR cu.company_id = pir.supplier_company_id
            OR (
                pir.product_id IS NOT NULL 
                AND cu.company_id = (
                    SELECT supplier_id
                    FROM public.products
                    WHERE id = pir.product_id
                )
            )
        )
    )
);

-- Allow customers to create flags on responses they can access
CREATE POLICY "Customers can create flags on responses"
ON public.response_flags
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.pir_responses pr
        JOIN public.pir_requests pir ON pir.id = pr.pir_id
        JOIN public.company_users cu ON cu.user_id = auth.uid()
        WHERE pr.id = response_flags.response_id
        AND cu.company_id = pir.customer_id
    )
    AND auth.uid() = created_by
);

-- Allow users to update flags they created
CREATE POLICY "Users can update their own flags"
ON public.response_flags
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow users to delete flags they created
CREATE POLICY "Users can delete their own flags"
ON public.response_flags
FOR DELETE
USING (created_by = auth.uid()); 


-- Including migration: supabase/migrations/20250410163913_remote_schema.sql
revoke delete on table "public"."companies" from "anon";

revoke insert on table "public"."companies" from "anon";

revoke references on table "public"."companies" from "anon";

revoke select on table "public"."companies" from "anon";

revoke trigger on table "public"."companies" from "anon";

revoke truncate on table "public"."companies" from "anon";

revoke update on table "public"."companies" from "anon";

revoke delete on table "public"."company_relationships" from "anon";

revoke insert on table "public"."company_relationships" from "anon";

revoke references on table "public"."company_relationships" from "anon";

revoke select on table "public"."company_relationships" from "anon";

revoke trigger on table "public"."company_relationships" from "anon";

revoke truncate on table "public"."company_relationships" from "anon";

revoke update on table "public"."company_relationships" from "anon";

revoke delete on table "public"."company_users" from "anon";

revoke insert on table "public"."company_users" from "anon";

revoke references on table "public"."company_users" from "anon";

revoke select on table "public"."company_users" from "anon";

revoke trigger on table "public"."company_users" from "anon";

revoke truncate on table "public"."company_users" from "anon";

revoke update on table "public"."company_users" from "anon";

revoke delete on table "public"."pir_requests" from "anon";

revoke insert on table "public"."pir_requests" from "anon";

revoke references on table "public"."pir_requests" from "anon";

revoke select on table "public"."pir_requests" from "anon";

revoke trigger on table "public"."pir_requests" from "anon";

revoke truncate on table "public"."pir_requests" from "anon";

revoke update on table "public"."pir_requests" from "anon";

revoke delete on table "public"."pir_responses" from "anon";

revoke insert on table "public"."pir_responses" from "anon";

revoke references on table "public"."pir_responses" from "anon";

revoke select on table "public"."pir_responses" from "anon";

revoke trigger on table "public"."pir_responses" from "anon";

revoke truncate on table "public"."pir_responses" from "anon";

revoke update on table "public"."pir_responses" from "anon";

revoke delete on table "public"."pir_tags" from "anon";

revoke insert on table "public"."pir_tags" from "anon";

revoke references on table "public"."pir_tags" from "anon";

revoke select on table "public"."pir_tags" from "anon";

revoke trigger on table "public"."pir_tags" from "anon";

revoke truncate on table "public"."pir_tags" from "anon";

revoke update on table "public"."pir_tags" from "anon";

revoke delete on table "public"."product_answer_history" from "anon";

revoke insert on table "public"."product_answer_history" from "anon";

revoke references on table "public"."product_answer_history" from "anon";

revoke select on table "public"."product_answer_history" from "anon";

revoke trigger on table "public"."product_answer_history" from "anon";

revoke truncate on table "public"."product_answer_history" from "anon";

revoke update on table "public"."product_answer_history" from "anon";

revoke delete on table "public"."product_answers" from "anon";

revoke insert on table "public"."product_answers" from "anon";

revoke references on table "public"."product_answers" from "anon";

revoke select on table "public"."product_answers" from "anon";

revoke trigger on table "public"."product_answers" from "anon";

revoke truncate on table "public"."product_answers" from "anon";

revoke update on table "public"."product_answers" from "anon";

revoke delete on table "public"."products" from "anon";

revoke insert on table "public"."products" from "anon";

revoke references on table "public"."products" from "anon";

revoke select on table "public"."products" from "anon";

revoke trigger on table "public"."products" from "anon";

revoke truncate on table "public"."products" from "anon";

revoke update on table "public"."products" from "anon";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."question_sections" from "anon";

revoke insert on table "public"."question_sections" from "anon";

revoke references on table "public"."question_sections" from "anon";

revoke select on table "public"."question_sections" from "anon";

revoke trigger on table "public"."question_sections" from "anon";

revoke truncate on table "public"."question_sections" from "anon";

revoke update on table "public"."question_sections" from "anon";

revoke delete on table "public"."question_tags" from "anon";

revoke insert on table "public"."question_tags" from "anon";

revoke references on table "public"."question_tags" from "anon";

revoke select on table "public"."question_tags" from "anon";

revoke trigger on table "public"."question_tags" from "anon";

revoke truncate on table "public"."question_tags" from "anon";

revoke update on table "public"."question_tags" from "anon";

revoke delete on table "public"."questions" from "anon";

revoke insert on table "public"."questions" from "anon";

revoke references on table "public"."questions" from "anon";

revoke select on table "public"."questions" from "anon";

revoke trigger on table "public"."questions" from "anon";

revoke truncate on table "public"."questions" from "anon";

revoke update on table "public"."questions" from "anon";

revoke delete on table "public"."response_comments" from "anon";

revoke insert on table "public"."response_comments" from "anon";

revoke references on table "public"."response_comments" from "anon";

revoke select on table "public"."response_comments" from "anon";

revoke trigger on table "public"."response_comments" from "anon";

revoke truncate on table "public"."response_comments" from "anon";

revoke update on table "public"."response_comments" from "anon";

revoke delete on table "public"."response_flags" from "anon";

revoke insert on table "public"."response_flags" from "anon";

revoke references on table "public"."response_flags" from "anon";

revoke select on table "public"."response_flags" from "anon";

revoke trigger on table "public"."response_flags" from "anon";

revoke truncate on table "public"."response_flags" from "anon";

revoke update on table "public"."response_flags" from "anon";

revoke delete on table "public"."tags" from "anon";

revoke insert on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "anon";

revoke select on table "public"."tags" from "anon";

revoke trigger on table "public"."tags" from "anon";

revoke truncate on table "public"."tags" from "anon";

revoke update on table "public"."tags" from "anon";

create or replace view "public"."v_sections_hierarchy" as  WITH RECURSIVE section_hierarchy AS (
         SELECT question_sections.id,
            question_sections.name,
            question_sections.description,
            question_sections.order_index,
            question_sections.parent_id,
            question_sections.created_at,
            question_sections.updated_at,
            1 AS level,
            (question_sections.order_index)::text AS path_string,
            question_sections.name AS full_path_name
           FROM question_sections
          WHERE (question_sections.parent_id IS NULL)
        UNION ALL
         SELECT qs.id,
            qs.name,
            qs.description,
            qs.order_index,
            qs.parent_id,
            qs.created_at,
            qs.updated_at,
            (sh.level + 1),
            ((sh.path_string || '.'::text) || (qs.order_index)::text),
            ((sh.full_path_name || ' > '::text) || qs.name)
           FROM (question_sections qs
             JOIN section_hierarchy sh ON ((qs.parent_id = sh.id)))
        )
 SELECT section_hierarchy.id,
    section_hierarchy.name,
    section_hierarchy.description,
    section_hierarchy.order_index,
    section_hierarchy.parent_id,
    section_hierarchy.created_at,
    section_hierarchy.updated_at,
    section_hierarchy.level,
    section_hierarchy.path_string,
    section_hierarchy.full_path_name
   FROM section_hierarchy
  ORDER BY section_hierarchy.path_string;


create or replace view "public"."v_question_bank_numbered" as  WITH RECURSIVE section_hierarchy AS (
         SELECT question_sections.id,
            question_sections.name,
            question_sections.order_index,
            question_sections.parent_id,
            1 AS level,
            (question_sections.order_index)::text AS path_string
           FROM question_sections
          WHERE (question_sections.parent_id IS NULL)
        UNION ALL
         SELECT qs.id,
            qs.name,
            qs.order_index,
            qs.parent_id,
            (sh_1.level + 1),
            ((sh_1.path_string || '.'::text) || (qs.order_index)::text)
           FROM (question_sections qs
             JOIN section_hierarchy sh_1 ON ((qs.parent_id = sh_1.id)))
        )
 SELECT q.id AS question_id,
    q.text AS question_text,
    q.description AS question_description,
    q.type AS question_type,
    q.required AS question_required,
    q.options AS question_options,
    q.created_at AS question_created_at,
    q.updated_at AS question_updated_at,
    sh.id AS section_id,
    sh.name AS section_name,
        CASE
            WHEN (q.id IS NOT NULL) THEN ((sh.path_string || '.'::text) || (row_number() OVER (PARTITION BY sh.id ORDER BY q.order_index))::text)
            ELSE sh.path_string
        END AS hierarchical_number,
    sh.level AS section_level,
    COALESCE(q.order_index, 0) AS question_order_index
   FROM (section_hierarchy sh
     LEFT JOIN questions q ON ((q.section_id = sh.id)))
  ORDER BY sh.path_string, COALESCE(q.order_index, 0);






-- Including migration: supabase/migrations/20250410233707_fix_pir_update_policy.sql
-- Rename the policy for clarity
ALTER POLICY "Suppliers can update PIRs assigned to them" ON public.pir_requests
RENAME TO "Allow suppliers and customers to update assigned PIRs";

-- Update the USING expression to allow customers
ALTER POLICY "Allow suppliers and customers to update assigned PIRs" ON public.pir_requests
USING (
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.supplier_company_id
  )) OR
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id -- Corrected customer check
  ))
);

-- Update the WITH CHECK expression to allow customers
ALTER POLICY "Allow suppliers and customers to update assigned PIRs" ON public.pir_requests
WITH CHECK (
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.supplier_company_id
  )) OR
  (EXISTS (
     SELECT 1
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id -- Corrected customer check
  ))
);


-- Including migration: supabase/migrations/20250411000000_fix_question_bank_view_permissions.sql
-- Grant select permission on the view to authenticated users
grant select on "public"."v_question_bank_numbered" to authenticated; 


-- Including migration: supabase/migrations/20250411080143_add_list_table_question_type.sql
ALTER TYPE public.question_type ADD VALUE 'list_table';


-- Including migration: supabase/migrations/20250411083200_add_question_tags_insert_policy.sql
-- Enable RLS (just in case, though the error implies it's already enabled)
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert links between questions and tags
CREATE POLICY "Allow authenticated insert for question_tags"
ON public.question_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant usage on the table to authenticated role (might be missing)
GRANT INSERT ON TABLE public.question_tags TO authenticated;


-- Including migration: supabase/migrations/20250411092200_create_component_material_response_tables.sql
-- Migration to create tables for storing structured component/material responses

-- Table to store the main component entries for a specific PIR response
CREATE TABLE public.pir_response_components (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pir_response_id uuid NOT NULL REFERENCES public.pir_responses(id) ON DELETE CASCADE,
    component_name text,
    "position" text, -- Using quotes as position might be a reserved word
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes for frequent lookups
CREATE INDEX idx_pir_response_components_response_id ON public.pir_response_components(pir_response_id);

-- Enable RLS
ALTER TABLE public.pir_response_components ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed based on your access patterns)
-- Allow users to see components linked to responses they can access (assuming a function `can_user_read_pir_response(response_id uuid)`)
-- CREATE POLICY "Allow read access based on parent response" ON public.pir_response_components FOR SELECT USING (can_user_read_pir_response(pir_response_id));
-- Allow users to insert components if they can update the parent response (assuming `can_user_update_pir_response(response_id uuid)`)
-- CREATE POLICY "Allow insert access based on parent response" ON public.pir_response_components FOR INSERT WITH CHECK (can_user_update_pir_response(pir_response_id));
-- Allow users to update/delete components if they can update the parent response
-- CREATE POLICY "Allow update access based on parent response" ON public.pir_response_components FOR UPDATE USING (can_user_update_pir_response(pir_response_id));
-- CREATE POLICY "Allow delete access based on parent response" ON public.pir_response_components FOR DELETE USING (can_user_update_pir_response(pir_response_id));
-- NOTE: RLS policies above are commented out as the helper functions likely don't exist yet. They need proper implementation.


-- Table to store material details linked to a specific component entry
CREATE TABLE public.pir_response_component_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id uuid NOT NULL REFERENCES public.pir_response_components(id) ON DELETE CASCADE,
    material_name text,
    percentage numeric,
    recyclable text,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes for frequent lookups
CREATE INDEX idx_pir_response_component_materials_component_id ON public.pir_response_component_materials(component_id);

-- Enable RLS
ALTER TABLE public.pir_response_component_materials ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust as needed)
-- Allow users to see materials linked to components they can access (requires joining to components and checking parent response access)
-- CREATE POLICY "Allow read access based on parent component" ON public.pir_response_component_materials FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_read_pir_response(c.pir_response_id)
--   ));
-- Allow users to insert materials if they can update the parent component/response
-- CREATE POLICY "Allow insert access based on parent component" ON public.pir_response_component_materials FOR INSERT
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_update_pir_response(c.pir_response_id)
--   ));
-- Allow users to update/delete materials if they can update the parent component/response
-- CREATE POLICY "Allow update access based on parent component" ON public.pir_response_component_materials FOR UPDATE
--   USING (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_update_pir_response(c.pir_response_id)
--   ));
-- CREATE POLICY "Allow delete access based on parent component" ON public.pir_response_component_materials FOR DELETE
--   USING (EXISTS (
--     SELECT 1 FROM public.pir_response_components c
--     WHERE c.id = component_id AND can_user_update_pir_response(c.pir_response_id)
--   ));
-- NOTE: RLS policies above are commented out.


-- Optional: Trigger to update the 'updated_at' timestamp on modification
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pir_response_components_updated_at
BEFORE UPDATE ON public.pir_response_components
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pir_response_component_materials_updated_at
BEFORE UPDATE ON public.pir_response_component_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant usage on the new tables to authenticated users (adjust role as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pir_response_components TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pir_response_component_materials TO authenticated;

-- Grant usage on sequences if any were implicitly created (though default uuid doesn't use sequences)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- Including migration: supabase/migrations/20250411132836_add_component_material_list_question_type.sql
-- Add 'component_material_list' to the question_type enum

ALTER TYPE public.question_type ADD VALUE 'component_material_list';


-- Including migration: supabase/migrations/20250411135827_add_pir_response_components_insert_policy.sql
-- Function to check if the current user is a member or admin of a given company
CREATE OR REPLACE FUNCTION public.is_company_member_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = p_company_id
      AND cu.role IN ('admin', 'member') -- Adjust roles as needed
  );
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_company_member_or_admin(uuid) TO authenticated;

-- Add RLS policies for pir_response_components

-- Allow read if user is member of the associated customer or supplier company
CREATE POLICY "Allow read components based on parent request company"
ON public.pir_response_components
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow insert if user is member of the associated customer or supplier company
CREATE POLICY "Allow insert components based on parent request company"
ON public.pir_response_components
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow update if user is member of the associated customer or supplier company
CREATE POLICY "Allow update components based on parent request company"
ON public.pir_response_components
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow delete if user is member of the associated customer or supplier company
CREATE POLICY "Allow delete components based on parent request company"
ON public.pir_response_components
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    WHERE res.id = pir_response_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);


-- Add RLS policies for pir_response_component_materials

-- Allow read if user is member of the associated customer or supplier company
CREATE POLICY "Allow read materials based on parent request company"
ON public.pir_response_component_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    JOIN public.pir_response_components comp ON res.id = comp.pir_response_id
    WHERE comp.id = component_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow insert if user is member of the associated customer or supplier company
CREATE POLICY "Allow insert materials based on parent request company"
ON public.pir_response_component_materials
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    JOIN public.pir_response_components comp ON res.id = comp.pir_response_id
    WHERE comp.id = component_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow update if user is member of the associated customer or supplier company
CREATE POLICY "Allow update materials based on parent request company"
ON public.pir_response_component_materials
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    JOIN public.pir_response_components comp ON res.id = comp.pir_response_id
    WHERE comp.id = component_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    JOIN public.pir_response_components comp ON res.id = comp.pir_response_id
    WHERE comp.id = component_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);

-- Allow delete if user is member of the associated customer or supplier company
CREATE POLICY "Allow delete materials based on parent request company"
ON public.pir_response_component_materials
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    JOIN public.pir_response_components comp ON res.id = comp.pir_response_id
    WHERE comp.id = component_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);


-- Including migration: supabase/migrations/20250411140021_create_is_company_member_or_admin_function.sql
-- Function to check if the current user is a member or admin of a given company
CREATE OR REPLACE FUNCTION public.is_company_member_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = p_company_id
      AND cu.role IN ('admin', 'member') -- Adjust roles as needed
  );
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_company_member_or_admin(uuid) TO authenticated;


-- Including migration: supabase/migrations/20250411155042_add_pir_response_components_select_policy.sql
-- Enable RLS for the table if not already enabled (idempotent)
ALTER TABLE public.pir_response_components ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (good practice for idempotency)
DROP POLICY IF EXISTS "Allow customer members to read components" ON public.pir_response_components;

-- Create the SELECT policy
CREATE POLICY "Allow customer members to read components"
ON public.pir_response_components
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM pir_responses pr
    JOIN pir_requests pir ON pr.pir_id = pir.id
    WHERE pr.id = pir_response_components.pir_response_id
    AND is_company_member_or_admin(pir.customer_id) -- Check if user is member of the customer company
  )
);


-- Including migration: supabase/migrations/20250411155535_temp_disable_components_rls.sql
-- Temporarily disable RLS on pir_response_components for debugging
ALTER TABLE public.pir_response_components DISABLE ROW LEVEL SECURITY;

-- Note: Remember to re-enable RLS and fix the policy later!
-- ALTER TABLE public.pir_response_components ENABLE ROW LEVEL SECURITY;


-- Including migration: supabase/migrations/20250411155831_temp_disable_materials_rls.sql
-- Temporarily disable RLS on pir_response_component_materials for debugging
ALTER TABLE public.pir_response_component_materials DISABLE ROW LEVEL SECURITY;

-- Note: Remember to re-enable RLS and add a proper policy later!
-- ALTER TABLE public.pir_response_component_materials ENABLE ROW LEVEL SECURITY;


-- Including migration: supabase/migrations/20250411163010_reenable_components_rls.sql
-- Re-enable RLS on pir_response_components
-- The correct SELECT policy was already added in migration 20250411155042
ALTER TABLE public.pir_response_components ENABLE ROW LEVEL SECURITY;


-- Including migration: supabase/migrations/20250411163025_add_materials_select_policy.sql
-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Allow customer members to read materials" ON public.pir_response_component_materials;

-- Create the SELECT policy for materials
CREATE POLICY "Allow customer members to read materials"
ON public.pir_response_component_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM pir_response_components prc
    JOIN pir_responses pr ON prc.pir_response_id = pr.id
    JOIN pir_requests pir ON pr.pir_id = pir.id
    WHERE prc.id = pir_response_component_materials.component_id
    AND is_company_member_or_admin(pir.customer_id) -- Check if user is member of the customer company
  )
);


-- Including migration: supabase/migrations/20250411163036_reenable_materials_rls.sql
-- Re-enable RLS on pir_response_component_materials
-- The correct SELECT policy was added in the previous migration (20250411163025)
ALTER TABLE public.pir_response_component_materials ENABLE ROW LEVEL SECURITY;


-- Including migration: supabase/migrations/20250411163435_temp_modify_components_policy_check.sql
-- Temporarily modify the SELECT policy on pir_response_components for debugging
-- Replace the specific company check with a general authenticated user check

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow customer members to read components" ON public.pir_response_components;

-- Create a temporary, broader SELECT policy
CREATE POLICY "TEMP - Allow authenticated to read components"
ON public.pir_response_components
FOR SELECT
USING (
  auth.role() = 'authenticated' -- Allow any logged-in user (temporary)
);

-- Note: Remember to revert this policy later!
-- DROP POLICY IF EXISTS "TEMP - Allow authenticated to read components" ON public.pir_response_components;
-- Recreate original policy:
-- CREATE POLICY "Allow customer members to read components"
-- ON public.pir_response_components
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM pir_responses pr
--     JOIN pir_requests pir ON pr.pir_id = pir.id
--     WHERE pr.id = pir_response_components.pir_response_id
--     AND is_company_member_or_admin(pir.customer_id)
--   )
-- );


-- Including migration: supabase/migrations/20250411165712_revert_temp_components_policy.sql
-- Revert the temporary modification to the SELECT policy on pir_response_components

-- Drop the temporary policy
DROP POLICY IF EXISTS "TEMP - Allow authenticated to read components" ON public.pir_response_components;

-- Recreate the original policy (from migration 20250411155042)
-- Drop existing policy first (in case it somehow still exists)
DROP POLICY IF EXISTS "Allow customer members to read components" ON public.pir_response_components;

-- Create the original SELECT policy
CREATE POLICY "Allow customer members to read components"
ON public.pir_response_components
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM pir_responses pr
    JOIN pir_requests pir ON pr.pir_id = pir.id
    WHERE pr.id = pir_response_components.pir_response_id
    AND is_company_member_or_admin(pir.customer_id) -- Check if user is member of the customer company
  )
);


-- Including migration: supabase/migrations/20250411170040_temp_simplify_materials_policy.sql
-- Temporarily simplify the SELECT policy on pir_response_component_materials for debugging

-- Drop the existing policy first
DROP POLICY IF EXISTS "Allow customer members to read materials" ON public.pir_response_component_materials;

-- Create a temporary, simpler SELECT policy
CREATE POLICY "TEMP - Allow read based on parent component access"
ON public.pir_response_component_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pir_response_components prc
    WHERE prc.id = pir_response_component_materials.component_id
    -- Implicitly relies on the RLS policy of pir_response_components allowing SELECT on prc.id
  )
);

-- Note: Remember this needs to be reverted later!
-- Original policy was defined in 20250411163025_add_materials_select_policy.sql


-- Including migration: supabase/migrations/20250411170319_fix_is_company_member_function.sql
-- Function to check if the current user is a member, admin, or owner of a given company
CREATE OR REPLACE FUNCTION public.is_company_member_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = p_company_id
      AND cu.role IN ('admin', 'member', 'owner') -- Added 'owner' role
  );
$$;

-- Re-grant execute permission just in case
GRANT EXECUTE ON FUNCTION public.is_company_member_or_admin(uuid) TO authenticated;


-- Including migration: supabase/migrations/20250411170453_restore_original_materials_policy.sql
-- Restore the original SELECT policy on pir_response_component_materials

-- Drop the temporary policy
DROP POLICY IF EXISTS "TEMP - Allow read based on parent component access" ON public.pir_response_component_materials;

-- Recreate the original policy (from migration 20250411163025)
-- Drop existing policy first (for idempotency, in case it somehow still exists)
DROP POLICY IF EXISTS "Allow customer members to read materials" ON public.pir_response_component_materials;

-- Create the original SELECT policy for materials
CREATE POLICY "Allow customer members to read materials"
ON public.pir_response_component_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM pir_response_components prc
    JOIN pir_responses pr ON prc.pir_response_id = pr.id
    JOIN pir_requests pir ON pr.pir_id = pir.id
    WHERE prc.id = pir_response_component_materials.component_id
    AND is_company_member_or_admin(pir.customer_id) -- Use the now-fixed function
  )
);


-- Including migration: supabase/migrations/20250411183337_remote_schema.sql
drop trigger if exists "update_pir_response_component_materials_updated_at" on "public"."pir_response_component_materials";

drop trigger if exists "update_pir_response_components_updated_at" on "public"."pir_response_components";

drop policy "Allow suppliers and customers to update assigned PIRs" on "public"."pir_requests";



--drop policy "Allow associated users to view comments" on "public"."pir_response_comments";

--drop policy "Allow authenticated users to insert comments" on "public"."pir_response_comments";

drop policy "Allow customer members to read materials" on "public"."pir_response_component_materials";

drop policy "Allow delete materials based on parent request company" on "public"."pir_response_component_materials";

drop policy "Allow insert materials based on parent request company" on "public"."pir_response_component_materials";

drop policy "Allow read materials based on parent request company" on "public"."pir_response_component_materials";

drop policy "Allow update materials based on parent request company" on "public"."pir_response_component_materials";

drop policy "Allow customer members to read components" on "public"."pir_response_components";

drop policy "Allow delete components based on parent request company" on "public"."pir_response_components";

drop policy "Allow insert components based on parent request company" on "public"."pir_response_components";

drop policy "Allow read components based on parent request company" on "public"."pir_response_components";

drop policy "Allow update components based on parent request company" on "public"."pir_response_components";

drop policy "Allow authenticated insert for question_tags" on "public"."question_tags";

--revoke delete on table "public"."pir_response_comments" from "anon";

--revoke insert on table "public"."pir_response_comments" from "anon";

--revoke references on table "public"."pir_response_comments" from "anon";

--revoke select on table "public"."pir_response_comments" from "anon";

--revoke trigger on table "public"."pir_response_comments" from "anon";

--revoke truncate on table "public"."pir_response_comments" from "anon";

--revoke update on table "public"."pir_response_comments" from "anon";

--revoke delete on table "public"."pir_response_comments" from "authenticated";

--revoke insert on table "public"."pir_response_comments" from "authenticated";

--revoke references on table "public"."pir_response_comments" from "authenticated";

--revoke select on table "public"."pir_response_comments" from "authenticated";

--revoke trigger on table "public"."pir_response_comments" from "authenticated";

--revoke truncate on table "public"."pir_response_comments" from "authenticated";

--revoke update on table "public"."pir_response_comments" from "authenticated";

--revoke delete on table "public"."pir_response_comments" from "service_role";

--revoke insert on table "public"."pir_response_comments" from "service_role";

--revoke references on table "public"."pir_response_comments" from "service_role";

--revoke select on table "public"."pir_response_comments" from "service_role";

--revoke trigger on table "public"."pir_response_comments" from "service_role";

--revoke truncate on table "public"."pir_response_comments" from "service_role";

--revoke update on table "public"."pir_response_comments" from "service_role";

revoke delete on table "public"."pir_response_component_materials" from "anon";

revoke insert on table "public"."pir_response_component_materials" from "anon";

revoke references on table "public"."pir_response_component_materials" from "anon";

revoke select on table "public"."pir_response_component_materials" from "anon";

revoke trigger on table "public"."pir_response_component_materials" from "anon";

revoke truncate on table "public"."pir_response_component_materials" from "anon";

revoke update on table "public"."pir_response_component_materials" from "anon";

revoke delete on table "public"."pir_response_component_materials" from "authenticated";

revoke insert on table "public"."pir_response_component_materials" from "authenticated";

revoke references on table "public"."pir_response_component_materials" from "authenticated";

revoke select on table "public"."pir_response_component_materials" from "authenticated";

revoke trigger on table "public"."pir_response_component_materials" from "authenticated";

revoke truncate on table "public"."pir_response_component_materials" from "authenticated";

revoke update on table "public"."pir_response_component_materials" from "authenticated";

revoke delete on table "public"."pir_response_component_materials" from "service_role";

revoke insert on table "public"."pir_response_component_materials" from "service_role";

revoke references on table "public"."pir_response_component_materials" from "service_role";

revoke select on table "public"."pir_response_component_materials" from "service_role";

revoke trigger on table "public"."pir_response_component_materials" from "service_role";

revoke truncate on table "public"."pir_response_component_materials" from "service_role";

revoke update on table "public"."pir_response_component_materials" from "service_role";

revoke delete on table "public"."pir_response_components" from "anon";

revoke insert on table "public"."pir_response_components" from "anon";

revoke references on table "public"."pir_response_components" from "anon";

revoke select on table "public"."pir_response_components" from "anon";

revoke trigger on table "public"."pir_response_components" from "anon";

revoke truncate on table "public"."pir_response_components" from "anon";

revoke update on table "public"."pir_response_components" from "anon";

revoke delete on table "public"."pir_response_components" from "authenticated";

revoke insert on table "public"."pir_response_components" from "authenticated";

revoke references on table "public"."pir_response_components" from "authenticated";

revoke select on table "public"."pir_response_components" from "authenticated";

revoke trigger on table "public"."pir_response_components" from "authenticated";

revoke truncate on table "public"."pir_response_components" from "authenticated";

revoke update on table "public"."pir_response_components" from "authenticated";

revoke delete on table "public"."pir_response_components" from "service_role";

revoke insert on table "public"."pir_response_components" from "service_role";

revoke references on table "public"."pir_response_components" from "service_role";

revoke select on table "public"."pir_response_components" from "service_role";

revoke trigger on table "public"."pir_response_components" from "service_role";

revoke truncate on table "public"."pir_response_components" from "service_role";

revoke update on table "public"."pir_response_components" from "service_role";

--alter table "public"."pir_response_comments" drop constraint "pir_response_comments_response_id_fkey";

--alter table "public"."pir_response_comments" drop constraint "pir_response_comments_user_id_fkey";

alter table "public"."pir_response_component_materials" drop constraint "pir_response_component_materials_component_id_fkey";

alter table "public"."pir_response_components" drop constraint "pir_response_components_pir_response_id_fkey";

drop function if exists "public"."is_company_member_or_admin"(p_company_id uuid);

drop function if exists "public"."update_updated_at_column"();

drop view if exists "public"."v_sections_hierarchy";

drop view if exists "public"."v_question_bank_numbered";

--alter table "public"."pir_response_comments" drop constraint "pir_response_comments_pkey";

alter table "public"."pir_response_component_materials" drop constraint "pir_response_component_materials_pkey";

alter table "public"."pir_response_components" drop constraint "pir_response_components_pkey";

--drop index if exists "public"."idx_pir_response_comments_response_id";

--drop index if exists "public"."idx_pir_response_comments_user_id";

drop index if exists "public"."idx_pir_response_component_materials_component_id";

drop index if exists "public"."idx_pir_response_components_response_id";

--drop index if exists "public"."pir_response_comments_pkey";

drop index if exists "public"."pir_response_component_materials_pkey";

drop index if exists "public"."pir_response_components_pkey";

--drop table "public"."pir_response_comments";

drop table "public"."pir_response_component_materials";

drop table "public"."pir_response_components";

alter type "public"."question_type" rename to "question_type__old_version_to_be_dropped";

create type "public"."question_type" as enum ('text', 'number', 'boolean', 'single_select', 'multi_select', 'date', 'file', 'LIST_TABLE');

alter table "public"."questions" alter column type type "public"."question_type" using type::text::"public"."question_type";

drop type "public"."question_type__old_version_to_be_dropped" cascade;

create or replace view "public"."v_question_bank_numbered" as  WITH RECURSIVE section_hierarchy AS (
         SELECT question_sections.id,
            question_sections.name,
            question_sections.order_index,
            question_sections.parent_id,
            1 AS level,
            (question_sections.order_index)::text AS path_string
           FROM question_sections
          WHERE (question_sections.parent_id IS NULL)
        UNION ALL
         SELECT qs.id,
            qs.name,
            qs.order_index,
            qs.parent_id,
            (sh_1.level + 1),
            ((sh_1.path_string || '.'::text) || (qs.order_index)::text)
           FROM (question_sections qs
             JOIN section_hierarchy sh_1 ON ((qs.parent_id = sh_1.id)))
       )
 SELECT q.id AS question_id,
    q.text AS question_text,
    q.description AS question_description,
    q.type AS question_type,
    q.required AS question_required,
    q.options AS question_options,
    q.created_at AS question_created_at,
    q.updated_at AS question_updated_at,
    sh.id AS section_id,
    sh.name AS section_name,
    ((sh.path_string || '.'::text) || (row_number() OVER (PARTITION BY sh.id ORDER BY q.order_index))::text) AS hierarchical_number,
    sh.level AS section_level,
    q.order_index AS question_order_index
   FROM (questions q
     JOIN section_hierarchy sh ON ((q.section_id = sh.id)))
  ORDER BY sh.path_string, q.order_index;


create policy "Suppliers can update PIRs assigned to them"
on "public"."pir_requests"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.user_id = auth.uid()) AND (cu.company_id = pir_requests.supplier_company_id)))))
with check ((EXISTS ( SELECT 1
   FROM company_users cu
  WHERE ((cu.user_id = auth.uid()) AND (cu.company_id = pir_requests.supplier_company_id)))));



-- Including migration: supabase/migrations/20250412115056_remote_schema.sql
drop view if exists "public"."v_question_bank_numbered";

alter type "public"."question_type" rename to "question_type__old_version_to_be_dropped";

create type "public"."question_type" as enum ('text', 'number', 'boolean', 'single_select', 'multi_select', 'date', 'file', 'LIST_TABLE', 'list_table', 'component_material_list');

create table "public"."pir_response_component_materials" (
    "id" uuid not null default gen_random_uuid(),
    "component_id" uuid not null,
    "material_name" text,
    "percentage" numeric,
    "recyclable" text,
    "order_index" integer not null default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."pir_response_component_materials" enable row level security;

create table "public"."pir_response_components" (
    "id" uuid not null default gen_random_uuid(),
    "pir_response_id" uuid not null,
    "component_name" text,
    "position" text,
    "order_index" integer not null default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."questions" alter column type type "public"."question_type" using type::text::"public"."question_type";

drop type "public"."question_type__old_version_to_be_dropped";

CREATE INDEX idx_pir_response_component_materials_component_id ON public.pir_response_component_materials USING btree (component_id);

CREATE INDEX idx_pir_response_components_response_id ON public.pir_response_components USING btree (pir_response_id);

CREATE UNIQUE INDEX pir_response_component_materials_pkey ON public.pir_response_component_materials USING btree (id);

CREATE UNIQUE INDEX pir_response_components_pkey ON public.pir_response_components USING btree (id);

alter table "public"."pir_response_component_materials" add constraint "pir_response_component_materials_pkey" PRIMARY KEY using index "pir_response_component_materials_pkey";

alter table "public"."pir_response_components" add constraint "pir_response_components_pkey" PRIMARY KEY using index "pir_response_components_pkey";

alter table "public"."pir_response_component_materials" add constraint "pir_response_component_materials_component_id_fkey" FOREIGN KEY (component_id) REFERENCES pir_response_components(id) ON DELETE CASCADE not valid;

alter table "public"."pir_response_component_materials" validate constraint "pir_response_component_materials_component_id_fkey";

alter table "public"."pir_response_components" add constraint "pir_response_components_pir_response_id_fkey" FOREIGN KEY (pir_response_id) REFERENCES pir_responses(id) ON DELETE CASCADE not valid;

alter table "public"."pir_response_components" validate constraint "pir_response_components_pir_response_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_question_with_tags(p_subsection_id uuid, p_text text, p_description text, p_type question_type, p_required boolean, p_options jsonb, p_tag_ids uuid[])
 RETURNS questions
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_question_order(p_updates jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.questions q
  SET order_index = (elem->>'order_index')::integer
  FROM jsonb_array_elements(p_updates) AS elem
  WHERE q.id = (elem->>'question_id')::uuid;

  -- Optional: Add error handling or logging if needed
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$function$
;

create or replace view "public"."v_question_bank_numbered" as  WITH RECURSIVE section_hierarchy AS (
         SELECT question_sections.id,
            question_sections.name,
            question_sections.order_index,
            question_sections.parent_id,
            1 AS level,
            (question_sections.order_index)::text AS path_string
           FROM question_sections
          WHERE (question_sections.parent_id IS NULL)
        UNION ALL
         SELECT qs.id,
            qs.name,
            qs.order_index,
            qs.parent_id,
            (sh_1.level + 1),
            ((sh_1.path_string || '.'::text) || (qs.order_index)::text)
           FROM (question_sections qs
             JOIN section_hierarchy sh_1 ON ((qs.parent_id = sh_1.id)))
        )
 SELECT q.id AS question_id,
    q.text AS question_text,
    q.description AS question_description,
    q.type AS question_type,
    q.required AS question_required,
    q.options AS question_options,
    q.created_at AS question_created_at,
    q.updated_at AS question_updated_at,
    sh.id AS section_id,
    sh.name AS section_name,
    ((sh.path_string || '.'::text) || (row_number() OVER (PARTITION BY sh.id ORDER BY q.order_index))::text) AS hierarchical_number,
    sh.level AS section_level,
    q.order_index AS question_order_index
   FROM (questions q
     JOIN section_hierarchy sh ON ((q.section_id = sh.id)))
  ORDER BY sh.path_string, q.order_index;


grant delete on table "public"."pir_response_component_materials" to "authenticated";

grant insert on table "public"."pir_response_component_materials" to "authenticated";

grant select on table "public"."pir_response_component_materials" to "authenticated";

grant update on table "public"."pir_response_component_materials" to "authenticated";

grant delete on table "public"."pir_response_components" to "authenticated";

grant insert on table "public"."pir_response_components" to "authenticated";

grant select on table "public"."pir_response_components" to "authenticated";

grant update on table "public"."pir_response_components" to "authenticated";

CREATE TRIGGER update_pir_response_component_materials_updated_at BEFORE UPDATE ON public.pir_response_component_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pir_response_components_updated_at BEFORE UPDATE ON public.pir_response_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();





-- Including migration: supabase/migrations/20250412143820_combine_comments_table_and_policy.sql
-- Create the pir_response_comments table
CREATE TABLE public.pir_response_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    response_id uuid NOT NULL REFERENCES public.pir_responses(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_pir_response_comments_response_id ON public.pir_response_comments(response_id);
CREATE INDEX idx_pir_response_comments_user_id ON public.pir_response_comments(user_id);

-- Enable Row Level Security
ALTER TABLE public.pir_response_comments ENABLE ROW LEVEL SECURITY;

-- Grant usage permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.pir_response_comments TO authenticated;

-- RLS Policy: Allow authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert comments"
ON public.pir_response_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Create a temporary, permissive SELECT policy
CREATE POLICY "Allow associated users to view comments" -- Reusing name for simplicity
ON public.pir_response_comments
FOR SELECT
TO authenticated
USING (true); -- Allow any authenticated user


-- Including migration: supabase/migrations/20250412152453_fix_material_insert_policy.sql
-- Drop the existing policy
DROP POLICY IF EXISTS "Allow insert materials based on parent request company" ON public.pir_response_component_materials;

-- Modify the is_company_member_or_admin function to include logging
CREATE OR REPLACE FUNCTION public.is_company_member_or_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Recreate the INSERT policy with the modified function
CREATE POLICY "Allow insert materials based on parent request company"
ON public.pir_response_component_materials
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pir_requests req
    JOIN public.pir_responses res ON req.id = res.pir_id
    JOIN public.pir_response_components comp ON res.id = comp.pir_response_id
    WHERE comp.id = component_id
    AND (
      is_company_member_or_admin(req.customer_id) OR
      is_company_member_or_admin(req.supplier_company_id)
    )
  )
);


-- Including migration: supabase/migrations/20250412172141_add_logging_to_pir_responses_policy.sql
CREATE OR REPLACE FUNCTION public.check_supplier_response_access_and_log(response_id uuid)
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Suppliers can manage their responses" ON public.pir_responses;

CREATE POLICY "Suppliers can manage their responses" ON public.pir_responses
FOR ALL
USING (public.check_supplier_response_access_and_log(id))
WITH CHECK (public.check_supplier_response_access_and_log(id));


-- Including migration: supabase/migrations/20250412174550_temp_simplify_supplier_responses_policy.sql
-- Temporarily simplify the policy for debugging RLS issues
DROP POLICY IF EXISTS "Suppliers can manage their responses" ON public.pir_responses;

CREATE POLICY "Suppliers can manage their responses"
ON public.pir_responses
FOR ALL
USING (true)
WITH CHECK (true);


-- Including migration: supabase/migrations/20250412175512_enable_rls_on_materials_temp.sql
-- Temporarily enable RLS and allow all inserts for debugging
ALTER TABLE public.pir_response_component_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Temp allow all inserts" ON public.pir_response_component_materials;

CREATE POLICY "Temp allow all inserts"
ON public.pir_response_component_materials
FOR INSERT
WITH CHECK (true);


-- Including migration: supabase/migrations/20250412180645_revert_temp_simplify_supplier_policy.sql
-- Restore original supplier policy on pir_responses
DROP POLICY IF EXISTS "Suppliers can manage their responses" ON public.pir_responses;

CREATE POLICY "Suppliers can manage their responses"
ON public.pir_responses
FOR ALL
USING (EXISTS ( SELECT 1
       FROM pir_requests pir
         JOIN company_users cu ON cu.company_id = pir.supplier_company_id
      WHERE cu.user_id = auth.uid() AND pir.id = pir_responses.pir_id))
WITH CHECK (EXISTS ( SELECT 1
       FROM pir_requests pir
         JOIN company_users cu ON cu.company_id = pir.supplier_company_id
      WHERE cu.user_id = auth.uid() AND pir.id = pir_responses.pir_id));


-- Including migration: supabase/migrations/20250412183445_revert_enable_rls_on_materials.sql
-- Revert temporary RLS enablement on pir_response_component_materials
DROP POLICY IF EXISTS "Temp allow all inserts" ON public.pir_response_component_materials;

ALTER TABLE public.pir_response_component_materials DISABLE ROW LEVEL SECURITY;


-- Including migration: supabase/migrations/20250413085455_update_pir_transition_sent_to_submitted.sql
CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
  ELSIF OLD.status = 'sent' AND NEW.status = 'submitted' THEN -- Add this condition
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'submitted' THEN -- Keep existing
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('reviewed', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'rejected' AND NEW.status = 'resubmitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$function$;


-- Including migration: supabase/migrations/20250413091414_add_customer_pir_update_policy.sql
-- Add RLS policy to allow customers to update PIRs they own
-- This is necessary for them to change status to 'reviewed' or 'rejected'

-- Rule: Use conditional checks before creating RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Customers can update PIRs they own' AND tablename = 'pir_requests'
  ) THEN
    CREATE POLICY "Customers can update PIRs they own"
    ON public.pir_requests
    FOR UPDATE
    USING ( -- User must be member of the customer company
      EXISTS (
        SELECT 1
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id
      )
    )
    WITH CHECK ( -- Row must still belong to the customer company
      EXISTS (
        SELECT 1
        FROM company_users cu
        WHERE cu.user_id = auth.uid() AND cu.company_id = pir_requests.customer_id
      )
    );
  END IF;
END $$;


-- Including migration: supabase/migrations/20250413092634_add_customer_review_status_to_responses.sql
ALTER TABLE public.pir_responses ADD COLUMN IF NOT EXISTS customer_review_status public.response_status;


-- Including migration: supabase/migrations/20250413104738_allow_resubmitted_to_reviewed_transition.sql
CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$


-- Including migration: supabase/migrations/20250414103000_base_schema.sql



-- Including migration: supabase/migrations/20250414114000_apply_base_schema.sql
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


CREATE EXTENSION IF NOT EXISTS "pgsodium";






ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';




CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";





CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";





CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";





CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";





CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";





CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";




DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flag_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE "public"."flag_status" AS ENUM (
            'open',
            'in_progress',
            'resolved',
            'rejected'
        );
    END IF;
END $$;


ALTER TYPE "public"."flag_status" OWNER TO "postgres";


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pir_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE "public"."pir_status" AS ENUM (
            'draft',
            'submitted',
            'in_review',
            'flagged',
            'approved',
            'rejected'
        );
    END IF;
END $$;


ALTER TYPE "public"."pir_status" OWNER TO "postgres";


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
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
    END IF;
END $$;


ALTER TYPE "public"."question_type" OWNER TO "postgres";


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE "public"."relationship_status" AS ENUM (
            'pending',
            'active',
            'inactive',
            'rejected'
        );
    END IF;
END $$;


ALTER TYPE "public"."relationship_status" OWNER TO "postgres";


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'response_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE "public"."response_status" AS ENUM (
            'draft',
            'submitted',
            'flagged',
            'approved'
        );
    END IF;
END $$;


ALTER TYPE "public"."response_status" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "section_id" "uuid",
    "text" "text" NOT NULL,
    "description" "text",
    "type" "public"."question_type" NOT NULL,
    "options" "jsonb",
    "required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."questions"."section_id" IS 'References the immediate parent section in question_sections.';



COMMENT ON COLUMN "public"."questions"."order_index" IS 'Display order of the question within its parent section.';



CREATE OR REPLACE FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[]) RETURNS "public"."questions"
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


ALTER FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_relationships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "supplier_id" "uuid",
    "status" "public"."relationship_status" DEFAULT 'pending'::"public"."relationship_status" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_relationships" OWNER TO "postgres";


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


ALTER TABLE "public"."company_relationships_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pir_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "customer_id" "uuid",
    "supplier_company_id" "uuid",
    "title" "text",
    "description" "text",
    "status" "public"."pir_status" DEFAULT 'draft'::"public"."pir_status" NOT NULL,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "suggested_product_name" "text"
);


ALTER TABLE "public"."pir_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pir_requests"."suggested_product_name" IS 'Stores the product name suggested by the customer if the product_id is NULL (i.e., product does not exist yet).';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "supplier_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


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
     LEFT JOIN "public"."products" "p" ON (("pir"."product_id" = "p"."id")))
     JOIN "public"."companies" "c1" ON (("pir"."customer_id" = "c1"."id")))
     JOIN "public"."companies" "c2" ON (("pir"."supplier_company_id" = "c2"."id")));


ALTER TABLE "public"."pir_access_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pir_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pir_id" "uuid",
    "question_id" "uuid",
    "answer" "jsonb" NOT NULL,
    "status" "public"."response_status" DEFAULT 'draft'::"public"."response_status" NOT NULL,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pir_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pir_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pir_id" "uuid",
    "tag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pir_tags" OWNER TO "postgres";


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


ALTER TABLE "public"."product_access_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_answer_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_answer_id" "uuid",
    "answer" "jsonb" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_answer_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "question_id" "uuid",
    "current_answer" "jsonb" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_sections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid"
);


ALTER TABLE "public"."question_sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."question_sections" IS 'Stores hierarchical sections for the question bank.';



COMMENT ON COLUMN "public"."question_sections"."parent_id" IS 'References the parent section for nesting.';



CREATE TABLE IF NOT EXISTS "public"."question_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid",
    "tag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."question_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."response_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "flag_id" "uuid",
    "user_id" "uuid",
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."response_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."response_flags" (
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


ALTER TABLE "public"."response_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_question_bank_numbered" AS
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


ALTER TABLE "public"."v_question_bank_numbered" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_question_bank_numbered" IS 'Provides questions with a calculated hierarchical number based on section nesting and order.';



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'companies_pkey' AND conrelid = 'public.companies'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."companies"
            ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_relationships_customer_id_supplier_id_key' AND conrelid = 'public.company_relationships'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."company_relationships"
            ADD CONSTRAINT "company_relationships_customer_id_supplier_id_key" UNIQUE ("customer_id", "supplier_id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_relationships_pkey' AND conrelid = 'public.company_relationships'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."company_relationships"
            ADD CONSTRAINT "company_relationships_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_users_pkey' AND conrelid = 'public.company_users'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."company_users"
            ADD CONSTRAINT "company_users_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_requests_pkey' AND conrelid = 'public.pir_requests'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_requests"
            ADD CONSTRAINT "pir_requests_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_responses_pir_id_question_id_key' AND conrelid = 'public.pir_responses'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_responses"
            ADD CONSTRAINT "pir_responses_pir_id_question_id_key" UNIQUE ("pir_id", "question_id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_responses_pkey' AND conrelid = 'public.pir_responses'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_responses"
            ADD CONSTRAINT "pir_responses_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_tags_pir_id_tag_id_key' AND conrelid = 'public.pir_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_tags"
            ADD CONSTRAINT "pir_tags_pir_id_tag_id_key" UNIQUE ("pir_id", "tag_id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_tags_pkey' AND conrelid = 'public.pir_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_tags"
            ADD CONSTRAINT "pir_tags_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answer_history_pkey' AND conrelid = 'public.product_answer_history'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answer_history"
            ADD CONSTRAINT "product_answer_history_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answers_pkey' AND conrelid = 'public.product_answers'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answers"
            ADD CONSTRAINT "product_answers_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answers_product_id_question_id_key' AND conrelid = 'public.product_answers'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answers"
            ADD CONSTRAINT "product_answers_product_id_question_id_key" UNIQUE ("product_id", "question_id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_pkey' AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."products"
            ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_pkey' AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."profiles"
            ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'question_tags_pkey' AND conrelid = 'public.question_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."question_tags"
            ADD CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'question_tags_question_id_tag_id_key' AND conrelid = 'public.question_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."question_tags"
            ADD CONSTRAINT "question_tags_question_id_tag_id_key" UNIQUE ("question_id", "tag_id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'questions_pkey' AND conrelid = 'public.questions'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."questions"
            ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'response_comments_pkey' AND conrelid = 'public.response_comments'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."response_comments"
            ADD CONSTRAINT "response_comments_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'response_flags_pkey' AND conrelid = 'public.response_flags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."response_flags"
            ADD CONSTRAINT "response_flags_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'sections_pkey' AND conrelid = 'public.question_sections'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."question_sections"
            ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tags_name_key' AND conrelid = 'public.tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."tags"
            ADD CONSTRAINT "tags_name_key" UNIQUE ("name");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tags_pkey' AND conrelid = 'public.tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."tags"
            ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_question_sections_parent_id' AND tablename = 'question_sections' AND schemaname = 'public'
    ) THEN
        CREATE INDEX "idx_question_sections_parent_id" ON "public"."question_sections" USING "btree" ("parent_id");
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_questions_section_id_order_index' AND tablename = 'questions' AND schemaname = 'public'
    ) THEN
        CREATE INDEX "idx_questions_section_id_order_index" ON "public"."questions" USING "btree" ("section_id", "order_index");
    END IF;
END $$;



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



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_relationships_customer_id_fkey' AND conrelid = 'public.company_relationships'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."company_relationships"
            ADD CONSTRAINT "company_relationships_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_relationships_supplier_id_fkey' AND conrelid = 'public.company_relationships'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."company_relationships"
            ADD CONSTRAINT "company_relationships_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_users_company_id_fkey' AND conrelid = 'public.company_users'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."company_users"
            ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'company_users_user_id_fkey' AND conrelid = 'public.company_users'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."company_users"
            ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_requests_customer_id_fkey' AND conrelid = 'public.pir_requests'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_requests"
            ADD CONSTRAINT "pir_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_requests_product_id_fkey' AND conrelid = 'public.pir_requests'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_requests"
            ADD CONSTRAINT "pir_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_requests_supplier_company_id_fkey' AND conrelid = 'public.pir_requests'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_requests"
            ADD CONSTRAINT "pir_requests_supplier_company_id_fkey" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_responses_pir_id_fkey' AND conrelid = 'public.pir_responses'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_responses"
            ADD CONSTRAINT "pir_responses_pir_id_fkey" FOREIGN KEY ("pir_id") REFERENCES "public"."pir_requests"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_responses_question_id_fkey' AND conrelid = 'public.pir_responses'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_responses"
            ADD CONSTRAINT "pir_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_tags_pir_id_fkey' AND conrelid = 'public.pir_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_tags"
            ADD CONSTRAINT "pir_tags_pir_id_fkey" FOREIGN KEY ("pir_id") REFERENCES "public"."pir_requests"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pir_tags_tag_id_fkey' AND conrelid = 'public.pir_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."pir_tags"
            ADD CONSTRAINT "pir_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answer_history_approved_by_fkey' AND conrelid = 'public.product_answer_history'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answer_history"
            ADD CONSTRAINT "product_answer_history_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answer_history_product_answer_id_fkey' AND conrelid = 'public.product_answer_history'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answer_history"
            ADD CONSTRAINT "product_answer_history_product_answer_id_fkey" FOREIGN KEY ("product_answer_id") REFERENCES "public"."product_answers"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answers_approved_by_fkey' AND conrelid = 'public.product_answers'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answers"
            ADD CONSTRAINT "product_answers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answers_product_id_fkey' AND conrelid = 'public.product_answers'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answers"
            ADD CONSTRAINT "product_answers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_answers_question_id_fkey' AND conrelid = 'public.product_answers'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."product_answers"
            ADD CONSTRAINT "product_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_supplier_id_fkey' AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."products"
            ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."profiles"
            ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'question_sections_parent_id_fkey' AND conrelid = 'public.question_sections'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."question_sections"
            ADD CONSTRAINT "question_sections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."question_sections"("id") ON DELETE SET NULL;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'question_tags_question_id_fkey' AND conrelid = 'public.question_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."question_tags"
            ADD CONSTRAINT "question_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'question_tags_tag_id_fkey' AND conrelid = 'public.question_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."question_tags"
            ADD CONSTRAINT "question_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'questions_section_id_fkey' AND conrelid = 'public.questions'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."questions"
            ADD CONSTRAINT "questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."question_sections"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'response_comments_flag_id_fkey' AND conrelid = 'public.response_comments'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."response_comments"
            ADD CONSTRAINT "response_comments_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "public"."response_flags"("id") ON DELETE CASCADE;
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'response_comments_user_id_fkey' AND conrelid = 'public.response_comments'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."response_comments"
            ADD CONSTRAINT "response_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'response_flags_created_by_fkey' AND conrelid = 'public.response_flags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."response_flags"
            ADD CONSTRAINT "response_flags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'response_flags_resolved_by_fkey' AND conrelid = 'public.response_flags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."response_flags"
            ADD CONSTRAINT "response_flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'response_flags_response_id_fkey' AND conrelid = 'public.response_flags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."response_flags"
            ADD CONSTRAINT "response_flags_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."pir_responses"("id") ON DELETE CASCADE;
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
           FROM "public"."company_users" "cu"
          WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "pir_requests"."customer_id")))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can link tags to their PIRs' AND tablename = 'pir_tags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can link tags to their PIRs" ON "public"."pir_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
           FROM ("public"."pir_requests" "pir"
             JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."customer_id")))
          WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_tags"."pir_id")))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can view approved answers from their suppliers' AND tablename = 'product_answers' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can view approved answers from their suppliers" ON "public"."product_answers" FOR SELECT USING ((EXISTS ( SELECT 1
           FROM (("public"."products" "p"
             JOIN "public"."company_relationships" "cr" ON (("cr"."supplier_id" = "p"."supplier_id")))\n     JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "cr"."customer_id")))\n  WHERE (("cu"."user_id" = "auth"."uid"()) AND ("p"."id" = "product_answers"."product_id") AND ("product_answers"."approved_at" IS NOT NULL)))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can view products from their suppliers' AND tablename = 'products' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can view products from their suppliers" ON "public"."products" FOR SELECT USING ((EXISTS ( SELECT 1
           FROM ("public"."company_relationships" "cr"
             JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "cr"."customer_id")))
          WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cr"."supplier_id" = "products"."supplier_id")))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Customers can view responses to their PIRs' AND tablename = 'pir_responses' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Customers can view responses to their PIRs" ON "public"."pir_responses" FOR SELECT USING ((EXISTS ( SELECT 1
           FROM ("public"."pir_requests" "pir"
             JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."customer_id")))
          WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_responses"."pir_id")))));
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
           FROM ("public"."products" "p"
             JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "p"."supplier_id")))
          WHERE (("cu"."user_id" = "auth"."uid"()) AND ("p"."id" = "product_answers"."product_id")))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Suppliers can manage their products' AND tablename = 'products' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Suppliers can manage their products" ON "public"."products" USING ((EXISTS ( SELECT 1
           FROM "public"."company_users" "cu"
          WHERE (("cu"."user_id" = "auth"."uid"()) AND ("cu"."company_id" = "products"."supplier_id")))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Suppliers can manage their responses' AND tablename = 'pir_responses' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Suppliers can manage their responses" ON "public"."pir_responses" USING ((EXISTS ( SELECT 1
           FROM ("public"."pir_requests" "pir"
             JOIN "public"."company_users" "cu" ON (("cu"."company_id" = "pir"."supplier_company_id")))
          WHERE (("cu"."user_id" = "auth"."uid"()) AND ("pir"."id" = "pir_responses"."pir_id")))));
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
        WHERE policyname = 'Users can view PIRs involving their company' AND tablename = 'pir_requests' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view PIRs involving their company" ON "public"."pir_requests" FOR SELECT USING ((EXISTS ( SELECT 1
           FROM "public"."company_users" "cu"
          WHERE (("cu"."user_id" = "auth"."uid"()) AND (("cu"."company_id" = "pir_requests"."customer_id") OR ("cu"."company_id" = "pir_requests"."supplier_company_id") OR (("pir_requests"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
                   FROM "public"."products"
                  WHERE ("products"."id" = "pir_requests"."product_id")))))))));
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view comments on flags they can see' AND tablename = 'response_comments' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view comments on flags they can see" ON "public"."response_comments" FOR SELECT USING ((EXISTS ( SELECT 1
           FROM ((("public"."response_flags" "rf"
             JOIN "public"."pir_responses" "pr" ON (("pr"."id" = "rf"."response_id")))
             JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
             JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
          WHERE (("rf"."id" = "response_comments"."flag_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
                   FROM "public"."products"
                  WHERE ("products"."id" = "pir"."product_id")))))))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view flags on their responses' AND tablename = 'response_flags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view flags on their responses" ON "public"."response_flags" FOR SELECT USING ((EXISTS ( SELECT 1
           FROM (("public"."pir_responses" "pr"
             JOIN "public"."pir_requests" "pir" ON (("pir"."id" = "pr"."pir_id")))
             JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
          WHERE (("pr"."id" = "response_flags"."response_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
                   FROM "public"."products"
                  WHERE ("products"."id" = "pir"."product_id")))))))));
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
           FROM "public"."company_users" "cu"
          WHERE (("cu"."user_id" = "auth"."uid"()) AND (("cu"."company_id" = "company_relationships"."customer_id") OR ("cu"."company_id" = "company_relationships"."supplier_id"))))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view tags linked to accessible PIRs' AND tablename = 'pir_tags' AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view tags linked to accessible PIRs" ON "public"."pir_tags" FOR SELECT USING ((EXISTS ( SELECT 1
           FROM ("public"."pir_requests" "pir"
             JOIN "public"."company_users" "cu" ON (("cu"."user_id" = "auth"."uid"())))
          WHERE (("pir"."id" = "pir_tags"."pir_id") AND (("cu"."company_id" = "pir"."customer_id") OR ("cu"."company_id" = "pir"."supplier_company_id") OR (("pir"."product_id" IS NOT NULL) AND ("cu"."company_id" = ( SELECT "products"."supplier_id"
                   FROM "public"."products"
                  WHERE ("products"."id" = "pir"."product_id")))))))));
    END IF;
END $$;



DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'pir_requests' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."pir_requests" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'pir_responses' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."pir_responses" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'pir_tags' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."pir_tags" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'product_answer_history' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."product_answer_history" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'question_tags' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."question_tags" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'response_comments' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."response_comments" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'response_flags' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."response_flags" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'tags' AND schemaname = 'public' AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
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




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";




REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";



