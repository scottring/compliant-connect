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
