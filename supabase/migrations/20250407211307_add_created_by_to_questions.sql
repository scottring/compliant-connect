-- Add created_by column to questions table as a workaround for persistent RPC error

ALTER TABLE public.questions
ADD COLUMN created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Optional: Add a comment explaining why this was added
COMMENT ON COLUMN public.questions.created_by IS 'Reference to the user who created the question. Added as a workaround for persistent RPC error during question creation, even after correcting the create_question_with_tags function.';

-- Note: The create_question_with_tags function defined in previous migrations
-- *should* work without inserting into this column. This addition aims to satisfy
-- whatever underlying check is still causing the "column does not exist" error.
