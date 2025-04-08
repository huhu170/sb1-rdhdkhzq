-- 紧急修复脚本 - 通过多步骤安全更新

-- 第一阶段: 查看表结构和约束
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'user_profiles' 
AND constraint_name = 'check_account_type';
-- 查看当前user_profiles表数据状态
SELECT id, account_type FROM user_profiles;

-- 第二阶段: 临时放宽约束而不是直接删除
BEGIN;

-- 第一步: 修改表添加一个临时列
ALTER TABLE user_profiles ADD COLUMN temp_account_type VARCHAR(20);

-- 第二步: 将有效数据复制到临时列
UPDATE user_profiles SET temp_account_type = 
  CASE 
    WHEN account_type IN ('customer', 'admin') THEN account_type
    ELSE 'customer'  -- 默认值
  END;

-- 第三步: 删除原始列的约束
ALTER TABLE user_profiles DROP CONSTRAINT check_account_type;

-- 第四步: 删除原始列
ALTER TABLE user_profiles DROP COLUMN account_type;

-- 第五步: 将临时列重命名为原始列名
ALTER TABLE user_profiles RENAME COLUMN temp_account_type TO account_type;

-- 第六步: 添加新约束
ALTER TABLE user_profiles ADD CONSTRAINT check_account_type 
  CHECK (account_type IN ('customer', 'admin'));

COMMIT;

-- 第三阶段: 重新创建视图
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

-- 授予视图访问权限
GRANT SELECT ON user_view TO authenticated;
GRANT SELECT ON user_view TO anon;
GRANT SELECT ON user_view TO service_role; 