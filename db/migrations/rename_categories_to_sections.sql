-- Rename table from question_categories to question_sections
ALTER TABLE question_categories RENAME TO question_sections;

-- Update the reference in questions table
ALTER TABLE questions 
  RENAME CONSTRAINT questions_category_id_fkey TO questions_section_id_fkey;

ALTER TABLE questions 
  RENAME COLUMN category_id TO section_id;

-- Update any existing RLS policies
DROP POLICY IF EXISTS "view_categories" ON question_sections;
CREATE POLICY "view_sections" ON question_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "manage_categories" ON question_sections;
CREATE POLICY "manage_sections" ON question_sections FOR ALL USING (true);

-- Update column name in question_sections for clarity
ALTER TABLE question_sections 
  RENAME COLUMN parent_id TO parent_section_id;

-- Update emergency functions if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'emergency_create_category') THEN
    ALTER FUNCTION emergency_create_category() RENAME TO emergency_create_section;
  END IF;
END $$;

-- Comment to explain the change
COMMENT ON TABLE question_sections IS 'Question sections and subsections (formerly question_categories)'; 