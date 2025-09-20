/*-- Drop existing function that depends on the enum
DROP FUNCTION IF EXISTS get_tenant_categories(category_type, transaction_type);
DROP FUNCTION IF EXISTS manage_category(text, category_type, text, text, text, boolean, integer, transaction_type);
DROP FUNCTION IF EXISTS initialize_tenant_categories(uuid);

-- Create new enum type
CREATE TYPE category_type_new AS ENUM (
  'membership',
  'member_status',
  'income_transaction',
  'expense_transaction',
  'budget'
);

-- Create temporary table to hold data
CREATE TEMP TABLE categories_temp AS SELECT * FROM categories;

-- Drop existing table
DROP TABLE categories CASCADE;

-- Create new table with updated enum
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  type category_type_new NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (tenant_id, type, code)
);

-- Migrate data with type conversion
INSERT INTO categories (
  id, tenant_id, type, code, name, description, 
  is_system, is_active, sort_order, created_at, updated_at,
  created_by, updated_by, deleted_at
)
SELECT 
  id, tenant_id,
  CASE 
    WHEN type = 'transaction' AND transaction_type = 'income' THEN 'income_transaction'::category_type_new
    WHEN type = 'transaction' AND transaction_type = 'expense' THEN 'expense_transaction'::category_type_new
    ELSE type::text::category_type_new
  END,
  code, name, description,
  is_system, is_active, sort_order, created_at, updated_at,
  created_by, updated_by, deleted_at
FROM categories_temp;

-- Drop old enum type
DROP TYPE category_type CASCADE;

-- Rename new enum type
ALTER TYPE category_type_new RENAME TO category_type;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Categories are viewable by tenant users"
  ON categories FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Categories can be managed by tenant admins"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = categories.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.admin_role IN ('super_admin', 'tenant_admin')
    )
    AND deleted_at IS NULL
  );

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_categories_tenant_type ON categories(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_code ON categories(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);

-- Recreate functions with updated enum
CREATE OR REPLACE FUNCTION get_tenant_categories(p_type category_type)
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
  AND c.deleted_at IS NULL
  ORDER BY c.sort_order, c.name;
END;
$$;

-- Recreate manage_category function
CREATE OR REPLACE FUNCTION manage_category(
  p_action text,
  p_type category_type,
  p_code text,
  p_name text,
  p_description text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_sort_order integer DEFAULT 0
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

  CASE p_action
    WHEN 'create' THEN
      -- Check if category already exists
      IF EXISTS (
        SELECT 1 FROM categories
        WHERE tenant_id = v_tenant_id
        AND type = p_type
        AND code = p_code
        AND deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Category already exists';
      END IF;

      -- Create category
      INSERT INTO categories (
        tenant_id,
        type,
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
GRANT EXECUTE ON FUNCTION get_tenant_categories(category_type) TO authenticated;
GRANT EXECUTE ON FUNCTION manage_category(text, category_type, text, text, text, boolean, integer) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE categories IS 'Stores customizable categories for various entity types per tenant';
COMMENT ON FUNCTION get_tenant_categories IS 'Returns categories for a specific type for the current tenant';
COMMENT ON FUNCTION manage_category IS 'Manages (create/update/delete) categories for the current tenant';
*/