-- 重置超级管理员账号权限

-- 1. 确认admin@sijoer.com的用户ID
SELECT id, email FROM auth.users WHERE email = 'admin@sijoer.com';

-- 2. 确保超级管理员账号有正确的account_type
UPDATE user_profiles
SET account_type = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@sijoer.com'
);

-- 3. 确保admin角色存在
INSERT INTO roles (name, description) 
VALUES 
  ('admin', '管理员 - 可以访问管理后台')
ON CONFLICT (name) 
DO NOTHING;

-- 4. 确保超级管理员拥有admin角色
INSERT INTO user_roles (user_id, role_id)
SELECT 
  auth.users.id, 
  roles.id
FROM 
  auth.users, 
  roles
WHERE 
  auth.users.email = 'admin@sijoer.com' 
  AND roles.name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.users.id AND role_id = roles.id
  );

-- 5. 确保admin也是super_admin角色
DO $$
DECLARE
  super_role_id UUID;
  admin_user_id UUID;
BEGIN
  -- 获取超级管理员角色ID (如果不存在则创建)
  INSERT INTO roles (name, description) 
  VALUES ('super_admin', '超级管理员 - 拥有所有权限') 
  ON CONFLICT (name) DO NOTHING;
  
  -- 获取role_id和user_id
  SELECT id INTO super_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@sijoer.com';
  
  -- 分配超级管理员角色
  IF super_role_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (admin_user_id, super_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$; 