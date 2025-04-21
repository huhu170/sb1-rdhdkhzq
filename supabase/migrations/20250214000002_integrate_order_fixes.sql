-- 整合订单相关修复
-- 包含：fix_orders_permissions.sql, fix_order_queries.sql

BEGIN;

-- 订单权限修复
DO $$ 
BEGIN 
  -- 删除现有的订单相关策略
  DROP POLICY IF EXISTS "用户只能查看自己的订单" ON "public"."orders";
  DROP POLICY IF EXISTS "管理员可以查看所有订单" ON "public"."orders";
  DROP POLICY IF EXISTS "用户只能更新自己的订单" ON "public"."orders";
  DROP POLICY IF EXISTS "管理员可以更新所有订单" ON "public"."orders";

  -- 创建新的订单策略
  CREATE POLICY "用户只能查看自己的订单"
    ON "public"."orders"
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id OR
      auth.uid() IN (
        SELECT id FROM users WHERE account_type = 'admin'
      )
    );

  CREATE POLICY "用户只能更新自己的订单"
    ON "public"."orders"
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = user_id OR
      auth.uid() IN (
        SELECT id FROM users WHERE account_type = 'admin'
      )
    );
END $$;

-- 订单查询优化
CREATE OR REPLACE VIEW "public"."order_summary" AS
SELECT 
  o.id,
  o.user_id,
  o.status,
  o.created_at,
  o.updated_at,
  u.email,
  u.full_name,
  COUNT(oi.id) as item_count,
  SUM(oi.quantity * oi.price) as total_amount
FROM 
  orders o
  LEFT JOIN users u ON o.user_id = u.id
  LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY 
  o.id, o.user_id, o.status, o.created_at, o.updated_at, u.email, u.full_name;

-- 创建订单搜索函数
CREATE OR REPLACE FUNCTION search_orders(
  search_term TEXT,
  status_filter TEXT DEFAULT NULL,
  date_from TIMESTAMP DEFAULT NULL,
  date_to TIMESTAMP DEFAULT NULL
) 
RETURNS TABLE (
  id UUID,
  user_id UUID,
  status TEXT,
  created_at TIMESTAMP,
  email TEXT,
  full_name TEXT,
  item_count BIGINT,
  total_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    os.id,
    os.user_id,
    os.status,
    os.created_at,
    os.email,
    os.full_name,
    os.item_count,
    os.total_amount
  FROM 
    order_summary os
  WHERE 
    (search_term IS NULL OR 
     os.email ILIKE '%' || search_term || '%' OR
     os.full_name ILIKE '%' || search_term || '%') AND
    (status_filter IS NULL OR os.status = status_filter) AND
    (date_from IS NULL OR os.created_at >= date_from) AND
    (date_to IS NULL OR os.created_at <= date_to);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT; 