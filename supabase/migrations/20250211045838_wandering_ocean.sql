/*
  # Site Settings Table Update
  
  1. Changes
    - Ensures site_settings table exists
    - Adds default record if not exists
    - Adds RLS policies if not exists
  
  2. Security
    - Public read access
    - Authenticated users full access
*/

-- Create site_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'site_settings' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_settings' 
    AND policyname = 'Allow public read access to site_settings'
  ) THEN
    CREATE POLICY "Allow public read access to site_settings"
      ON site_settings
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_settings' 
    AND policyname = 'Allow authenticated users to manage site_settings'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage site_settings"
      ON site_settings
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_site_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_site_settings_updated_at
      BEFORE UPDATE ON site_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert default record if it doesn't exist
INSERT INTO site_settings (id, logo_url)
VALUES ('default', NULL)
ON CONFLICT (id) DO NOTHING;