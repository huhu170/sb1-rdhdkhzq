/*
  # Add product customization ranges

  1. New Table
    - product_customization_ranges: Stores customization parameter ranges for each product
      - id (uuid, primary key)
      - product_id (uuid, references products)
      - parameter_id (uuid, references customization_options)
      - min_value (numeric)
      - max_value (numeric)
      - step_value (numeric)
      - allowed_values (jsonb) - For select type parameters
      - is_required (boolean)
      - default_value (text)
      - price_adjustment (numeric)

  2. Changes
    - Add table for storing product-specific customization ranges
    - Add RLS policies
    - Add foreign key constraints
*/

-- Create product customization ranges table
CREATE TABLE IF NOT EXISTS product_customization_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  parameter_id uuid REFERENCES customization_options(id) ON DELETE CASCADE,
  min_value numeric,
  max_value numeric,
  step_value numeric,
  allowed_values jsonb,
  is_required boolean DEFAULT false,
  default_value text,
  price_adjustment numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_range_values CHECK (
    (min_value IS NULL AND max_value IS NULL AND step_value IS NULL) OR
    (min_value IS NOT NULL AND max_value IS NOT NULL AND step_value IS NOT NULL)
  ),
  CONSTRAINT valid_select_values CHECK (
    (allowed_values IS NULL) OR
    (jsonb_typeof(allowed_values) = 'array')
  )
);

-- Enable RLS
ALTER TABLE product_customization_ranges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to product_customization_ranges"
  ON product_customization_ranges
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage product_customization_ranges"
  ON product_customization_ranges
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_product_customization_ranges_updated_at
  BEFORE UPDATE ON product_customization_ranges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_product_customization_ranges_product_id
  ON product_customization_ranges(product_id);

CREATE INDEX idx_product_customization_ranges_parameter_id
  ON product_customization_ranges(parameter_id);

-- Add sample data for existing products
INSERT INTO product_customization_ranges (
  product_id,
  parameter_id,
  min_value,
  max_value,
  step_value,
  allowed_values,
  is_required,
  default_value,
  price_adjustment
)
SELECT 
  p.id as product_id,
  co.id as parameter_id,
  CASE 
    WHEN co.name = '近视度数' THEN -6.00
    WHEN co.name = '远视度数' THEN 0.00
    WHEN co.name = '散光度数' THEN -2.00
    WHEN co.name = '散光轴向' THEN 0
    ELSE co.min
  END as min_value,
  CASE 
    WHEN co.name = '近视度数' THEN 0.00
    WHEN co.name = '远视度数' THEN 4.00
    WHEN co.name = '散光度数' THEN 0.00
    WHEN co.name = '散光轴向' THEN 180
    ELSE co.max
  END as max_value,
  co.step as step_value,
  co.options as allowed_values,
  co.required as is_required,
  co.default_value as default_value,
  0 as price_adjustment
FROM products p
CROSS JOIN customization_options co
WHERE co.group = '视力矫正'
ON CONFLICT DO NOTHING;