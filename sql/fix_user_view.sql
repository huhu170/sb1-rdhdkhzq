-- 创建或更新用户视图，确保包含account_type字段

-- 1. 检查用户视图是否存在，如果存在则删除
DROP VIEW IF EXISTS user_view;

-- 2. 创建新的用户视图，包含所有必要字段
CREATE OR REPLACE VIEW user_view AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  up.display_name,
  up.phone,
  up.status,
  up.account_type,  -- 确保添加account_type字段
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
  
-- 3. 确保视图访问权限
GRANT SELECT ON user_view TO authenticated;
GRANT SELECT ON user_view TO anon;
GRANT SELECT ON user_view TO service_role; 