/*
  # Add navigation settings

  1. Changes
    - Add navigation settings columns to site_settings table:
      - nav_font_family: 导航栏字体
      - nav_font_size: 导航字体大小
      - nav_items: 导航项目配置 (JSON)

  2. Updates
    - Add default values for new columns
*/

-- Add new columns to site_settings
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS nav_font_family text DEFAULT 'system-ui',
ADD COLUMN IF NOT EXISTS nav_font_size text DEFAULT '1rem',
ADD COLUMN IF NOT EXISTS nav_items jsonb DEFAULT '[
  {"id": "customize", "label": "定制镜片", "href": "#customize"},
  {"id": "gallery", "label": "效果展示", "href": "#gallery"}
]'::jsonb;