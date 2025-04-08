-- 修复account_type约束问题

-- 1. 删除现有约束
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS check_account_type;

-- 2. 为现有记录设置默认值
UPDATE user_profiles
SET account_type = 'customer'
WHERE account_type IS NULL;

-- 3. 添加新的约束条件，允许customer和admin
ALTER TABLE user_profiles
ADD CONSTRAINT check_account_type
CHECK (account_type IN ('customer', 'admin'));

-- 4. 重新创建视图
DROP VIEW IF EXISTS user_view;
CREATE VIEW user_view AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  up.display_name,
  up.phone,
  up.status,
  up.account_type,
  au.last_sign_in_at as last_login_at,
  (
    SELECT ARRAY_AGG(r.name)
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = au.id
  ) as roles
FROM 
  auth.users au
LEFT JOIN 
  user_profiles up ON au.id = up.id;

-- 5. 确保视图访问权限
GRANT SELECT ON user_view TO authenticated;
GRANT SELECT ON user_view TO anon;
GRANT SELECT ON user_view TO service_role; 