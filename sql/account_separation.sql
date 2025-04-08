-- 账号区分和自动角色分配机制SQL脚本

-- 1. 在user_profiles表中添加account_type字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'customer';
COMMENT ON COLUMN user_profiles.account_type IS '账号类型: customer(前台用户), admin(后台用户)';

-- 2. 确保roles表中有基础角色
INSERT INTO roles (name, description) 
VALUES 
  ('customer', '普通用户 - 前台注册的标准用户角色')
ON CONFLICT (name) 
DO NOTHING;

INSERT INTO roles (name, description) 
VALUES 
  ('admin', '管理员 - 可以访问管理后台')
ON CONFLICT (name) 
DO NOTHING;

-- 3. 创建默认角色分配函数
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
DECLARE
  customer_role_id UUID;
BEGIN
  -- 获取customer角色ID
  SELECT id INTO customer_role_id FROM roles WHERE name = 'customer';
  
  -- 如果找到角色ID并且用户是新创建的
  IF customer_role_id IS NOT NULL AND TG_OP = 'INSERT' THEN
    -- 为新用户分配customer角色
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, customer_role_id);
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER;

-- 4. 创建触发器，在新用户创建时自动分配角色
DROP TRIGGER IF EXISTS assign_customer_role_trigger ON user_profiles;
CREATE TRIGGER assign_customer_role_trigger
AFTER INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION assign_default_role();

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