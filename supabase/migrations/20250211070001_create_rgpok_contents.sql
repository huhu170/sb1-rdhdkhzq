/*
  # Create RGP & OK Contents Table

  1. New Table
    - rgpok_contents
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - image_url (text)
      - video_url (text)
      - content (text)
      - is_active (boolean)
      - order (integer)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for authenticated users to manage content
*/

-- Create RGP & OK contents table
CREATE TABLE IF NOT EXISTS public.rgpok_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  video_url text,
  content text,
  is_active boolean DEFAULT true,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rgpok_contents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to rgpok_contents"
  ON public.rgpok_contents
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage rgpok_contents"
  ON public.rgpok_contents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_rgpok_contents_updated_at
  BEFORE UPDATE ON public.rgpok_contents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 