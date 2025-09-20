-- Drop existing function first
DROP FUNCTION IF EXISTS get_enum_values_by_category(text);

-- Create function to get enum values by category
CREATE OR REPLACE FUNCTION get_enum_values_by_category(p_category_name text)
RETURNS TABLE (
  value text,
  label text,
  category_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_category_name
    WHEN 'membership_type' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'membership_type'::text as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'membership_type'
      ORDER BY e.enumsortorder;
      
    WHEN 'member_status' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'member_status'::text as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'member_status'
      ORDER BY e.enumsortorder;
      
    WHEN 'transaction_type' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'transaction_type'::text as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'financial_transaction_type'
      ORDER BY e.enumsortorder;
      
    WHEN 'transaction_category' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'transaction_category'::text as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'financial_transaction_category'
      ORDER BY e.enumsortorder;
      
    ELSE
      RAISE EXCEPTION 'Invalid category: %', p_category_name;
  END CASE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_enum_values_by_category(text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_enum_values_by_category(text) IS
  'Returns formatted enum values for a specific category with proper labels';