-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Allow authenticated read access to roles" ON roles;
DROP POLICY IF EXISTS "Allow admin full access to roles" ON roles;

-- Create new, simplified policies for roles table
CREATE POLICY "Public can read roles"
  ON roles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- Create a view for user roles that avoids recursion
CREATE OR REPLACE VIEW user_role_names AS
SELECT 
  ur.user_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Update the login check function to use the view
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