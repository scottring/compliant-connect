drop trigger if exists "update_pir_response_component_materials_updated_at" on "public"."pir_response_component_materials";

drop trigger if exists "update_pir_response_components_updated_at" on "public"."pir_response_components";

drop policy "Customers can update PIRs they own" on "public"."pir_requests";

drop policy "Allow associated users to view comments" on "public"."pir_response_comments";

drop policy "Allow authenticated users to insert comments" on "public"."pir_response_comments";

drop policy "Allow insert materials based on parent request company" on "public"."pir_response_component_materials";

drop policy "Suppliers can manage their responses" on "public"."pir_responses";

revoke delete on table "public"."pir_response_comments" from "anon";

revoke insert on table "public"."pir_response_comments" from "anon";

revoke references on table "public"."pir_response_comments" from "anon";

revoke select on table "public"."pir_response_comments" from "anon";

revoke trigger on table "public"."pir_response_comments" from "anon";

revoke truncate on table "public"."pir_response_comments" from "anon";

revoke update on table "public"."pir_response_comments" from "anon";

revoke delete on table "public"."pir_response_comments" from "authenticated";

revoke insert on table "public"."pir_response_comments" from "authenticated";

revoke references on table "public"."pir_response_comments" from "authenticated";

revoke select on table "public"."pir_response_comments" from "authenticated";

revoke trigger on table "public"."pir_response_comments" from "authenticated";

revoke truncate on table "public"."pir_response_comments" from "authenticated";

revoke update on table "public"."pir_response_comments" from "authenticated";

revoke delete on table "public"."pir_response_comments" from "service_role";

revoke insert on table "public"."pir_response_comments" from "service_role";

revoke references on table "public"."pir_response_comments" from "service_role";

revoke select on table "public"."pir_response_comments" from "service_role";

revoke trigger on table "public"."pir_response_comments" from "service_role";

revoke truncate on table "public"."pir_response_comments" from "service_role";

revoke update on table "public"."pir_response_comments" from "service_role";

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

alter table "public"."pir_response_comments" drop constraint "pir_response_comments_response_id_fkey";

alter table "public"."pir_response_comments" drop constraint "pir_response_comments_user_id_fkey";

alter table "public"."pir_response_component_materials" drop constraint "pir_response_component_materials_component_id_fkey";

alter table "public"."pir_response_components" drop constraint "pir_response_components_pir_response_id_fkey";

drop function if exists "public"."check_supplier_response_access_and_log"(response_id uuid);

drop function if exists "public"."is_company_member_or_admin"(p_company_id uuid);

drop function if exists "public"."update_question_order"(p_updates jsonb);

drop function if exists "public"."update_updated_at_column"();

drop view if exists "public"."v_question_bank_numbered";

alter table "public"."pir_response_comments" drop constraint "pir_response_comments_pkey";

alter table "public"."pir_response_component_materials" drop constraint "pir_response_component_materials_pkey";

alter table "public"."pir_response_components" drop constraint "pir_response_components_pkey";

drop index if exists "public"."idx_pir_response_comments_response_id";

drop index if exists "public"."idx_pir_response_comments_user_id";

drop index if exists "public"."idx_pir_response_component_materials_component_id";

drop index if exists "public"."idx_pir_response_components_response_id";

drop index if exists "public"."pir_response_comments_pkey";

drop index if exists "public"."pir_response_component_materials_pkey";

drop index if exists "public"."pir_response_components_pkey";

drop table "public"."pir_response_comments";

drop table "public"."pir_response_component_materials";

drop table "public"."pir_response_components";

alter type "public"."question_type" rename to "question_type__old_version_to_be_dropped";

create type "public"."question_type" as enum ('text', 'number', 'boolean', 'single_select', 'multi_select', 'date', 'file', 'LIST_TABLE');

alter table "public"."questions" alter column type type "public"."question_type" using type::text::"public"."question_type";

drop type "public"."question_type__old_version_to_be_dropped";

alter table "public"."pir_responses" drop column "customer_review_status";

set check_function_bodies = off;

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
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status = 'in_review' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_review' AND NEW.status IN ('approved', 'flagged', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'flagged' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$function$
;

create policy "Suppliers can manage their responses"
on "public"."pir_responses"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM (pir_requests pir
     JOIN company_users cu ON ((cu.company_id = pir.supplier_company_id)))
  WHERE ((cu.user_id = auth.uid()) AND (pir.id = pir_responses.pir_id)))));



