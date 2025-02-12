/*
  # Create admin user

  1. Changes
    - Create admin user with proper password hashing
    - Grant admin role to the user
*/

-- Create admin user with proper password hashing
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
  'f7f7f7f7-f7f7-f7f7-f7f7-f7f7f7f7f7f7',
  'authenticated',
  'authenticated',
  'admin@sijoer.com',
  crypt('sijoer2024', gen_salt('bf', 10)),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE
SET encrypted_password = crypt('sijoer2024', gen_salt('bf', 10));

-- Ensure admin role exists and is assigned
DO $$ 
BEGIN
  -- Ensure admin role exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@sijoer.com') THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Ensure user has admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'admin'
    AND ur.user_id = 'f7f7f7f7-f7f7-f7f7-f7f7-f7f7f7f7f7f7'
  ) THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT 'f7f7f7f7-f7f7-f7f7-f7f7-f7f7f7f7f7f7', r.id
    FROM roles r
    WHERE r.name = 'admin';
  END IF;
END $$;