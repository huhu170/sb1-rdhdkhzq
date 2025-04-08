-- 删除可能导致递归的策略
DROP POLICY IF EXISTS "Allow admin full access to roles" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Allow authenticated read access to roles" ON roles;
DROP POLICY IF EXISTS "Public can read roles" ON roles;

-- 创建新的非递归策略
-- 1. 所有人都可以读取角色
CREATE POLICY "Everyone can view roles"
  ON roles FOR SELECT
  USING (true);

-- 2. 只有admin@sijoer.com可以管理角色（不使用roles表查询）
CREATE POLICY "Only superadmin can manage roles"
  ON roles FOR ALL
  USING (
    auth.email() = 'admin@sijoer.com'
  )
  WITH CHECK (
    auth.email() = 'admin@sijoer.com'
  );

-- 刷新用户角色视图，避免递归
DROP VIEW IF EXISTS user_role_names;
CREATE OR REPLACE VIEW user_role_names AS
SELECT DISTINCT
  ur.user_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id; 