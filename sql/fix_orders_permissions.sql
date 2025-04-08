-- 修复订单相关表权限的SQL脚本

-- 1. 确保所有表都启用RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能存在的所有策略，以避免冲突
DROP POLICY IF EXISTS "Everyone can view orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Everyone can view order_items" ON order_items;
DROP POLICY IF EXISTS "Everyone can view payment_records" ON payment_records;
DROP POLICY IF EXISTS "Everyone can view shipping_addresses" ON shipping_addresses;

-- 3. 重新创建新的权限策略

-- 订单表权限
CREATE POLICY "Allow public read access to orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to orders"
  ON orders FOR ALL
  USING (
    auth.email() = 'admin@sijoer.com'
  )
  WITH CHECK (
    auth.email() = 'admin@sijoer.com'
  );

-- 订单项表权限
CREATE POLICY "Allow public read access to order_items"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to order_items"
  ON order_items FOR ALL
  USING (
    auth.email() = 'admin@sijoer.com'
  )
  WITH CHECK (
    auth.email() = 'admin@sijoer.com'
  );

-- 支付记录表权限
CREATE POLICY "Allow public read access to payment_records"
  ON payment_records FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to payment_records"
  ON payment_records FOR ALL
  USING (
    auth.email() = 'admin@sijoer.com'
  )
  WITH CHECK (
    auth.email() = 'admin@sijoer.com'
  );

-- 收货地址表权限
CREATE POLICY "Allow public read access to shipping_addresses"
  ON shipping_addresses FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to shipping_addresses"
  ON shipping_addresses FOR ALL
  USING (
    auth.email() = 'admin@sijoer.com'
  )
  WITH CHECK (
    auth.email() = 'admin@sijoer.com'
  );

-- 4. 从新创建跨表视图（可选，用于将来的优化）
-- DROP VIEW IF EXISTS order_summary_view;
-- CREATE OR REPLACE VIEW order_summary_view AS
-- SELECT
--   o.id,
--   o.order_number,
--   o.status,
--   o.total_amount,
--   o.created_at,
--   o.updated_at,
--   o.user_id,
--   o.tracking_number,
--   o.shipping_address_id,
--   o.shipping_fee,
--   p.display_name,
--   sa.recipient_name,
--   sa.phone
-- FROM
--   orders o
-- LEFT JOIN user_profiles p ON o.user_id = p.id
-- LEFT JOIN shipping_addresses sa ON o.shipping_address_id = sa.id; 