/*
  # Create storage bucket and set permissions

  1. Storage Setup
    - Create 'images' bucket for storing uploaded images
    - Set public access for reading images
    - Set authenticated access for uploading images

  2. Security
    - Enable public read access
    - Restrict write access to authenticated users only
*/

-- Enable storage by creating the images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Set up security policies
CREATE POLICY "Give public access to images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Allow authenticated uploads to images bucket" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Allow authenticated updates to images bucket" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images');

CREATE POLICY "Allow authenticated deletes from images bucket" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');