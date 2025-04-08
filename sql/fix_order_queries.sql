-- 修复订单表的查询权限问题

-- 1. 首先确保开启RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

-- 2. 为订单表创建通用查询权限
DROP POLICY IF EXISTS "Everyone can view orders" ON orders;
CREATE POLICY "Everyone can view orders"
  ON orders FOR SELECT
  USING (true);

-- 3. 为订单项表创建通用查询权限
DROP POLICY IF EXISTS "Everyone can view order_items" ON order_items;
CREATE POLICY "Everyone can view order_items"
  ON order_items FOR SELECT
  USING (true);

-- 4. 为支付记录表创建通用查询权限
DROP POLICY IF EXISTS "Everyone can view payment_records" ON payment_records;
CREATE POLICY "Everyone can view payment_records"
  ON payment_records FOR SELECT
  USING (true);

-- 5. 为收货地址表创建查询权限
DROP POLICY IF EXISTS "Everyone can view shipping_addresses" ON shipping_addresses;
CREATE POLICY "Everyone can view shipping_addresses"
  ON shipping_addresses FOR SELECT
  USING (true);

-- 6. 创建一个订单视图，方便查询
CREATE OR REPLACE VIEW order_details_view AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.total_amount,
  o.created_at,
  o.updated_at,
  o.user_id,
  o.tracking_number,
  o.shipping_address_id,
  o.shipping_fee,
  u.email as user_email,
  sa.recipient_name,
  sa.phone,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'status', pr.status,
        'payment_method', pr.payment_method,
        'created_at', pr.created_at
      )
    )
    FROM payment_records pr
    WHERE pr.order_id = o.id
  ) as payment_records
FROM
  orders o
LEFT JOIN user_view u ON o.user_id = u.id
LEFT JOIN shipping_addresses sa ON o.shipping_address_id = sa.id; 