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
  IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'in_progress' THEN -- Keep existing
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'submitted' THEN -- Keep existing (from previous migration)
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'submitted' THEN -- Keep existing
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status IN ('reviewed', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'rejected' AND NEW.status = 'resubmitted' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'submitted' THEN -- Keep existing
    RETURN NEW;
  ELSIF OLD.status = 'resubmitted' AND NEW.status = 'reviewed' THEN -- *** Add this condition ***
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$function$