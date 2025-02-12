/*
  # Add SEO and Analytics fields to site_settings

  1. Changes
    - Add SEO fields:
      - site_title (text)
      - site_description (text) 
      - site_keywords (text)
      - site_author (text)
      - site_favicon (text)
    - Add Analytics fields:
      - total_visits (bigint)
      - daily_visits (bigint)
      - monthly_visits (bigint) 
      - last_visit_date (timestamptz)
*/

DO $$ 
BEGIN
  -- Add SEO fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'site_title') THEN
    ALTER TABLE site_settings ADD COLUMN site_title text DEFAULT '希乔尔 SIJOER - 专业隐形眼镜美瞳订制';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'site_description') THEN
    ALTER TABLE site_settings ADD COLUMN site_description text DEFAULT '希乔尔隐形眼镜美瞳订制 - 为您打造专属的美瞳体验';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'site_keywords') THEN
    ALTER TABLE site_settings ADD COLUMN site_keywords text DEFAULT '希乔尔,隐形眼镜,美瞳,订制美瞳,彩色隐形眼镜';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'site_author') THEN
    ALTER TABLE site_settings ADD COLUMN site_author text DEFAULT '希乔尔';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'site_favicon') THEN
    ALTER TABLE site_settings ADD COLUMN site_favicon text;
  END IF;

  -- Add Analytics fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'total_visits') THEN
    ALTER TABLE site_settings ADD COLUMN total_visits bigint DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'daily_visits') THEN
    ALTER TABLE site_settings ADD COLUMN daily_visits bigint DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'monthly_visits') THEN
    ALTER TABLE site_settings ADD COLUMN monthly_visits bigint DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'last_visit_date') THEN
    ALTER TABLE site_settings ADD COLUMN last_visit_date timestamptz;
  END IF;
END $$;