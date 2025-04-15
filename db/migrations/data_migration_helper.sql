-- Data Migration Helper Script
-- Run these queries in the Supabase SQL Editor to migrate data from your development project to staging

-- 1. Export data from development project (oecravfbvupqgzfyizsi)
-- Run these in https://app.supabase.com/project/oecravfbvupqgzfyizsi/sql/new

-- Companies
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM companies
) t;

-- Company Relationships
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM company_relationships
) t;

-- Company Users
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM company_users
) t;

-- Profiles
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM profiles
) t;

-- Tags
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM tags
) t;

-- Question Sections
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM question_sections
) t;

-- Questions
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM questions
) t;

-- Question Tags
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM question_tags
) t;

-- Products
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM products
) t;

-- PIR Requests
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM pir_requests
) t;

-- PIR Tags
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM pir_tags
) t;

-- PIR Responses
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM pir_responses
) t;

-- PIR Response Components
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM pir_response_components
) t;

-- PIR Response Component Materials
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM pir_response_component_materials
) t;

-- PIR Response Comments
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM pir_response_comments
) t;

-- Response Flags
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM response_flags
) t;

-- Response Comments
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM response_comments
) t;

-- Product Answers
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM product_answers
) t;

-- Product Answer History
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM product_answer_history
) t;

-- 2. Import data to staging project (fubuiiecraslloezxshs)
-- Run these in https://app.supabase.com/project/fubuiiecraslloezxshs/sql/new
-- Replace the JSON arrays with the data exported from the development project

-- Companies
INSERT INTO companies (id, name, created_at, updated_at, contact_name, contact_email, contact_phone)
SELECT id, name, created_at, updated_at, contact_name, contact_email, contact_phone
FROM json_to_recordset('[PASTE_COMPANIES_JSON_HERE]')
AS x(id uuid, name text, created_at timestamptz, updated_at timestamptz, contact_name text, contact_email text, contact_phone text);

-- Company Relationships
INSERT INTO company_relationships (id, customer_id, supplier_id, status, type, created_at, updated_at)
SELECT id, customer_id, supplier_id, status, type, created_at, updated_at
FROM json_to_recordset('[PASTE_COMPANY_RELATIONSHIPS_JSON_HERE]')
AS x(id uuid, customer_id uuid, supplier_id uuid, status text, type text, created_at timestamptz, updated_at timestamptz);

-- Company Users
INSERT INTO company_users (id, company_id, user_id, role, created_at, updated_at)
SELECT id, company_id, user_id, role, created_at, updated_at
FROM json_to_recordset('[PASTE_COMPANY_USERS_JSON_HERE]')
AS x(id uuid, company_id uuid, user_id uuid, role text, created_at timestamptz, updated_at timestamptz);

-- Profiles
INSERT INTO profiles (id, first_name, last_name, created_at, updated_at)
SELECT id, first_name, last_name, created_at, updated_at
FROM json_to_recordset('[PASTE_PROFILES_JSON_HERE]')
AS x(id uuid, first_name text, last_name text, created_at timestamptz, updated_at timestamptz);

-- Tags
INSERT INTO tags (id, name, description, created_at, updated_at)
SELECT id, name, description, created_at, updated_at
FROM json_to_recordset('[PASTE_TAGS_JSON_HERE]')
AS x(id uuid, name text, description text, created_at timestamptz, updated_at timestamptz);

-- Question Sections
INSERT INTO question_sections (id, name, description, order_index, created_at, updated_at, parent_id)
SELECT id, name, description, order_index, created_at, updated_at, parent_id
FROM json_to_recordset('[PASTE_QUESTION_SECTIONS_JSON_HERE]')
AS x(id uuid, name text, description text, order_index int, created_at timestamptz, updated_at timestamptz, parent_id uuid);

-- Questions
INSERT INTO questions (id, section_id, text, description, type, options, required, created_at, updated_at, order_index)
SELECT id, section_id, text, description, type, options, required, created_at, updated_at, order_index
FROM json_to_recordset('[PASTE_QUESTIONS_JSON_HERE]')
AS x(id uuid, section_id uuid, text text, description text, type text, options jsonb, required boolean, created_at timestamptz, updated_at timestamptz, order_index int);

-- Question Tags
INSERT INTO question_tags (id, question_id, tag_id, created_at)
SELECT id, question_id, tag_id, created_at
FROM json_to_recordset('[PASTE_QUESTION_TAGS_JSON_HERE]')
AS x(id uuid, question_id uuid, tag_id uuid, created_at timestamptz);

-- Products
INSERT INTO products (id, supplier_id, name, description, created_at, updated_at)
SELECT id, supplier_id, name, description, created_at, updated_at
FROM json_to_recordset('[PASTE_PRODUCTS_JSON_HERE]')
AS x(id uuid, supplier_id uuid, name text, description text, created_at timestamptz, updated_at timestamptz);

