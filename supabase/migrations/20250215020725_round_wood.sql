-- Drop existing churches table if it exists
DROP TABLE IF EXISTS churches CASCADE;

-- Create churches table with improved structure
CREATE TABLE churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  contact_number text,
  email text,
  website text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Churches are viewable by authenticated users"
  ON churches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Churches can be created by authenticated users"
  ON churches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Churches can be updated by authenticated users"
  ON churches FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create function to get current church
CREATE OR REPLACE FUNCTION get_current_church()
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  contact_number text,
  email text,
  website text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.address,
    c.contact_number,
    c.email,
    c.website,
    c.logo_url,
    c.created_at,
    c.updated_at
  FROM churches c
  WHERE c.created_by = auth.uid()
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_church() TO authenticated;

-- Create storage bucket for church logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for logos
CREATE POLICY "Logo images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Users can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add helpful comments
COMMENT ON TABLE churches IS 
  'Churches using the system with their configuration settings';

COMMENT ON FUNCTION get_current_church() IS
  'Returns the church associated with the current user';