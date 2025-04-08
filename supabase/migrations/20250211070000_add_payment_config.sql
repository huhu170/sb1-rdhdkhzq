/*
  # Add payment configuration to site_settings

  1. Changes
    - Add payment_config column to site_settings table
    - Column type is JSONB to store payment gateway configurations
    - Includes configurations for:
      - Alipay (支付宝)
      - WeChat Pay (微信支付)
    
  2. Default Data
    - Default empty configuration with required structure
*/

DO $$ 
BEGIN
  -- Add payment_config column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'payment_config') THEN
    ALTER TABLE site_settings ADD COLUMN payment_config jsonb DEFAULT '{
      "alipay": {
        "enabled": false,
        "app_id": "",
        "private_key": "",
        "public_key": "",
        "sandbox_mode": true
      },
      "wechat": {
        "enabled": false,
        "app_id": "",
        "mch_id": "",
        "api_key": "",
        "app_secret": "",
        "sandbox_mode": true
      }
    }'::jsonb;
  END IF;

  -- Update default record if it exists
  UPDATE site_settings
  SET payment_config = COALESCE(payment_config, '{
    "alipay": {
      "enabled": false,
      "app_id": "",
      "private_key": "",
      "public_key": "",
      "sandbox_mode": true
    },
    "wechat": {
      "enabled": false,
      "app_id": "",
      "mch_id": "",
      "api_key": "",
      "app_secret": "",
      "sandbox_mode": true
    }
  }'::jsonb)
  WHERE id = 'default';
END $$; 