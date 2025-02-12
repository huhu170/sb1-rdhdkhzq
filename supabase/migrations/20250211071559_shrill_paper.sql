/*
  # Create product showcase tables

  1. New Tables
    - `showcase_products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `image_url` (text)
      - `is_active` (boolean)
      - `order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for authenticated users to manage data
*/

-- Create showcase_products table
CREATE TABLE IF NOT EXISTS showcase_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text NOT NULL,
  is_active boolean DEFAULT true,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE showcase_products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to showcase_products"
  ON showcase_products
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage showcase_products"
  ON showcase_products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_showcase_products_updated_at
  BEFORE UPDATE ON showcase_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO showcase_products (name, description, price, image_url, is_active, "order") VALUES
  ('自然日抛系列', '采用高透氧材料，打造自然舒适的眼部体验', 129.00, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80', true, 1),
  ('魅彩月抛系列', '独特的渐变色彩，展现个性魅力', 199.00, 'https://images.unsplash.com/photo-1586962358070-16a0b65b5092?auto=format&fit=crop&q=80', true, 2),
  ('星钻季抛系列', '闪耀钻石般的光彩，打造迷人眼神', 299.00, 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80', true, 3)
ON CONFLICT DO NOTHING;