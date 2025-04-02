-- Seed data for local development

-- Insert the main 'Stacks' company if it doesn't exist
INSERT INTO public.companies (id, name, contact_name, contact_email)
VALUES ('32be37e6-32e0-4a46-9eed-bfb850a3ea6b', 'Stacks', 'Scott Kaufman', 'scott.kaufman@stacksdata.com')
ON CONFLICT (id) DO NOTHING;

-- Insert a sample supplier company if it doesn't exist
INSERT INTO public.companies (id, name, contact_name, contact_email)
VALUES ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Test Supplier Inc.', 'Test Contact', 'test.supplier@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create a relationship between Stacks (customer) and Test Supplier Inc. (supplier)
INSERT INTO public.company_relationships (customer_id, supplier_id, status, type)
VALUES ('32be37e6-32e0-4a46-9eed-bfb850a3ea6b', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'active', 'supplier')
ON CONFLICT (customer_id, supplier_id) DO NOTHING;

-- Grant pg_net usage to postgres role (adjust role if needed for your setup)
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;

-- Add other essential seed data here if needed (e.g., default users, roles)