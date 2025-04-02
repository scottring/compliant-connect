-- Add contact information columns to the companies table

ALTER TABLE public.companies
ADD COLUMN contact_name TEXT,
ADD COLUMN contact_email TEXT,
ADD COLUMN contact_phone TEXT;

-- Note: Consider adding constraints like NOT NULL or UNIQUE if appropriate
-- Example: ADD CONSTRAINT companies_contact_email_check CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
