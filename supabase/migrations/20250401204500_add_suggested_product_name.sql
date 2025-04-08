-- Add column to store suggested product names for PIRs when product doesn't exist yet
ALTER TABLE public.pir_requests
ADD COLUMN suggested_product_name TEXT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.pir_requests.suggested_product_name IS 'Stores the product name suggested by the customer if the product_id is NULL (i.e., product does not exist yet).';