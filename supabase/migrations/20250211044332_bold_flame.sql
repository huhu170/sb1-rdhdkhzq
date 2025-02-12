/*
  # Add banners management

  1. New Tables
    - `banners`
      - `id` (uuid, primary key)
      - `image_url` (text, banner image URL)
      - `title` (text, banner title)
      - `subtitle` (text, banner subtitle)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_active` (boolean, whether the banner is currently active)
      - `order` (integer, display order of the banner)

  2. Security
    - Enable RLS on `banners` table
    - Add policies for public read access
    - Add policies for authenticated users to manage banners
*/

CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  "order" integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to banners"
  ON banners
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage banners"
  ON banners
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();