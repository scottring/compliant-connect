CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new record, allow any initial status
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Define valid transitions
    IF (OLD.status = 'draft' AND NEW.status IN ('sent', 'canceled')) OR
       (OLD.status = 'sent' AND NEW.status IN ('in_progress', 'rejected', 'canceled')) OR
       (OLD.status = 'in_progress' AND NEW.status IN ('submitted', 'rejected', 'canceled')) OR
       (OLD.status = 'submitted' AND NEW.status IN ('in_review', 'rejected', 'canceled')) OR
       (OLD.status = 'in_review' AND NEW.status IN ('reviewed', 'flagged', 'rejected', 'canceled')) OR
       (OLD.status = 'reviewed' AND NEW.status IN ('approved', 'rejected', 'canceled')) OR
       (OLD.status = 'flagged' AND NEW.status IN ('reviewed', 'rejected', 'canceled')) OR
       (OLD.status = 'rejected' AND NEW.status IN ('resubmitted', 'canceled')) OR
       (OLD.status = 'resubmitted' AND NEW.status IN ('in_review', 'rejected', 'canceled')) OR
       -- Allow transition to canceled from any status except already canceled
       (NEW.status = 'canceled' AND OLD.status != 'canceled') OR
       -- No transition (same status)
       (OLD.status = NEW.status) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS validate_pir_status_transition_trigger ON pirs;

-- Create the trigger
CREATE TRIGGER validate_pir_status_transition_trigger
    BEFORE UPDATE OF status ON pirs
    FOR EACH ROW
    EXECUTE FUNCTION validate_pir_status_transition(); 