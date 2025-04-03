--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public; -- Commented out as public schema usually exists after reset


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: flag_status; Type: TYPE; Schema: public; Owner: -
--

DROP TYPE IF EXISTS public.flag_status; -- Added to prevent error
CREATE TYPE public.flag_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'rejected'
);


--
-- Name: pir_status; Type: TYPE; Schema: public; Owner: -
--

DROP TYPE IF EXISTS public.pir_status; -- Added to prevent error
CREATE TYPE public.pir_status AS ENUM (
    'draft',
    'submitted',
    'in_review',
    'flagged',
    'approved',
    'rejected'
);


--
-- Name: question_type; Type: TYPE; Schema: public; Owner: -
--

DROP TYPE IF EXISTS public.question_type; -- Added to prevent error
CREATE TYPE public.question_type AS ENUM (
    'text',
    'number',
    'boolean',
    'single_select',
    'multi_select',
    'date',
    'file'
);


--
-- Name: relationship_status; Type: TYPE; Schema: public; Owner: -
--

DROP TYPE IF EXISTS public.relationship_status; -- Added to prevent error
CREATE TYPE public.relationship_status AS ENUM (
    'pending',
    'active',
    'inactive',
    'rejected'
);


--
-- Name: response_status; Type: TYPE; Schema: public; Owner: -
--

