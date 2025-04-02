-- Add new statuses for N-round PIR workflow
-- Note: Existing values ('draft', 'submitted', 'in_review', 'flagged', 'approved', 'rejected') are kept for compatibility,
-- but the application logic should primarily use the new flow statuses.

-- Add 'pending_supplier' status (request sent, awaiting supplier response)
ALTER TYPE public.pir_status ADD VALUE IF NOT EXISTS 'pending_supplier';

-- Add 'pending_review' status (supplier submitted, awaiting customer review)
ALTER TYPE public.pir_status ADD VALUE IF NOT EXISTS 'pending_review';

-- Add 'accepted' status (customer accepted the response)
-- This replaces the semantic meaning of 'approved' for the new flow.
ALTER TYPE public.pir_status ADD VALUE IF NOT EXISTS 'accepted';

-- 'revision_requested' is implicitly handled by transitioning back to 'pending_supplier'
-- 'rejected' already exists and can signify final rejection.
-- 'draft' already exists for initial creation.