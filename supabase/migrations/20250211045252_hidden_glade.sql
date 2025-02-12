/*
  # Add site settings table

  1. New Tables
    - `site_settings`
      - `id` (text, primary key)
      - `logo_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `site_settings` table
    - Add policy for public read access
    - Add policy for authenticated users to manage settings
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to site_settings"
  ON site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage site_settings"
  ON site_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default record
INSERT INTO site_settings (id, logo_url)
VALUES ('default', NULL)
ON CONFLICT (id) DO NOTHING;