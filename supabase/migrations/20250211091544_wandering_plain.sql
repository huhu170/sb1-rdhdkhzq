/*
  # Add is_active field to articles table

  1. Changes
    - Add is_active boolean field to articles table with default value true
    - Update existing records to have is_active set to true
*/

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE articles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Update existing records to have is_active set to true
UPDATE articles SET is_active = true WHERE is_active IS NULL;