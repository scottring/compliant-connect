

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
