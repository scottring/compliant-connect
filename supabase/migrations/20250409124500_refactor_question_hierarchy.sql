-- Migration: Refactor question hierarchy to support arbitrary nesting

BEGIN;

-- 1. Rename the existing sections table
ALTER TABLE public.sections RENAME TO question_sections;

-- 2. Add parent_id column for self-referencing hierarchy
ALTER TABLE public.question_sections
ADD COLUMN parent_id UUID REFERENCES public.question_sections(id) ON DELETE SET NULL;

-- Add index for parent_id for performance
CREATE INDEX idx_question_sections_parent_id ON public.question_sections(parent_id);

-- 3. Add order_index to questions table
ALTER TABLE public.questions
ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;

-- Add index for ordering questions within a section
CREATE INDEX idx_questions_subsection_id_order_index ON public.questions(subsection_id, order_index); -- Use subsection_id for now, will rename later

-- 4. Migrate data from subsections into question_sections
-- This assumes subsections.id values don't clash with existing sections.id values.
-- If they might clash, a more complex approach using temporary tables or sequences is needed.
INSERT INTO public.question_sections (id, name, description, order_index, parent_id, created_at, updated_at)
SELECT
    ss.id,
    ss.name,
    ss.description,
    ss.order_index,
    ss.section_id AS parent_id, -- Set parent_id to the old section's ID
    ss.created_at,
    ss.updated_at
FROM
    public.subsections ss;

-- 5. Update questions table: point to new section IDs and rename column
-- First, drop the existing foreign key constraint
ALTER TABLE public.questions DROP CONSTRAINT questions_subsection_id_fkey;

-- Rename the column
ALTER TABLE public.questions RENAME COLUMN subsection_id TO section_id;

-- Add the new foreign key constraint referencing question_sections
ALTER TABLE public.questions
ADD CONSTRAINT questions_section_id_fkey FOREIGN KEY (section_id)
REFERENCES public.question_sections(id) ON DELETE CASCADE; -- Or SET NULL depending on desired behavior

-- Recreate the index with the new column name
DROP INDEX idx_questions_section_id_order_index;
CREATE INDEX idx_questions_section_id_order_index ON public.questions(section_id, order_index);

-- 6. Drop the old subsections table
DROP TABLE public.subsections;

-- 7. Add comments for clarity
COMMENT ON TABLE public.question_sections IS 'Stores hierarchical sections for the question bank.';
COMMENT ON COLUMN public.question_sections.parent_id IS 'References the parent section for nesting.';
COMMENT ON COLUMN public.questions.section_id IS 'References the immediate parent section in question_sections.';
COMMENT ON COLUMN public.questions.order_index IS 'Display order of the question within its parent section.';

COMMIT;


-- 8. Create view to calculate hierarchical numbers
CREATE OR REPLACE VIEW public.v_question_bank_numbered AS
WITH RECURSIVE section_hierarchy AS (
    -- Anchor member: Start with root sections (no parent)
    SELECT
        id,
        name,
        order_index,
        parent_id,
        1 AS level, -- Root level is 1
        order_index::text AS path_string -- Start path with root order index
    FROM
        public.question_sections
    WHERE
        parent_id IS NULL

    UNION ALL

    -- Recursive member: Add child sections
    SELECT
        qs.id,
        qs.name,
        qs.order_index,
        qs.parent_id,
        sh.level + 1, -- Increment level
        sh.path_string || '.' || qs.order_index::text -- Append child order index to path
    FROM
        public.question_sections qs
    JOIN
        section_hierarchy sh ON qs.parent_id = sh.id
)
-- Main query joining questions to the hierarchy
SELECT
    q.id AS question_id,
    q.text AS question_text,
    q.description AS question_description,
    q.type AS question_type,
    q.required AS question_required,
    q.options AS question_options,
    q.created_at AS question_created_at,
    q.updated_at AS question_updated_at,
    sh.id AS section_id,
    sh.name AS section_name,
    sh.path_string || '.' ||
        ROW_NUMBER() OVER (PARTITION BY sh.id ORDER BY q.order_index ASC)::text AS hierarchical_number,
    sh.level AS section_level,
    q.order_index AS question_order_index -- Include for potential frontend sorting if needed
FROM
    public.questions q
JOIN
    section_hierarchy sh ON q.section_id = sh.id
ORDER BY
    sh.path_string, -- Sort primarily by the section path
    q.order_index; -- Then by question order within the section

COMMENT ON VIEW public.v_question_bank_numbered IS 'Provides questions with a calculated hierarchical number based on section nesting and order.';
