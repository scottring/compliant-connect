

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






-- Removed redundant CREATE TYPE for flag_status (already created in an earlier migration)


-- Removed redundant CREATE TYPE for pir_status
-- Removed redundant CREATE TYPE for question_type
-- Removed redundant CREATE TYPE for relationship_status
-- Removed redundant CREATE TYPE for response_status


CREATE OR REPLACE FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[], "p_table_config" "jsonb" DEFAULT NULL::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_question_id uuid;
    tag_id uuid;
BEGIN
    -- Insert the new question, including the table_config
    INSERT INTO public.questions (subsection_id, text, description, type, required, options, table_config, created_by)
    VALUES (p_subsection_id, p_text, p_description, p_type, p_required, p_options, p_table_config, auth.uid())
    RETURNING id INTO new_question_id;

    -- Associate tags with the new question
    IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
        FOREACH tag_id IN ARRAY p_tag_ids
        LOOP
            INSERT INTO public.question_tags (question_id, tag_id)
            VALUES (new_question_id, tag_id);
        END LOOP;
    END IF;

    -- Return the ID of the newly created question as JSON
    RETURN json_build_object('id', new_question_id);
END;
$$;


ALTER FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[], "p_table_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_application_data"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Delete data in order respecting foreign key constraints
    -- Delete comments and flags first as they reference answers/questions
    DELETE FROM public.comments;
    DELETE FROM public.flags;

    -- Delete junction tables
    DELETE FROM public.question_tags;
    DELETE FROM public.product_sheet_tags;

    -- Delete answers before product sheets/questions
    DELETE FROM public.answers;

    -- Delete questions before sections
    DELETE FROM public.questions;

    -- Delete subsections before sections
    DELETE FROM public.subsections;

    -- Delete main data tables
    DELETE FROM public.product_sheets;
    DELETE FROM public.sections;
    DELETE FROM public.tags;

    -- IMPORTANT: We are intentionally NOT deleting from:
    -- public.companies: To preserve company structures
    -- public.company_users: To preserve user roles and access within companies
    -- auth.users: To preserve user accounts

    -- Add any other tables that need clearing here, respecting dependencies.

END;
$$;


ALTER FUNCTION "public"."reset_application_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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


CREATE TABLE IF NOT EXISTS "public"."question_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid",
    "tag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."question_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "subsection_id" "uuid",
    "text" "text" NOT NULL,
    "description" "text",
    "type" "public"."question_type" NOT NULL,
    "options" "jsonb",
    "required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "table_config" "jsonb"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."sections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subsections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "section_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subsections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


-- Removed redundant ADD CONSTRAINT for companies_pkey (already created in an earlier migration)


-- Removed redundant ADD CONSTRAINT for company_relationships_customer_id_supplier_id_key


-- Removed redundant ADD CONSTRAINT for company_relationships_pkey


-- Removed redundant ADD CONSTRAINT for company_users_pkey

-- Removed redundant ADD CONSTRAINT for pir_requests_pkey

