-- Create churches table
CREATE TABLE IF NOT EXISTS churches (
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

-- Add comment
COMMENT ON TABLE churches IS 
  'Churches using the system with their configuration settings';