-- Drop existing policies and views that might interfere
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow insert during registration" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP VIEW IF EXISTS user_role_names;

-- Create a more efficient view for user roles
CREATE OR REPLACE VIEW user_role_names AS
SELECT DISTINCT
  ur.user_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Create index to improve role lookup performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Create new policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow profile creation during registration"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_role_names
      WHERE user_id = auth.uid()
      AND role_name = 'admin'
    )
  );

-- Ensure admin user exists and has correct role
DO $$ 
BEGIN
  -- Reset admin password if needed
  UPDATE auth.users
  SET encrypted_password = crypt('sijoer2024', gen_salt('bf'))
  WHERE email = 'admin@sijoer.com';

  -- Ensure admin role exists
  INSERT INTO roles (name, description)
  VALUES ('admin', '系统管理员')
  ON CONFLICT (name) DO NOTHING;

  -- Ensure admin user has admin role
  INSERT INTO user_roles (user_id, role_id)
  SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@sijoer.com'),
    (SELECT id FROM roles WHERE name = 'admin')
  ON CONFLICT DO NOTHING;

  -- Ensure customer role exists
  INSERT INTO roles (name, description)
  VALUES ('customer', '普通客户')
  ON CONFLICT (name) DO NOTHING;
END $$;

-- Create function to check user role
CREATE OR REPLACE FUNCTION check_user_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_role_names
    WHERE user_id = $1 
    AND role_name = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (id, display_name, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'active'
  );

  -- Create user cart
  INSERT INTO carts (user_id)
  VALUES (NEW.id);

  -- Assign customer role to new users
  IF NEW.email != 'admin@sijoer.com' THEN
    INSERT INTO user_roles (user_id, role_id)
    SELECT NEW.id, id FROM roles WHERE name = 'customer'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;