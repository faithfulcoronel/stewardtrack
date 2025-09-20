-- Create function to get enum values
CREATE OR REPLACE FUNCTION get_enum_values(enum_name text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enum_values text[];
BEGIN
  -- Get enum values using information schema
  SELECT array_agg(e.enumlabel)
  INTO enum_values
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  WHERE t.typname = enum_name;

  RETURN enum_values;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_enum_values(text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_enum_values(text) IS 
  'Returns all values for a given enum type name';