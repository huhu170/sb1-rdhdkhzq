/*
  数据看板视图创建

  此迁移文件创建用于数据看板的视图，解决表连接和列名歧义问题。
  
  1. dashboard_orders - 订单概览视图
  2. dashboard_users - 用户信息视图 (仅前台用户)
  3. admin_users - 管理员用户视图 (仅后台用户)
*/

-- 创建订单概览视图
CREATE OR REPLACE VIEW dashboard_orders AS
SELECT 
  o.id,
  o.order_number,
  o.total_amount,
  o.status,
  o.created_at,
  o.updated_at,
  o.user_id AS customer_id,
  up.display_name as customer_name,
  up.phone as customer_phone
FROM 
  orders o
LEFT JOIN 
  user_profiles up ON o.user_id = up.id;

-- 更新用户信息视图，只显示前台用户
CREATE OR REPLACE VIEW dashboard_users AS
SELECT 
  up.id,
  up.display_name,
  up.phone,
  up.avatar_url,
  up.created_at,
  up.updated_at
FROM 
  user_profiles up
JOIN user_view uv ON up.id = uv.id
WHERE uv.account_type = 'customer';  -- 只选择前台客户账号

-- 管理员用户视图
CREATE OR REPLACE VIEW admin_users AS
SELECT 
  up.id,
  up.display_name,
  up.email,
  up.created_at,
  up.updated_at
FROM 
  user_profiles up
JOIN user_view uv ON up.id = uv.id
WHERE uv.account_type = 'admin';  -- 只选择后台管理账号

-- 创建用于数据看板的统计函数
CREATE OR REPLACE FUNCTION calc_total_sales()
RETURNS numeric AS $$
DECLARE
  total numeric;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO total 
  FROM orders 
  WHERE status != 'cancelled';
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 设置严格SQL模式，提早发现并避免歧义引用
SET SESSION sql_mode = 'STRICT_ALL_TABLES,ANSI_QUOTES'; 