-- Removed redundant ADD CONSTRAINT for pir_responses_pir_id_question_id_key

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



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subsections"
    ADD CONSTRAINT "subsections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "set_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_company_relationships_updated_at" BEFORE UPDATE ON "public"."company_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_company_users_updated_at" BEFORE UPDATE ON "public"."company_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pir_requests_updated_at" BEFORE UPDATE ON "public"."pir_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pir_responses_updated_at" BEFORE UPDATE ON "public"."pir_responses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_product_answers_updated_at" BEFORE UPDATE ON "public"."product_answers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_questions_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_response_flags_updated_at" BEFORE UPDATE ON "public"."response_flags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_sections_updated_at" BEFORE UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_subsections_updated_at" BEFORE UPDATE ON "public"."subsections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



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



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_subsection_id_fkey" FOREIGN KEY ("subsection_id") REFERENCES "public"."subsections"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."subsections"
    ADD CONSTRAINT "subsections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated full access on pir_requests" ON "public"."pir_requests" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on pir_responses" ON "public"."pir_responses" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on pir_tags" ON "public"."pir_tags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on product_answer_history" ON "public"."product_answer_history" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on product_answers" ON "public"."product_answers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on products" ON "public"."products" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on question_tags" ON "public"."question_tags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on questions" ON "public"."questions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on response_comments" ON "public"."response_comments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on response_flags" ON "public"."response_flags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on subsections" ON "public"."subsections" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to delete companies" ON "public"."companies" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete company_relationships" ON "public"."company_relationships" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete sections" ON "public"."sections" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete tags" ON "public"."tags" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert companies" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert sections" ON "public"."sections" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert tags" ON "public"."tags" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update companies" ON "public"."companies" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update company_relationships" ON "public"."company_relationships" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update sections" ON "public"."sections" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update tags" ON "public"."tags" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow users to insert relationships for their company" ON "public"."company_relationships" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE ((("cu"."company_id" = "company_relationships"."customer_id") OR ("cu"."company_id" = "company_relationships"."supplier_id")) AND ("cu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable read access for all users" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."company_relationships" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."company_users" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."sections" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Profiles are viewable by users who created them." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pir_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_answer_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subsections" ENABLE ROW LEVEL SECURITY;


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




















































































































































































GRANT ALL ON FUNCTION "public"."create_question_with_tags"("p_subsection_id" "uuid", "p_text" "text", "p_description" "text", "p_type" "public"."question_type", "p_required" boolean, "p_options" "jsonb", "p_tag_ids" "uuid"[], "p_table_config" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_application_data"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_relationships" TO "anon";
GRANT ALL ON TABLE "public"."company_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."company_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."company_relationships_view" TO "anon";
GRANT ALL ON TABLE "public"."company_relationships_view" TO "authenticated";
GRANT ALL ON TABLE "public"."company_relationships_view" TO "service_role";



GRANT ALL ON TABLE "public"."company_users" TO "anon";
GRANT ALL ON TABLE "public"."company_users" TO "authenticated";
GRANT ALL ON TABLE "public"."company_users" TO "service_role";



GRANT ALL ON TABLE "public"."pir_requests" TO "anon";
GRANT ALL ON TABLE "public"."pir_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_requests" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."pir_access_view" TO "anon";
GRANT ALL ON TABLE "public"."pir_access_view" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_access_view" TO "service_role";



GRANT ALL ON TABLE "public"."pir_responses" TO "anon";
GRANT ALL ON TABLE "public"."pir_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pir_tags" TO "anon";
GRANT ALL ON TABLE "public"."pir_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."pir_tags" TO "service_role";



GRANT ALL ON TABLE "public"."product_access_view" TO "anon";
GRANT ALL ON TABLE "public"."product_access_view" TO "authenticated";
GRANT ALL ON TABLE "public"."product_access_view" TO "service_role";



GRANT ALL ON TABLE "public"."product_answer_history" TO "anon";
GRANT ALL ON TABLE "public"."product_answer_history" TO "authenticated";
GRANT ALL ON TABLE "public"."product_answer_history" TO "service_role";



GRANT ALL ON TABLE "public"."product_answers" TO "anon";
GRANT ALL ON TABLE "public"."product_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."product_answers" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."question_tags" TO "anon";
GRANT ALL ON TABLE "public"."question_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."question_tags" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."response_comments" TO "anon";
GRANT ALL ON TABLE "public"."response_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."response_comments" TO "service_role";



GRANT ALL ON TABLE "public"."response_flags" TO "anon";
GRANT ALL ON TABLE "public"."response_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."response_flags" TO "service_role";



GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";



GRANT ALL ON TABLE "public"."subsections" TO "anon";
GRANT ALL ON TABLE "public"."subsections" TO "authenticated";
GRANT ALL ON TABLE "public"."subsections" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



























RESET ALL;
