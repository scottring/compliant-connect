-- Create UUID generation function
CREATE OR REPLACE FUNCTION generate_uuid() RETURNS uuid AS $$
BEGIN
    RETURN md5(random()::text || clock_timestamp()::text)::uuid;
END;
$$ LANGUAGE plpgsql;

-- Create test table
CREATE TABLE test_table (
    id UUID PRIMARY KEY DEFAULT generate_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 