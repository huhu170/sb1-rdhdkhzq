-- Add missing RLS policy for order_items 
CREATE POLICY "Users can insert order items for their own orders" 
ON order_items FOR INSERT 
WITH CHECK ( 
  EXISTS ( 
    SELECT 1 FROM orders 
    WHERE orders.id = order_id 
    AND orders.user_id = auth.uid() 
  ) 
); 
