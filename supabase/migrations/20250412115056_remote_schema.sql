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


