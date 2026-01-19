-- =============================================================================
-- Migration: Create Feature Import Batch RPC Function
-- =============================================================================
-- Imports features, permissions, and role templates from Excel data atomically
-- Handles add, update, and delete operations based on action field
-- =============================================================================

BEGIN;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS import_features_batch(JSONB, UUID);

CREATE OR REPLACE FUNCTION import_features_batch(
  p_data JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  features_added INTEGER,
  features_updated INTEGER,
  features_deleted INTEGER,
  permissions_added INTEGER,
  permissions_updated INTEGER,
  permissions_deleted INTEGER,
  role_templates_added INTEGER,
  role_templates_updated INTEGER,
  role_templates_deleted INTEGER,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_features JSONB;
  v_permissions JSONB;
  v_role_templates JSONB;
  v_feature JSONB;
  v_permission JSONB;
  v_role_template JSONB;
  v_feature_id UUID;
  v_permission_id UUID;
  v_action TEXT;
  v_errors JSONB := '[]'::JSONB;
  v_error_msg TEXT;
  -- Counters
  v_features_added INTEGER := 0;
  v_features_updated INTEGER := 0;
  v_features_deleted INTEGER := 0;
  v_permissions_added INTEGER := 0;
  v_permissions_updated INTEGER := 0;
  v_permissions_deleted INTEGER := 0;
  v_role_templates_added INTEGER := 0;
  v_role_templates_updated INTEGER := 0;
  v_role_templates_deleted INTEGER := 0;
  -- Temp variables
  v_existing_feature_id UUID;
  v_existing_permission_id UUID;
  v_category TEXT;
  v_action_part TEXT;
BEGIN
  -- Extract data sections
  v_features := COALESCE(p_data->'features', '[]'::JSONB);
  v_permissions := COALESCE(p_data->'permissions', '[]'::JSONB);
  v_role_templates := COALESCE(p_data->'roleTemplates', '[]'::JSONB);

  -- =========================================================================
  -- PASS 1: Process Features (Delete -> Update -> Add)
  -- =========================================================================

  -- Delete features marked for deletion
  FOR v_feature IN SELECT * FROM jsonb_array_elements(v_features)
  LOOP
    v_action := COALESCE(v_feature->>'action', 'add');

    IF v_action = 'delete' THEN
      v_feature_id := NULLIF(v_feature->>'id', '')::UUID;

      IF v_feature_id IS NOT NULL THEN
        -- Soft delete by setting deleted_at
        UPDATE feature_catalog
        SET deleted_at = NOW(), updated_by = p_user_id, updated_at = NOW()
        WHERE id = v_feature_id AND deleted_at IS NULL;

        IF FOUND THEN
          v_features_deleted := v_features_deleted + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Update/Add features
  FOR v_feature IN SELECT * FROM jsonb_array_elements(v_features)
  LOOP
    v_action := COALESCE(v_feature->>'action', 'add');

    IF v_action = 'delete' THEN
      CONTINUE;
    END IF;

    BEGIN
      IF v_action = 'update' THEN
        v_feature_id := NULLIF(v_feature->>'id', '')::UUID;

        IF v_feature_id IS NOT NULL THEN
          UPDATE feature_catalog
          SET
            code = COALESCE(NULLIF(v_feature->>'code', ''), code),
            name = COALESCE(NULLIF(v_feature->>'name', ''), name),
            description = COALESCE(v_feature->>'description', description),
            category = COALESCE(NULLIF(v_feature->>'category', ''), category),
            tier = COALESCE(v_feature->>'tier', tier),
            is_active = COALESCE((v_feature->>'is_active')::BOOLEAN, is_active),
            is_delegatable = COALESCE((v_feature->>'is_delegatable')::BOOLEAN, is_delegatable),
            phase = COALESCE(v_feature->>'phase', phase),
            updated_by = p_user_id,
            updated_at = NOW()
          WHERE id = v_feature_id AND deleted_at IS NULL;

          IF FOUND THEN
            v_features_updated := v_features_updated + 1;
          END IF;
        END IF;
      ELSE
        -- Add new feature (check for existing by code first)
        SELECT id INTO v_existing_feature_id
        FROM feature_catalog
        WHERE code = v_feature->>'code' AND deleted_at IS NULL;

        IF v_existing_feature_id IS NOT NULL THEN
          -- Update existing instead
          UPDATE feature_catalog
          SET
            name = COALESCE(NULLIF(v_feature->>'name', ''), name),
            description = COALESCE(v_feature->>'description', description),
            category = COALESCE(NULLIF(v_feature->>'category', ''), category),
            tier = COALESCE(v_feature->>'tier', tier),
            is_active = COALESCE((v_feature->>'is_active')::BOOLEAN, is_active),
            is_delegatable = COALESCE((v_feature->>'is_delegatable')::BOOLEAN, is_delegatable),
            phase = COALESCE(v_feature->>'phase', phase),
            updated_by = p_user_id,
            updated_at = NOW()
          WHERE id = v_existing_feature_id;

          v_features_updated := v_features_updated + 1;
        ELSE
          INSERT INTO feature_catalog (
            code, name, description, category, tier, is_active, is_delegatable, phase, created_by
          )
          VALUES (
            v_feature->>'code',
            v_feature->>'name',
            v_feature->>'description',
            COALESCE(v_feature->>'category', 'core'),
            v_feature->>'tier',
            COALESCE((v_feature->>'is_active')::BOOLEAN, true),
            COALESCE((v_feature->>'is_delegatable')::BOOLEAN, false),
            COALESCE(v_feature->>'phase', 'ga'),
            p_user_id
          );

          v_features_added := v_features_added + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_msg := FORMAT('Feature "%s": %s', v_feature->>'code', SQLERRM);
      v_errors := v_errors || to_jsonb(v_error_msg);
    END;
  END LOOP;

  -- =========================================================================
  -- PASS 2: Process Permissions (Delete -> Update -> Add)
  -- =========================================================================

  -- Delete permissions marked for deletion
  FOR v_permission IN SELECT * FROM jsonb_array_elements(v_permissions)
  LOOP
    v_action := COALESCE(v_permission->>'action', 'add');

    IF v_action = 'delete' THEN
      v_permission_id := NULLIF(v_permission->>'id', '')::UUID;

      IF v_permission_id IS NOT NULL THEN
        DELETE FROM feature_permissions WHERE id = v_permission_id;

        IF FOUND THEN
          v_permissions_deleted := v_permissions_deleted + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Update/Add permissions
  FOR v_permission IN SELECT * FROM jsonb_array_elements(v_permissions)
  LOOP
    v_action := COALESCE(v_permission->>'action', 'add');

    IF v_action = 'delete' THEN
      CONTINUE;
    END IF;

    BEGIN
      -- Get feature_id by code
      SELECT id INTO v_feature_id
      FROM feature_catalog
      WHERE code = v_permission->>'feature_code' AND deleted_at IS NULL;

      IF v_feature_id IS NULL THEN
        v_error_msg := FORMAT('Permission "%s": Feature "%s" not found',
          v_permission->>'permission_code', v_permission->>'feature_code');
        v_errors := v_errors || to_jsonb(v_error_msg);
        CONTINUE;
      END IF;

      -- Extract category and action from permission_code
      v_category := split_part(v_permission->>'permission_code', ':', 1);
      v_action_part := split_part(v_permission->>'permission_code', ':', 2);

      IF v_action = 'update' THEN
        v_permission_id := NULLIF(v_permission->>'id', '')::UUID;

        IF v_permission_id IS NOT NULL THEN
          UPDATE feature_permissions
          SET
            permission_code = COALESCE(NULLIF(v_permission->>'permission_code', ''), permission_code),
            display_name = COALESCE(NULLIF(v_permission->>'display_name', ''), display_name),
            description = COALESCE(v_permission->>'description', description),
            category = v_category,
            action = v_action_part,
            is_required = COALESCE((v_permission->>'is_required')::BOOLEAN, is_required),
            display_order = COALESCE((v_permission->>'display_order')::INTEGER, display_order),
            updated_by = p_user_id,
            updated_at = NOW()
          WHERE id = v_permission_id;

          IF FOUND THEN
            v_permissions_updated := v_permissions_updated + 1;
          END IF;
        END IF;
      ELSE
        -- Add new permission (check for existing by feature_id + permission_code first)
        SELECT id INTO v_existing_permission_id
        FROM feature_permissions
        WHERE feature_id = v_feature_id AND permission_code = v_permission->>'permission_code';

        IF v_existing_permission_id IS NOT NULL THEN
          -- Update existing instead
          UPDATE feature_permissions
          SET
            display_name = COALESCE(NULLIF(v_permission->>'display_name', ''), display_name),
            description = COALESCE(v_permission->>'description', description),
            category = v_category,
            action = v_action_part,
            is_required = COALESCE((v_permission->>'is_required')::BOOLEAN, is_required),
            display_order = COALESCE((v_permission->>'display_order')::INTEGER, display_order),
            updated_by = p_user_id,
            updated_at = NOW()
          WHERE id = v_existing_permission_id;

          v_permissions_updated := v_permissions_updated + 1;
        ELSE
          INSERT INTO feature_permissions (
            feature_id, permission_code, display_name, description,
            category, action, is_required, display_order, created_by
          )
          VALUES (
            v_feature_id,
            v_permission->>'permission_code',
            v_permission->>'display_name',
            v_permission->>'description',
            v_category,
            v_action_part,
            COALESCE((v_permission->>'is_required')::BOOLEAN, true),
            COALESCE((v_permission->>'display_order')::INTEGER, 0),
            p_user_id
          );

          v_permissions_added := v_permissions_added + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_msg := FORMAT('Permission "%s": %s', v_permission->>'permission_code', SQLERRM);
      v_errors := v_errors || to_jsonb(v_error_msg);
    END;
  END LOOP;

  -- =========================================================================
  -- PASS 3: Process Role Templates (Delete -> Update -> Add)
  -- =========================================================================

  -- Delete role templates marked for deletion
  FOR v_role_template IN SELECT * FROM jsonb_array_elements(v_role_templates)
  LOOP
    v_action := COALESCE(v_role_template->>'action', 'add');

    IF v_action = 'delete' THEN
      v_permission_id := NULLIF(v_role_template->>'id', '')::UUID;

      IF v_permission_id IS NOT NULL THEN
        DELETE FROM permission_role_templates WHERE id = v_permission_id;

        IF FOUND THEN
          v_role_templates_deleted := v_role_templates_deleted + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Update/Add role templates
  FOR v_role_template IN SELECT * FROM jsonb_array_elements(v_role_templates)
  LOOP
    v_action := COALESCE(v_role_template->>'action', 'add');

    IF v_action = 'delete' THEN
      CONTINUE;
    END IF;

    BEGIN
      -- Get permission_id by feature_code + permission_code
      SELECT fp.id INTO v_permission_id
      FROM feature_permissions fp
      JOIN feature_catalog fc ON fp.feature_id = fc.id
      WHERE fc.code = v_role_template->>'feature_code'
        AND fp.permission_code = v_role_template->>'permission_code'
        AND fc.deleted_at IS NULL;

      IF v_permission_id IS NULL THEN
        v_error_msg := FORMAT('Role template for "%s.%s" role "%s": Permission not found',
          v_role_template->>'feature_code', v_role_template->>'permission_code', v_role_template->>'role_key');
        v_errors := v_errors || to_jsonb(v_error_msg);
        CONTINUE;
      END IF;

      IF v_action = 'update' THEN
        -- Update existing role template
        UPDATE permission_role_templates
        SET
          is_recommended = COALESCE((v_role_template->>'is_recommended')::BOOLEAN, is_recommended),
          reason = COALESCE(v_role_template->>'reason', reason),
          updated_by = p_user_id,
          updated_at = NOW()
        WHERE feature_permission_id = v_permission_id
          AND role_key = v_role_template->>'role_key';

        IF FOUND THEN
          v_role_templates_updated := v_role_templates_updated + 1;
        END IF;
      ELSE
        -- Add new role template (upsert)
        INSERT INTO permission_role_templates (
          feature_permission_id, role_key, is_recommended, reason, created_by
        )
        VALUES (
          v_permission_id,
          v_role_template->>'role_key',
          COALESCE((v_role_template->>'is_recommended')::BOOLEAN, true),
          v_role_template->>'reason',
          p_user_id
        )
        ON CONFLICT (feature_permission_id, role_key) DO UPDATE SET
          is_recommended = EXCLUDED.is_recommended,
          reason = EXCLUDED.reason,
          updated_by = p_user_id,
          updated_at = NOW();

        v_role_templates_added := v_role_templates_added + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_msg := FORMAT('Role template for "%s" role "%s": %s',
        v_role_template->>'permission_code', v_role_template->>'role_key', SQLERRM);
      v_errors := v_errors || to_jsonb(v_error_msg);
    END;
  END LOOP;

  -- =========================================================================
  -- Return results
  -- =========================================================================
  RETURN QUERY
  SELECT
    jsonb_array_length(v_errors) = 0 AS success,
    v_features_added,
    v_features_updated,
    v_features_deleted,
    v_permissions_added,
    v_permissions_updated,
    v_permissions_deleted,
    v_role_templates_added,
    v_role_templates_updated,
    v_role_templates_deleted,
    v_errors;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION import_features_batch(JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION import_features_batch IS
  'Imports features, permissions, and role templates from Excel data atomically. '
  'Handles add, update, and delete operations based on action field in each item. '
  'Returns counts for each operation type and any errors encountered.';

COMMIT;