-- PIR Requests
INSERT INTO pir_requests (id, product_id, customer_id, supplier_company_id, title, description, due_date, created_at, updated_at, suggested_product_name, status)
SELECT id, product_id, customer_id, supplier_company_id, title, description, due_date, created_at, updated_at, suggested_product_name, status
FROM json_to_recordset('[PASTE_PIR_REQUESTS_JSON_HERE]')
AS x(id uuid, product_id uuid, customer_id uuid, supplier_company_id uuid, title text, description text, due_date timestamptz, created_at timestamptz, updated_at timestamptz, suggested_product_name text, status text);

-- PIR Tags
INSERT INTO pir_tags (id, pir_id, tag_id, created_at)
SELECT id, pir_id, tag_id, created_at
FROM json_to_recordset('[PASTE_PIR_TAGS_JSON_HERE]')
AS x(id uuid, pir_id uuid, tag_id uuid, created_at timestamptz);

-- PIR Responses
INSERT INTO pir_responses (id, pir_id, question_id, answer, submitted_at, created_at, updated_at, status, customer_review_status)
SELECT id, pir_id, question_id, answer, submitted_at, created_at, updated_at, status, customer_review_status
FROM json_to_recordset('[PASTE_PIR_RESPONSES_JSON_HERE]')
AS x(id uuid, pir_id uuid, question_id uuid, answer jsonb, submitted_at timestamptz, created_at timestamptz, updated_at timestamptz, status text, customer_review_status text);

-- PIR Response Components
INSERT INTO pir_response_components (id, pir_response_id, component_name, position, order_index, created_at, updated_at)
SELECT id, pir_response_id, component_name, position, order_index, created_at, updated_at
FROM json_to_recordset('[PASTE_PIR_RESPONSE_COMPONENTS_JSON_HERE]')
AS x(id uuid, pir_response_id uuid, component_name text, position text, order_index int, created_at timestamptz, updated_at timestamptz);

-- PIR Response Component Materials
INSERT INTO pir_response_component_materials (id, component_id, material_name, percentage, recyclable, order_index, created_at, updated_at)
SELECT id, component_id, material_name, percentage, recyclable, order_index, created_at, updated_at
FROM json_to_recordset('[PASTE_PIR_RESPONSE_COMPONENT_MATERIALS_JSON_HERE]')
AS x(id uuid, component_id uuid, material_name text, percentage numeric, recyclable text, order_index int, created_at timestamptz, updated_at timestamptz);

-- PIR Response Comments
INSERT INTO pir_response_comments (id, response_id, user_id, comment_text, created_at)
SELECT id, response_id, user_id, comment_text, created_at
FROM json_to_recordset('[PASTE_PIR_RESPONSE_COMMENTS_JSON_HERE]')
AS x(id uuid, response_id uuid, user_id uuid, comment_text text, created_at timestamptz);

-- Response Flags
INSERT INTO response_flags (id, response_id, created_by, description, status, resolved_at, resolved_by, created_at, updated_at)
SELECT id, response_id, created_by, description, status, resolved_at, resolved_by, created_at, updated_at
FROM json_to_recordset('[PASTE_RESPONSE_FLAGS_JSON_HERE]')
AS x(id uuid, response_id uuid, created_by uuid, description text, status text, resolved_at timestamptz, resolved_by uuid, created_at timestamptz, updated_at timestamptz);

-- Response Comments
INSERT INTO response_comments (id, flag_id, user_id, comment, created_at)
SELECT id, flag_id, user_id, comment, created_at
FROM json_to_recordset('[PASTE_RESPONSE_COMMENTS_JSON_HERE]')
AS x(id uuid, flag_id uuid, user_id uuid, comment text, created_at timestamptz);

-- Product Answers
INSERT INTO product_answers (id, product_id, question_id, current_answer, approved_at, approved_by, created_at, updated_at)
SELECT id, product_id, question_id, current_answer, approved_at, approved_by, created_at, updated_at
FROM json_to_recordset('[PASTE_PRODUCT_ANSWERS_JSON_HERE]')
AS x(id uuid, product_id uuid, question_id uuid, current_answer jsonb, approved_at timestamptz, approved_by uuid, created_at timestamptz, updated_at timestamptz);

-- Product Answer History
INSERT INTO product_answer_history (id, product_answer_id, answer, approved_at, approved_by, created_at)
SELECT id, product_answer_id, answer, approved_at, approved_by, created_at
FROM json_to_recordset('[PASTE_PRODUCT_ANSWER_HISTORY_JSON_HERE]')
AS x(id uuid, product_answer_id uuid, answer jsonb, approved_at timestamptz, approved_by uuid, created_at timestamptz);