DROP TYPE IF EXISTS public.response_status; -- Added to prevent error
CREATE TYPE public.response_status AS ENUM (
    'draft',
    'submitted',
    'flagged',
    'approved'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    subsection_id uuid,
    text text NOT NULL,
    description text,
    type public.question_type NOT NULL,
    options jsonb,
    required boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: create_question_with_tags(uuid, text, text, public.question_type, boolean, jsonb, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_question_with_tags(p_subsection_id uuid, p_text text, p_description text, p_type public.question_type, p_required boolean, p_options jsonb, p_tag_ids uuid[]) RETURNS public.questions -- Changed to CREATE OR REPLACE
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    new_question public.questions;
    tag_id uuid;
BEGIN
    -- Insert the new question
    INSERT INTO public.questions (subsection_id, text, description, type, required, options)
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


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger -- Changed to CREATE OR REPLACE
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger -- Changed to CREATE OR REPLACE
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    contact_name text,
    contact_email text,
    contact_phone text
);


--
-- Name: company_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_relationships (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    customer_id uuid,
    supplier_id uuid,
    status public.relationship_status DEFAULT 'pending'::public.relationship_status NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: company_relationships_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.company_relationships_view AS
 SELECT cr.id,
    cr.customer_id,
    cr.supplier_id,
    cr.status,
    cr.type,
    cr.created_at,
    cr.updated_at,
    c1.name AS customer_name,
    c2.name AS supplier_name
   FROM ((public.company_relationships cr
     JOIN public.companies c1 ON ((cr.customer_id = c1.id)))
     JOIN public.companies c2 ON ((cr.supplier_id = c2.id)));


--
-- Name: company_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    user_id uuid,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pir_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pir_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_id uuid,
    customer_id uuid,
    supplier_company_id uuid,
    title text,
    description text,
    status public.pir_status DEFAULT 'draft'::public.pir_status NOT NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    suggested_product_name text
);


--
-- Name: COLUMN pir_requests.suggested_product_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pir_requests.suggested_product_name IS 'Stores the product name suggested by the customer if the product_id is NULL (i.e., product does not exist yet).';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    supplier_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pir_access_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pir_access_view AS
 SELECT pir.id,
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
   FROM (((public.pir_requests pir
     LEFT JOIN public.products p ON ((pir.product_id = p.id)))
     JOIN public.companies c1 ON ((pir.customer_id = c1.id)))
     JOIN public.companies c2 ON ((pir.supplier_company_id = c2.id)));


--
-- Name: pir_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pir_responses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    pir_id uuid,
    question_id uuid,
    answer jsonb NOT NULL,
    status public.response_status DEFAULT 'draft'::public.response_status NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pir_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pir_tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    pir_id uuid,
    tag_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_access_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.product_access_view AS
 SELECT p.id,
    p.supplier_id,
    p.name,
    p.description,
    p.created_at,
    p.updated_at,
    c.name AS supplier_name
   FROM (public.products p
     JOIN public.companies c ON ((p.supplier_id = c.id)));


--
-- Name: product_answer_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_answer_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_answer_id uuid,
    answer jsonb NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_answers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    product_id uuid,
    question_id uuid,
    current_answer jsonb NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: question_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    question_id uuid,
    tag_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: response_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    flag_id uuid,
    user_id uuid,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: response_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_flags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    response_id uuid,
    created_by uuid,
    description text NOT NULL,
    status public.flag_status DEFAULT 'open'::public.flag_status NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subsections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subsections (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    section_id uuid,
    name text NOT NULL,
    description text,
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_relationships company_relationships_customer_id_supplier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_relationships
    ADD CONSTRAINT company_relationships_customer_id_supplier_id_key UNIQUE (customer_id, supplier_id);


--
-- Name: company_relationships company_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_relationships
    ADD CONSTRAINT company_relationships_pkey PRIMARY KEY (id);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: pir_requests pir_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_requests
    ADD CONSTRAINT pir_requests_pkey PRIMARY KEY (id);


--
-- Name: pir_responses pir_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_responses
    ADD CONSTRAINT pir_responses_pkey PRIMARY KEY (id);


--
-- Name: pir_responses pir_responses_pir_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_responses
    ADD CONSTRAINT pir_responses_pir_id_question_id_key UNIQUE (pir_id, question_id);


--
-- Name: pir_tags pir_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_tags
    ADD CONSTRAINT pir_tags_pkey PRIMARY KEY (id);


--
-- Name: pir_tags pir_tags_pir_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_tags
    ADD CONSTRAINT pir_tags_pir_id_tag_id_key UNIQUE (pir_id, tag_id);


--
-- Name: product_answer_history product_answer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answer_history
    ADD CONSTRAINT product_answer_history_pkey PRIMARY KEY (id);


--
-- Name: product_answers product_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_pkey PRIMARY KEY (id);


--
-- Name: product_answers product_answers_product_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_product_id_question_id_key UNIQUE (product_id, question_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: question_tags question_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_pkey PRIMARY KEY (id);


--
-- Name: question_tags question_tags_question_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_question_id_tag_id_key UNIQUE (question_id, tag_id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: response_comments response_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_comments
    ADD CONSTRAINT response_comments_pkey PRIMARY KEY (id);


--
-- Name: response_flags response_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_flags
    ADD CONSTRAINT response_flags_pkey PRIMARY KEY (id);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: subsections subsections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subsections
    ADD CONSTRAINT subsections_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: companies set_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: company_relationships set_company_relationships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_company_relationships_updated_at BEFORE UPDATE ON public.company_relationships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: company_users set_company_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_company_users_updated_at BEFORE UPDATE ON public.company_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pir_requests set_pir_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_pir_requests_updated_at BEFORE UPDATE ON public.pir_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pir_responses set_pir_responses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_pir_responses_updated_at BEFORE UPDATE ON public.pir_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: product_answers set_product_answers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_product_answers_updated_at BEFORE UPDATE ON public.product_answers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products set_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: questions set_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: response_flags set_response_flags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_response_flags_updated_at BEFORE UPDATE ON public.response_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sections set_sections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subsections set_subsections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_subsections_updated_at BEFORE UPDATE ON public.subsections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tags set_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: company_relationships company_relationships_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_relationships
    ADD CONSTRAINT company_relationships_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_relationships company_relationships_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_relationships
    ADD CONSTRAINT company_relationships_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: pir_requests pir_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_requests
    ADD CONSTRAINT pir_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: pir_requests pir_requests_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_requests
    ADD CONSTRAINT pir_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: pir_requests pir_requests_supplier_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_requests
    ADD CONSTRAINT pir_requests_supplier_company_id_fkey FOREIGN KEY (supplier_company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: pir_responses pir_responses_pir_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_responses
    ADD CONSTRAINT pir_responses_pir_id_fkey FOREIGN KEY (pir_id) REFERENCES public.pir_requests(id) ON DELETE CASCADE;


--
-- Name: pir_responses pir_responses_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_responses
    ADD CONSTRAINT pir_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: pir_tags pir_tags_pir_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_tags
    ADD CONSTRAINT pir_tags_pir_id_fkey FOREIGN KEY (pir_id) REFERENCES public.pir_requests(id) ON DELETE CASCADE;


--
-- Name: pir_tags pir_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pir_tags
    ADD CONSTRAINT pir_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: product_answer_history product_answer_history_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answer_history
    ADD CONSTRAINT product_answer_history_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: product_answer_history product_answer_history_product_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answer_history
    ADD CONSTRAINT product_answer_history_product_answer_id_fkey FOREIGN KEY (product_answer_id) REFERENCES public.product_answers(id) ON DELETE CASCADE;


--
-- Name: product_answers product_answers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: product_answers product_answers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_answers product_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: question_tags question_tags_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_tags question_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: questions questions_subsection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_subsection_id_fkey FOREIGN KEY (subsection_id) REFERENCES public.subsections(id) ON DELETE CASCADE;


--
-- Name: response_comments response_comments_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_comments
    ADD CONSTRAINT response_comments_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.response_flags(id) ON DELETE CASCADE;


--
-- Name: response_comments response_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_comments
    ADD CONSTRAINT response_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: response_flags response_flags_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_flags
    ADD CONSTRAINT response_flags_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: response_flags response_flags_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_flags
    ADD CONSTRAINT response_flags_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: response_flags response_flags_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_flags
    ADD CONSTRAINT response_flags_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.pir_responses(id) ON DELETE CASCADE;


--
-- Name: subsections subsections_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subsections
    ADD CONSTRAINT subsections_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;


--
-- Name: companies Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.companies FOR SELECT USING (true);

-- Add policy to allow authenticated users to insert companies
CREATE POLICY "Allow authenticated users to insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

--
-- Name: company_relationships Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.company_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.company_relationships FOR SELECT USING (true);

-- Allow users to insert relationships if they belong to the customer company
CREATE POLICY "Allow users to insert relationships for their company" ON public.company_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.company_id = company_relationships.customer_id
      AND cu.user_id = auth.uid()
    )
  );

--
-- Name: company_users Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.company_users FOR SELECT USING (true);


--
-- Name: pir_requests Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.pir_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.pir_requests FOR SELECT USING (true);


--
-- Name: pir_responses Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.pir_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.pir_responses FOR SELECT USING (true);


--
-- Name: pir_tags Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.pir_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.pir_tags FOR SELECT USING (true);


--
-- Name: product_answer_history Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.product_answer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.product_answer_history FOR SELECT USING (true);


--
-- Name: product_answers Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.product_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.product_answers FOR SELECT USING (true);


--
-- Name: products Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.products FOR SELECT USING (true);


--
-- Name: profiles Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.profiles FOR SELECT USING (true);


--
-- Name: question_tags Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.question_tags FOR SELECT USING (true);


--
-- Name: questions Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.questions FOR SELECT USING (true);


--
-- Name: response_comments Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.response_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.response_comments FOR SELECT USING (true);


--
-- Name: response_flags Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.response_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.response_flags FOR SELECT USING (true);


--
-- Name: sections Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.sections FOR SELECT USING (true);


--
-- Name: subsections Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.subsections FOR SELECT USING (true);


--
-- Name: tags Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.tags FOR SELECT USING (true);


--
-- Name: profiles Profiles are viewable by users who created them.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by users who created them." ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: company_users users_create_own_associations; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users_create_own_associations" ON public.company_users; -- Add drop for this policy
CREATE POLICY "users_create_own_associations" ON public.company_users FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: company_users users_delete_own_associations; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users_delete_own_associations" ON public.company_users; -- Add drop for this policy
CREATE POLICY "users_delete_own_associations" ON public.company_users FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: company_users users_update_own_associations; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users_update_own_associations" ON public.company_users; -- Add drop for this policy
CREATE POLICY "users_update_own_associations" ON public.company_users FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: company_users users_view_own_associations; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users_view_own_associations" ON public.company_users; -- Add drop for the conflicting policy
CREATE POLICY "users_view_own_associations" ON public.company_users FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION create_question_with_tags(p_subsection_id uuid, p_text text, p_description text, p_type public.question_type, p_required boolean, p_options jsonb, p_tag_ids uuid[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_question_with_tags(p_subsection_id uuid, p_text text, p_description text, p_type public.question_type, p_required boolean, p_options jsonb, p_tag_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.create_question_with_tags(p_subsection_id uuid, p_text text, p_description text, p_type public.question_type, p_required boolean, p_options jsonb, p_tag_ids uuid[]) TO service_role;


--
-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;


--
-- Name: TABLE company_relationships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.company_relationships TO anon;
GRANT ALL ON TABLE public.company_relationships TO authenticated;
GRANT ALL ON TABLE public.company_relationships TO service_role;


--
-- Name: VIEW company_relationships_view; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.company_relationships_view TO anon;
GRANT ALL ON TABLE public.company_relationships_view TO authenticated;
GRANT ALL ON TABLE public.company_relationships_view TO service_role;


--
-- Name: TABLE company_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.company_users TO anon;
GRANT ALL ON TABLE public.company_users TO authenticated;
GRANT ALL ON TABLE public.company_users TO service_role;


--
-- Name: TABLE pir_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pir_requests TO anon;
GRANT ALL ON TABLE public.pir_requests TO authenticated;
GRANT ALL ON TABLE public.pir_requests TO service_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;


--
-- Name: VIEW pir_access_view; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pir_access_view TO anon;
GRANT ALL ON TABLE public.pir_access_view TO authenticated;
GRANT ALL ON TABLE public.pir_access_view TO service_role;


--
-- Name: TABLE pir_responses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pir_responses TO anon;
GRANT ALL ON TABLE public.pir_responses TO authenticated;
GRANT ALL ON TABLE public.pir_responses TO service_role;


--
-- Name: TABLE pir_tags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pir_tags TO anon;
GRANT ALL ON TABLE public.pir_tags TO authenticated;
GRANT ALL ON TABLE public.pir_tags TO service_role;


--
-- Name: VIEW product_access_view; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_access_view TO anon;
GRANT ALL ON TABLE public.product_access_view TO authenticated;
GRANT ALL ON TABLE public.product_access_view TO service_role;


--
-- Name: TABLE product_answer_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_answer_history TO anon;
GRANT ALL ON TABLE public.product_answer_history TO authenticated;
GRANT ALL ON TABLE public.product_answer_history TO service_role;


--
-- Name: TABLE product_answers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_answers TO anon;
GRANT ALL ON TABLE public.product_answers TO authenticated;
GRANT ALL ON TABLE public.product_answers TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.questions TO anon;
GRANT ALL ON TABLE public.questions TO authenticated;
GRANT ALL ON TABLE public.questions TO service_role;


--
-- Name: TABLE question_tags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.question_tags TO anon;
GRANT ALL ON TABLE public.question_tags TO authenticated;
GRANT ALL ON TABLE public.question_tags TO service_role;


--
-- Name: TABLE response_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.response_comments TO anon;
GRANT ALL ON TABLE public.response_comments TO authenticated;
GRANT ALL ON TABLE public.response_comments TO service_role;


--
-- Name: TABLE response_flags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.response_flags TO anon;
GRANT ALL ON TABLE public.response_flags TO authenticated;
GRANT ALL ON TABLE public.response_flags TO service_role;


--
-- Name: TABLE sections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sections TO anon;
GRANT ALL ON TABLE public.sections TO authenticated;
GRANT ALL ON TABLE public.sections TO service_role;


--
-- Name: TABLE subsections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subsections TO anon;
GRANT ALL ON TABLE public.subsections TO authenticated;
GRANT ALL ON TABLE public.subsections TO service_role;


--
-- Name: TABLE tags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tags TO anon;
GRANT ALL ON TABLE public.tags TO authenticated;
GRANT ALL ON TABLE public.tags TO service_role;


--
-- PostgreSQL database dump complete
--
