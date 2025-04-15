-- Create a new enum type with all desired values
CREATE TYPE public.pir_status_new AS ENUM (
    'draft',
    'sent',
    'in_progress',
    'in_review',
    'flagged',
    'submitted',
    'reviewed',
    'approved',
    'rejected',
    'resubmitted',
    'canceled'
);

-- Update the table to use the new type
ALTER TABLE public.pirs 
    ALTER COLUMN status TYPE public.pir_status_new 
    USING (status::text::public.pir_status_new);

-- Drop the old type
DROP TYPE public.pir_status;

-- Rename the new type to the original name
ALTER TYPE public.pir_status_new RENAME TO pir_status;

-- Grant usage on the type to authenticated users
GRANT USAGE ON TYPE public.pir_status TO authenticated;

-- Update schema version
INSERT INTO public.schema_migrations (version, statements) 
VALUES (
    '20250415_3_safe_pir_status_update',
    'Safe update of pir_status enum to include all required values'
); 