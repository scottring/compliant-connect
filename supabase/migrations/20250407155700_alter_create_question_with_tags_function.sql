-- Drop the existing function first (required to change signature)
DROP FUNCTION IF EXISTS public.create_question_with_tags(uuid, text, text, public.question_type, boolean, jsonb, uuid[]);

-- Recreate the function with the new p_table_config parameter
CREATE OR REPLACE FUNCTION public.create_question_with_tags(
    p_subsection_id uuid,
    p_text text,
    p_description text,
    p_type public.question_type,
    p_required boolean,
    p_options jsonb,
    p_tag_ids uuid[],
    p_table_config jsonb default null -- New parameter for table configuration
)
RETURNS json -- Return JSON containing the new question ID
LANGUAGE plpgsql
SECURITY DEFINER -- Important for RLS bypass within the function
AS $$
DECLARE
    new_question_id uuid;
    tag_id uuid;
BEGIN
    -- Insert the new question, including the table_config (removed created_by)
    INSERT INTO public.questions (subsection_id, text, description, type, required, options, table_config)
    VALUES (p_subsection_id, p_text, p_description, p_type, p_required, p_options, p_table_config)
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

-- Re-grant execute permission with the new function signature
-- Note: The parameter list must match exactly, including the default value if applicable
GRANT EXECUTE ON FUNCTION public.create_question_with_tags(uuid, text, text, public.question_type, boolean, jsonb, uuid[], jsonb) TO authenticated;

-- Optional: Revoke execute from the old signature if it somehow still exists (should be dropped)
-- REVOKE EXECUTE ON FUNCTION public.create_question_with_tags(uuid, text, text, public.question_type, boolean, jsonb, uuid[]) FROM authenticated;
