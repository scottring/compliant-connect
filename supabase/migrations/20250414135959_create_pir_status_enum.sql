-- Create the pir_status enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pir_status') THEN
        CREATE TYPE public.pir_status AS ENUM ('draft');
    END IF;
END $$;