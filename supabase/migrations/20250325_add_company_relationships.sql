-- Create an enum for relationship status
CREATE TYPE relationship_status AS ENUM ('pending', 'active', 'inactive', 'blocked');

-- Create an enum for relationship type
CREATE TYPE relationship_type AS ENUM ('direct', 'indirect', 'potential');

-- Create company_relationships table
CREATE TABLE IF NOT EXISTS public.company_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status relationship_status NOT NULL DEFAULT 'pending',
  type relationship_type NOT NULL DEFAULT 'direct',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(customer_id, supplier_id)
);

-- Enable Row Level Security
ALTER TABLE public.company_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies for company_relationships
CREATE POLICY "Users can view relationships for their companies"
ON public.company_relationships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE (cu.company_id = company_relationships.customer_id OR cu.company_id = company_relationships.supplier_id)
    AND cu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create relationships for their companies"
ON public.company_relationships
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = company_relationships.customer_id
    AND cu.user_id = auth.uid()
    AND cu.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can update relationships for their companies"
ON public.company_relationships
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE (cu.company_id = company_relationships.customer_id OR cu.company_id = company_relationships.supplier_id)
    AND cu.user_id = auth.uid()
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.company_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at(); 