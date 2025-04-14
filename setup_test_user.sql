-- Setup Test User in Staging Environment

-- 1. First, let's get the companies
SELECT id, name FROM companies;

-- 2. Create a test user in auth.users
-- Note: You'll need to run this in the Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'test@example.com',
  '$2a$10$Ql1JwKnZtQZGEVFCIFZ9UOO.eMQZH.7QVnQT.qJQFMNDKVpQO0QQy', -- This is 'password'
  now(),
  null,
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- 3. Associate the user with a company
-- Replace 'USER_ID' with the id returned from the previous query
-- Replace 'COMPANY_ID' with the id of the company you want to associate the user with
INSERT INTO company_users (user_id, company_id, role)
VALUES ('USER_ID', 'COMPANY_ID', 'admin');

-- 4. Verify the setup
SELECT u.email, c.name as company_name, cu.role
FROM auth.users u
JOIN company_users cu ON u.id = cu.user_id
JOIN companies c ON cu.company_id = c.id;