/*
  # Add footer settings columns
  
  1. Changes
    - Add company information columns to site_settings table
    - Add ICP filing information columns
    - Add business license information columns
    
  2. Security
    - Maintains existing RLS policies
*/

DO $$ 
BEGIN
  -- Add company information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'company_name') THEN
    ALTER TABLE site_settings ADD COLUMN company_name text DEFAULT '希乔尔医疗科技有限公司';
  END IF;

  -- Add ICP filing information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'icp_number') THEN
    ALTER TABLE site_settings ADD COLUMN icp_number text DEFAULT '浙ICP备XXXXXXXX号';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'icp_link') THEN
    ALTER TABLE site_settings ADD COLUMN icp_link text DEFAULT 'https://beian.miit.gov.cn/';
  END IF;

  -- Add business license information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'business_license') THEN
    ALTER TABLE site_settings ADD COLUMN business_license text DEFAULT '医疗器械经营许可证 浙XXX号';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'business_license_link') THEN
    ALTER TABLE site_settings ADD COLUMN business_license_link text DEFAULT '#';
  END IF;
END $$;