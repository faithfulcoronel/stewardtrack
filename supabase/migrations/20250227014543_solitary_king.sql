/*
-- Drop existing function first
DROP FUNCTION IF EXISTS get_tenant_categories(category_type);

-- Create transaction_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add transaction_type column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS transaction_type transaction_type;

-- Update existing categories with transaction type
UPDATE categories
SET transaction_type = 'income'
WHERE type = 'transaction'
AND code IN (
  'tithe',
  'first_fruit_offering',
  'love_offering',
  'mission_offering',
  'mission_pledge',
  'building_offering',
  'lot_offering',
  'other_income'
);

UPDATE categories
SET transaction_type = 'expense'
WHERE type = 'transaction'
AND code IN (
  'ministry_expense',
  'payroll',
  'utilities',
  'maintenance',
  'events',
  'missions',
  'education',
  'other_expense'
);

-- Add constraint to validate transaction type
ALTER TABLE categories
ADD CONSTRAINT valid_transaction_type CHECK (
  (type = 'transaction' AND transaction_type IS NOT NULL) OR
  (type != 'transaction' AND transaction_type IS NULL)
);

-- Update unique constraint to include transaction_type
ALTER TABLE categories 
DROP CONSTRAINT IF EXISTS categories_tenant_id_type_code_key;

ALTER TABLE categories
ADD CONSTRAINT categories_tenant_id_type_transaction_type_code_key 
UNIQUE (tenant_id, type, transaction_type, code);

-- Create function to get categories by type and transaction type
CREATE OR REPLACE FUNCTION get_tenant_categories(
  p_type category_type,
  p_transaction_type transaction_type DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  description text,
  is_system boolean,
  is_active boolean,
  sort_order integer
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.code,
    c.name,
    c.description,
    c.is_system,
    c.is_active,
    c.sort_order
  FROM categories c
  WHERE c.tenant_id = get_user_current_tenant_id()
  AND c.type = p_type
  AND (
    (c.type = 'transaction' AND c.transaction_type = p_transaction_type) OR
    (c.type != 'transaction' AND p_transaction_type IS NULL)
  )
  AND c.deleted_at IS NULL
  ORDER BY c.sort_order, c.name;
END;
$$;

-- Create function to manage categories
CREATE OR REPLACE FUNCTION manage_category(
  p_action text,
  p_type category_type,
  p_code text,
  p_name text,
  p_description text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_sort_order integer DEFAULT 0,
  p_transaction_type transaction_type DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  -- Get current tenant ID
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  AND admin_role IN ('super_admin', 'tenant_admin')
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Validate transaction type
  IF p_type = 'transaction' AND p_transaction_type IS NULL THEN
    RAISE EXCEPTION 'Transaction type is required for transaction categories';
  END IF;

  CASE p_action
    WHEN 'create' THEN
      -- Check if category already exists
      IF EXISTS (
        SELECT 1 FROM categories
        WHERE tenant_id = v_tenant_id
        AND type = p_type
        AND COALESCE(transaction_type, 'none') = COALESCE(p_transaction_type, 'none')
        AND code = p_code
        AND deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Category already exists';
      END IF;

      -- Create category
      INSERT INTO categories (
        tenant_id,
        type,
        transaction_type,
        code,
        name,
        description,
        is_active,
        sort_order,
        created_by
      )
      VALUES (
        v_tenant_id,
        p_type,
        p_transaction_type,
        p_code,
        p_name,
        p_description,
        p_is_active,
        p_sort_order,
        auth.uid()
      )
      RETURNING jsonb_build_object(
        'id', id,
        'code', code,
        'name', name,
        'description', description,
        'is_active', is_active,
        'sort_order', sort_order
      ) INTO v_result;

    WHEN 'update' THEN
      -- Update category
      UPDATE categories
      SET
        name = p_name,
        description = p_description,
        is_active = p_is_active,
        sort_order = p_sort_order,
        updated_at = now(),
        updated_by = auth.uid()
      WHERE tenant_id = v_tenant_id
      AND type = p_type
      AND COALESCE(transaction_type, 'none') = COALESCE(p_transaction_type, 'none')
      AND code = p_code
      AND deleted_at IS NULL
      RETURNING jsonb_build_object(
        'id', id,
        'code', code,
        'name', name,
        'description', description,
        'is_active', is_active,
        'sort_order', sort_order
      ) INTO v_result;

    WHEN 'delete' THEN
      -- Soft delete category
      UPDATE categories
      SET
        deleted_at = now(),
        updated_at = now(),
        updated_by = auth.uid()
      WHERE tenant_id = v_tenant_id
      AND type = p_type
      AND COALESCE(transaction_type, 'none') = COALESCE(p_transaction_type, 'none')
      AND code = p_code
      AND NOT is_system
      AND deleted_at IS NULL
      RETURNING jsonb_build_object(
        'success', true,
        'code', code
      ) INTO v_result;

    ELSE
      RAISE EXCEPTION 'Invalid action';
  END CASE;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tenant_categories(category_type, transaction_type) TO authenticated;
GRANT EXECUTE ON FUNCTION manage_category(text, category_type, text, text, text, boolean, integer, transaction_type) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE categories IS 'Stores customizable categories for various entity types per tenant';
COMMENT ON FUNCTION get_tenant_categories IS 'Returns categories for a specific type and optional transaction type for the current tenant';
COMMENT ON FUNCTION manage_category IS 'Manages (create/update/delete) categories for the current tenant';
*/