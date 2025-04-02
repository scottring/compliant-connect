-- Function to create a question and associate tags atomically
CREATE OR REPLACE FUNCTION public.create_question_with_tags(
    p_subsection_id uuid,
    p_text text,
    p_description text,
    p_type public.question_type, -- Use the existing enum type
    p_required boolean,
    p_options jsonb,
    p_tag_ids uuid[] -- Array of tag UUIDs to associate
)
RETURNS public.questions -- Return the created question row
LANGUAGE plpgsql
SECURITY DEFINER -- Important: Run with definer privileges to bypass RLS if needed for inserts
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

-- Grant execute permission to authenticated users
-- Adjust role if needed (e.g., service_role if called from backend)
GRANT EXECUTE ON FUNCTION public.create_question_with_tags(uuid, text, text, public.question_type, boolean, jsonb, uuid[]) TO authenticated;
