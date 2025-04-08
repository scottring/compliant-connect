-- Create custom types for status management
CREATE TYPE public.relationship_status AS ENUM (
    'pending',
    'active',
    'inactive',
    'rejected'
);

CREATE TYPE public.pir_status AS ENUM (
    'draft',
    'submitted',
    'in_review',
    'flagged',
    'approved',
    'rejected'
);

CREATE TYPE public.response_status AS ENUM (
    'draft',
    'submitted',
    'flagged',
    'approved'
);

CREATE TYPE public.flag_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'rejected'
);

CREATE TYPE public.question_type AS ENUM (
    'text',
    'number',
    'boolean',
    'single_select',
    'multi_select',
    'date',
    'file'
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql'; 