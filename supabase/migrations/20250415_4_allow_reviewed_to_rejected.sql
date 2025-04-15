-- Allow reviewed to rejected transition in PIR status
CREATE OR REPLACE FUNCTION public.validate_pir_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only validate if status is being changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'in_progress' THEN
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('reviewed', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'rejected' AND NEW.status = 'resubmitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'submitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'reviewed' THEN
    RETURN NEW;
  ELSIF OLD.status = 'reviewed' AND NEW.status = 'rejected' THEN -- Add this transition
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update schema version
INSERT INTO public.schema_migrations (version, statements) 
VALUES (
    '20250415_4_allow_reviewed_to_rejected',
    'Allow transition from reviewed to rejected status in PIRs'
); 