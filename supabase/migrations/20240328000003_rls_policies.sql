-- Create helpful views for data access
CREATE VIEW public.company_relationships_view AS
SELECT 
    cr.*,
    c1.name as customer_name,
    c2.name as supplier_name
FROM public.company_relationships cr
JOIN public.companies c1 ON cr.customer_id = c1.id
JOIN public.companies c2 ON cr.supplier_id = c2.id;

CREATE VIEW public.product_access_view AS
SELECT 
    p.*,
    c.name as supplier_name
FROM public.products p
JOIN public.companies c ON p.supplier_id = c.id;

CREATE VIEW public.pir_access_view AS
SELECT 
    pir.*,
    p.name as product_name,
    c1.name as customer_name,
    c2.name as supplier_name
FROM public.pir_requests pir
JOIN public.products p ON pir.product_id = p.id
JOIN public.companies c1 ON pir.customer_id = c1.id
JOIN public.companies c2 ON p.supplier_id = c2.id;

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_answer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pir_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pir_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pir_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_comments ENABLE ROW LEVEL SECURITY;

-- Company Management Policies
CREATE POLICY "Users can view their own company"
    ON public.companies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.company_id = companies.id
        )
    );

CREATE POLICY "Users can view companies they have relationships with"
    ON public.companies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_relationships cr
            JOIN public.company_users cu ON cu.company_id = cr.customer_id OR cu.company_id = cr.supplier_id
            WHERE cu.user_id = auth.uid()
            AND (cr.customer_id = companies.id OR cr.supplier_id = companies.id)
        )
    );

-- Company Users Policies
CREATE POLICY "Users can view members of their company"
    ON public.company_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.company_id = company_users.company_id
        )
    );

-- Company Relationships Policies
CREATE POLICY "Users can view relationships involving their company"
    ON public.company_relationships
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = auth.uid()
            AND (cu.company_id = company_relationships.customer_id 
                 OR cu.company_id = company_relationships.supplier_id)
        )
    );

-- Question Bank Policies
CREATE POLICY "Everyone can view questions"
    ON public.questions
    FOR SELECT
    USING (true);

-- Drop existing tag policies
DROP POLICY IF EXISTS "Everyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Admin users can manage tags" ON public.tags;

-- Create new tag policies
CREATE POLICY "Everyone can view tags"
    ON public.tags
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create tags"
    ON public.tags
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update own tags"
    ON public.tags
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete own tags"
    ON public.tags
    FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Everyone can view sections"
    ON public.sections
    FOR SELECT
    USING (true);

CREATE POLICY "Everyone can view subsections"
    ON public.subsections
    FOR SELECT
    USING (true);

CREATE POLICY "Everyone can view question tags"
    ON public.question_tags
    FOR SELECT
    USING (true);

-- Product Policies
CREATE POLICY "Suppliers can manage their products"
    ON public.products
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.company_id = products.supplier_id
        )
    );

CREATE POLICY "Customers can view products from their suppliers"
    ON public.products
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_relationships cr
            JOIN public.company_users cu ON cu.company_id = cr.customer_id
            WHERE cu.user_id = auth.uid()
            AND cr.supplier_id = products.supplier_id
        )
    );

-- Product Answers Policies
CREATE POLICY "Suppliers can manage their product answers"
    ON public.product_answers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.company_users cu ON cu.company_id = p.supplier_id
            WHERE cu.user_id = auth.uid()
            AND p.id = product_answers.product_id
        )
    );

CREATE POLICY "Customers can view approved answers from their suppliers"
    ON public.product_answers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.company_relationships cr ON cr.supplier_id = p.supplier_id
            JOIN public.company_users cu ON cu.company_id = cr.customer_id
            WHERE cu.user_id = auth.uid()
            AND p.id = product_answers.product_id
            AND product_answers.approved_at IS NOT NULL
        )
    );

-- PIR Policies
CREATE POLICY "Users can view PIRs involving their company"
    ON public.pir_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = auth.uid()
            AND (
                cu.company_id = pir_requests.customer_id
                OR 
                -- Check direct supplier ID on PIR request OR via product link
                cu.company_id = pir_requests.supplier_company_id 
                OR 
                cu.company_id = (
                    SELECT supplier_id FROM public.products 
                    WHERE id = pir_requests.product_id
                )
            )
        )
    );

CREATE POLICY "Customers can create PIRs"
    ON public.pir_requests
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.company_id = pir_requests.customer_id
        )
    );

-- PIR Responses Policies
CREATE POLICY "Suppliers can manage their responses"
    ON public.pir_responses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.pir_requests pir
            JOIN public.products p ON p.id = pir.product_id
            JOIN public.company_users cu ON cu.company_id = p.supplier_id
            WHERE cu.user_id = auth.uid()
            AND pir.id = pir_responses.pir_id
        )
    );

CREATE POLICY "Customers can view responses to their PIRs"
    ON public.pir_responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pir_requests pir
            JOIN public.company_users cu ON cu.company_id = pir.customer_id
            WHERE cu.user_id = auth.uid()
            AND pir.id = pir_responses.pir_id
        )
    );

-- Review System Policies
CREATE POLICY "Users can view flags on their responses"
    ON public.response_flags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pir_responses pr
            JOIN public.pir_requests pir ON pir.id = pr.pir_id
            JOIN public.company_users cu ON (
                cu.company_id = pir.customer_id
                OR cu.company_id = (
                    SELECT supplier_id FROM public.products 
                    WHERE id = pir.product_id
                )
            )
            WHERE cu.user_id = auth.uid()
            AND pr.id = response_flags.response_id
        )
    );

CREATE POLICY "Users can view comments on flags they can see"
    ON public.response_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.response_flags rf
            JOIN public.pir_responses pr ON pr.id = rf.response_id
            JOIN public.pir_requests pir ON pir.id = pr.pir_id
            JOIN public.company_users cu ON (
                cu.company_id = pir.customer_id
                OR cu.company_id = (
                    SELECT supplier_id FROM public.products 
                    WHERE id = pir.product_id
                )
            )
            WHERE cu.user_id = auth.uid()
            AND rf.id = response_comments.flag_id
        )
    );
