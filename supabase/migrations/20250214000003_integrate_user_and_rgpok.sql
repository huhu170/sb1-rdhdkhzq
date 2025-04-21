-- 整合用户视图和RGPOK表相关修复
-- 包含：fix_user_view.sql, rgpok_table.sql

BEGIN;

-- 用户视图修复
CREATE OR REPLACE VIEW "public"."user_profile_view" AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.phone_number,
  u.account_type,
  u.created_at,
  u.updated_at,
  COUNT(o.id) as order_count,
  COALESCE(SUM(oi.quantity * oi.price), 0) as total_spent
FROM 
  users u
  LEFT JOIN orders o ON u.id = o.user_id
  LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY 
  u.id, u.email, u.full_name, u.phone_number, u.account_type, u.created_at, u.updated_at;

-- RGPOK表结构优化
CREATE TABLE IF NOT EXISTS "public"."rgpok_parameters" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" UUID REFERENCES "public"."users"(id),
  "base_curve" DECIMAL(4,2) NOT NULL,
  "diameter" DECIMAL(4,2) NOT NULL,
  "sphere" DECIMAL(4,2) NOT NULL,
  "cylinder" DECIMAL(4,2),
  "axis" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT "valid_base_curve" CHECK (base_curve BETWEEN 6.50 AND 9.50),
  CONSTRAINT "valid_diameter" CHECK (diameter BETWEEN 8.00 AND 12.00),
  CONSTRAINT "valid_sphere" CHECK (sphere BETWEEN -20.00 AND 20.00),
  CONSTRAINT "valid_cylinder" CHECK (cylinder BETWEEN -6.00 AND 6.00 OR cylinder IS NULL),
  CONSTRAINT "valid_axis" CHECK (axis BETWEEN 0 AND 180 OR axis IS NULL)
);

-- 添加RLS策略
ALTER TABLE "public"."rgpok_parameters" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的RGPOK参数"
  ON "public"."rgpok_parameters"
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT id FROM users WHERE account_type = 'admin'
    )
  );

CREATE POLICY "用户只能修改自己的RGPOK参数"
  ON "public"."rgpok_parameters"
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT id FROM users WHERE account_type = 'admin'
    )
  );

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rgpok_parameters_updated_at
    BEFORE UPDATE ON "public"."rgpok_parameters"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT; 