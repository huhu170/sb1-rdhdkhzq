-- 整合账户相关修复
-- 包含：account_separation.sql, fix_account_type_constraint.sql, fix_admin_login.sql

-- 账户分离逻辑
BEGIN;

-- 重置管理员权限
DO $$ 
BEGIN 
  -- 删除现有的管理员角色策略
  DROP POLICY IF EXISTS "管理员可以查看所有用户信息" ON "public"."users";
  DROP POLICY IF EXISTS "管理员可以更新所有用户信息" ON "public"."users";
  
  -- 创建新的管理员角色策略
  CREATE POLICY "管理员可以查看所有用户信息"
    ON "public"."users"
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT id 
        FROM users 
        WHERE account_type = 'admin'
      )
    );

  CREATE POLICY "管理员可以更新所有用户信息"
    ON "public"."users"
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT id 
        FROM users 
        WHERE account_type = 'admin'
      )
    );
END $$;

-- 账户类型约束
ALTER TABLE "public"."users" 
  DROP CONSTRAINT IF EXISTS "valid_account_type",
  ADD CONSTRAINT "valid_account_type" 
    CHECK (account_type IN ('admin', 'user'));

-- 管理员登录修复
CREATE OR REPLACE FUNCTION public.handle_admin_login()
RETURNS trigger AS $$
BEGIN
  IF NEW.account_type = 'admin' THEN
    -- 验证管理员权限
    IF NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_admin' = 'true'
    ) THEN
      RAISE EXCEPTION 'Unauthorized admin access attempt';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_admin_auth ON public.users;
CREATE TRIGGER ensure_admin_auth
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_admin_login();

COMMIT; 