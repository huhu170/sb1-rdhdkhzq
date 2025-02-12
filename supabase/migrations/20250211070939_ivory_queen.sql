/*
  # Create product customization tables

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `base_price` (numeric)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `customization_options`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `options` (jsonb, for color/select types)
      - `min` (numeric, for number type)
      - `max` (numeric, for number type)
      - `step` (numeric, for number type)
      - `unit` (text)
      - `required` (boolean)
      - `default_value` (text)
      - `price_adjustment` (numeric)
      - `group` (text)
      - `order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for authenticated users to manage data
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customization_options table
CREATE TABLE IF NOT EXISTS customization_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('color', 'number', 'select')),
  options jsonb,
  min numeric,
  max numeric,
  step numeric,
  unit text,
  required boolean DEFAULT true,
  default_value text,
  price_adjustment numeric DEFAULT 0,
  "group" text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_number_params CHECK (
    (type = 'number' AND min IS NOT NULL AND max IS NOT NULL AND step IS NOT NULL) OR
    (type != 'number' AND min IS NULL AND max IS NULL AND step IS NULL)
  ),
  CONSTRAINT valid_options CHECK (
    (type IN ('color', 'select') AND options IS NOT NULL) OR
    (type = 'number' AND options IS NULL)
  )
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_options ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Allow public read access to products"
  ON products
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for customization_options
CREATE POLICY "Allow public read access to customization_options"
  ON customization_options
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage customization_options"
  ON customization_options
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customization_options_updated_at
  BEFORE UPDATE ON customization_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO products (name, description, base_price, image_url) VALUES
  ('自然系列美瞳', '采用高透氧材料，打造自然舒适的眼部体验', 199, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80'),
  ('魅彩系列美瞳', '独特的渐变色彩，展现个性魅力', 259, 'https://images.unsplash.com/photo-1586962358070-16a0b65b5092?auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

INSERT INTO customization_options (name, type, options, min, max, step, unit, required, default_value, price_adjustment, "group", "order") VALUES
  ('颜色选择', 'color', '[
    {"value": "sapphire", "label": "深邃蓝宝石", "price_adjustment": 0},
    {"value": "emerald", "label": "自然祖母绿", "price_adjustment": 20},
    {"value": "amber", "label": "温暖琥珀棕", "price_adjustment": 30},
    {"value": "amethyst", "label": "梦幻紫水晶", "price_adjustment": 40}
  ]', NULL, NULL, NULL, NULL, true, 'sapphire', 0, '基础参数', 1),
  
  ('直径', 'number', NULL, 13.8, 14.5, 0.1, 'mm', true, '14.2', 0, '基础参数', 2),
  
  ('含水量', 'select', '[
    {"value": "38", "label": "38%", "price_adjustment": 0},
    {"value": "42", "label": "42%", "price_adjustment": 20},
    {"value": "45", "label": "45%", "price_adjustment": 40}
  ]', NULL, NULL, NULL, NULL, true, '38', 0, '材质参数', 3)
ON CONFLICT DO NOTHING;