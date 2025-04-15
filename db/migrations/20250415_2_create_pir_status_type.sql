-- Create pir_status type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pir_status') THEN
        CREATE TYPE public.pir_status AS ENUM (
            'draft',
            'sent',
            'in_progress',
            'submitted',
            'reviewed',
            'rejected',
            'resubmitted',
            'canceled',
            'in_review',
            'flagged',
            'approved'
        );
    END IF;
END $$;

-- Grant usage on the type to authenticated users
GRANT USAGE ON TYPE public.pir_status TO authenticated;

-- Update schema version
INSERT INTO public.schema_migrations (version, statements) 
VALUES (20250415002, 'Create pir_status type'); 