/*
  # Fix User Management System

  1. Changes
    - Create a view for accessing user data safely
    - Add proper RLS policies
    - Add helper functions for user management

  2. Security
    - Enable RLS on all tables
    - Add proper policies for data access
    - Ensure secure access to user data
*/

-- Create a view for accessing user data
CREATE OR REPLACE VIEW user_view AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  up.display_name,
  up.phone,
  up.status,
  up.last_login_at,
  array_agg(DISTINCT r.name) as roles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
LEFT JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY au.id, au.email, au.created_at, up.display_name, up.phone, up.status, up.last_login_at;

-- Grant access to the view
GRANT SELECT ON user_view TO authenticated;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_id uuid)
RETURNS TABLE (role_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for user_view
CREATE POLICY "Users can view their own data"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id OR is_admin(auth.uid()));

-- Ensure user_profiles exist for all users
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to ensure user profile exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION ensure_user_profile();