/*
  # Admin Dashboard Schema Setup

  1. New Tables
    - `articles`
      - `id` (uuid, primary key)
      - `title` (text)
      - `excerpt` (text)
      - `content` (text)
      - `author` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transformations`
      - `id` (uuid, primary key)
      - `before_image_url` (text)
      - `after_image_url` (text)
      - `color` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated admin users
*/

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  author text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transformations table
CREATE TABLE IF NOT EXISTS transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  before_image_url text NOT NULL,
  after_image_url text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformations ENABLE ROW LEVEL SECURITY;

-- Create policies for articles
CREATE POLICY "Allow public read access" ON articles
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access" ON articles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for transformations
CREATE POLICY "Allow public read access" ON transformations
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access" ON transformations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);