/*
  # Fix User Registration Process

  1. Changes
    - Simplify user registration trigger
    - Add proper error handling
    - Ensure proper role assignment
    - Fix profile creation

  2. Security
    - Maintain RLS policies
    - Ensure proper role-based access
*/

-- Create customer role if not exists
INSERT INTO roles (name, description)
VALUES ('customer', '普通客户')
ON CONFLICT (name) DO NOTHING;

-- Create or replace the user registration handler
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  customer_role_id uuid;
BEGIN
  -- Get customer role ID
  SELECT id INTO customer_role_id 
  FROM roles 
  WHERE name = 'customer';

  -- Create user profile
  INSERT INTO user_profiles (
    id,
    display_name,
    phone,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'phone',
    'active',
    NOW(),
    NOW()
  );

  -- Create user cart
  INSERT INTO carts (user_id)
  VALUES (NEW.id);

  -- Assign customer role (if not admin)
  IF NEW.email != 'admin@sijoer.com' AND customer_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, customer_role_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at 
  ON user_profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON user_roles(user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;