CREATE OR REPLACE VIEW "public"."v_question_bank_numbered_temp" as
WITH RECURSIVE section_hierarchy AS (
    SELECT
        question_sections.id,
        question_sections.name,
        question_sections.order_index,
        question_sections.parent_id,
        1 AS level,
        (question_sections.order_index)::text AS path_string
    FROM
        question_sections
    WHERE (question_sections.parent_id IS NULL)
    UNION ALL
    SELECT
        qs.id,
        qs.name,
        qs.order_index,
        qs.parent_id,
        (sh_1.level + 1),
        ((sh_1.path_string || '.'::text) || (qs.order_index)::text)
    FROM (question_sections qs JOIN section_hierarchy sh_1 ON ((qs.parent_id = sh_1.id)))
)
SELECT
    q.id AS question_id,
    q.text AS question_text,
    q.description AS question_description,
    q.type AS question_type, -- This column in 'questions' table is still question_type__old_version_to_be_dropped at this point
    q.required AS question_required,
    q.options AS question_options,
    q.created_at AS question_created_at,
    q.updated_at AS question_updated_at,
    sh.id AS section_id,
    sh.name AS section_name,
    ((sh.path_string || '.'::text) || (row_number() OVER (PARTITION BY sh.id ORDER BY q.order_index))::text) AS hierarchical_number,
    sh.level AS section_level,
    q.order_index AS question_order_index
FROM (questions q JOIN section_hierarchy sh ON ((q.section_id = sh.id)))
ORDER BY sh.path_string, q.order_index;