-- 确保超级管理员账号设置正确

-- 1. 确保admin@sijoer.com有正确的account_type
UPDATE user_profiles
SET account_type = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@sijoer.com'
);

-- 2. 确保admin用户角色存在
INSERT INTO roles (name, description) 
VALUES 
  ('admin', '管理员 - 可以访问管理后台')
ON CONFLICT (name) 
DO NOTHING;

-- 3. 确保超级管理员拥有admin角色
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

-- 4. 更新现有的拥有admin角色的账号
UPDATE user_profiles
SET account_type = 'admin'
WHERE id IN (
  SELECT ur.user_id 
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name = 'admin'
);

-- 5. 为现有没有角色的用户分配customer角色
DO $$
DECLARE
  customer_role_id UUID;
BEGIN
  -- 获取customer角色ID
  SELECT id INTO customer_role_id FROM roles WHERE name = 'customer';
  
  IF customer_role_id IS NOT NULL THEN
    -- 为所有没有角色的用户分配customer角色
    INSERT INTO user_roles (user_id, role_id)
    SELECT up.id, customer_role_id
    FROM user_profiles up
    LEFT JOIN user_roles ur ON up.id = ur.user_id
    WHERE ur.user_id IS NULL;
  END IF;
END $$; 