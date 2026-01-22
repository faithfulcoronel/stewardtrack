-- =============================================================================
-- Migration: Fix import_members_batch RPC function
-- =============================================================================
-- Description: Remove display_order reference from membership_stage query
-- Date: 2026-01-20
-- =============================================================================

BEGIN;

-- =============================================================================
-- RPC Function: import_members_batch (fixed)
-- =============================================================================

CREATE OR REPLACE FUNCTION import_members_batch(
  p_tenant_id UUID,
  p_user_id UUID,
  p_members JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_member JSONB;
  v_member_id UUID;
  v_row_num INT := 0;
  v_imported_count INT := 0;
  v_error_count INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_imported_ids JSONB := '[]'::JSONB;
  v_membership_type_id UUID;
  v_membership_stage_id UUID;
  v_membership_center_id UUID;
  v_membership_type_code TEXT;
  v_membership_stage_code TEXT;
  v_membership_center_code TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_email TEXT;
  v_existing_email_count INT;
BEGIN
  -- Validate tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'imported_count', 0,
      'error_count', 1,
      'errors', jsonb_build_array(
        jsonb_build_object('row', 0, 'field', 'tenant', 'message', 'Invalid tenant')
      ),
      'imported_ids', '[]'::JSONB
    );
  END IF;

  -- Process each member
  FOR v_member IN SELECT * FROM jsonb_array_elements(p_members)
  LOOP
    v_row_num := v_row_num + 1;
    v_member_id := NULL;
    v_membership_type_id := NULL;
    v_membership_stage_id := NULL;
    v_membership_center_id := NULL;

    BEGIN
      -- Extract required fields
      v_first_name := TRIM(v_member->>'first_name');
      v_last_name := TRIM(v_member->>'last_name');
      v_email := TRIM(v_member->>'email');

      -- Skip if both names are empty
      IF v_first_name IS NULL OR v_first_name = '' THEN
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object('row', v_row_num, 'field', 'first_name', 'message', 'First name is required')
        );
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      IF v_last_name IS NULL OR v_last_name = '' THEN
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object('row', v_row_num, 'field', 'last_name', 'message', 'Last name is required')
        );
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      -- Check for duplicate email within tenant
      IF v_email IS NOT NULL AND v_email != '' THEN
        SELECT COUNT(*) INTO v_existing_email_count
        FROM members
        WHERE email = v_email
          AND tenant_id = p_tenant_id
          AND deleted_at IS NULL;

        IF v_existing_email_count > 0 THEN
          v_errors := v_errors || jsonb_build_array(
            jsonb_build_object('row', v_row_num, 'field', 'email', 'message', 'Email already exists: ' || v_email)
          );
          v_error_count := v_error_count + 1;
          CONTINUE;
        END IF;
      END IF;

      -- Resolve membership type by code
      v_membership_type_code := TRIM(v_member->>'membership_type_code');
      IF v_membership_type_code IS NOT NULL AND v_membership_type_code != '' THEN
        SELECT id INTO v_membership_type_id
        FROM membership_type
        WHERE LOWER(code) = LOWER(v_membership_type_code)
          AND tenant_id = p_tenant_id
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_membership_type_id IS NULL THEN
          -- Try to find a default membership type
          SELECT id INTO v_membership_type_id
          FROM membership_type
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
          ORDER BY created_at ASC
          LIMIT 1;
        END IF;
      ELSE
        -- Get default membership type
        SELECT id INTO v_membership_type_id
        FROM membership_type
        WHERE tenant_id = p_tenant_id
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1;
      END IF;

      -- Resolve membership stage by code
      v_membership_stage_code := TRIM(v_member->>'membership_stage_code');
      IF v_membership_stage_code IS NOT NULL AND v_membership_stage_code != '' THEN
        SELECT id INTO v_membership_stage_id
        FROM membership_stage
        WHERE LOWER(code) = LOWER(v_membership_stage_code)
          AND tenant_id = p_tenant_id
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_membership_stage_id IS NULL THEN
          -- Try to find a default membership stage (order by name instead of display_order)
          SELECT id INTO v_membership_stage_id
          FROM membership_stage
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
          ORDER BY name ASC, created_at ASC
          LIMIT 1;
        END IF;
      ELSE
        -- Get default membership stage (order by name instead of display_order)
        SELECT id INTO v_membership_stage_id
        FROM membership_stage
        WHERE tenant_id = p_tenant_id
          AND deleted_at IS NULL
        ORDER BY name ASC, created_at ASC
        LIMIT 1;
      END IF;

      -- Resolve membership center by code (optional)
      v_membership_center_code := TRIM(v_member->>'membership_center_code');
      IF v_membership_center_code IS NOT NULL AND v_membership_center_code != '' THEN
        SELECT id INTO v_membership_center_id
        FROM membership_center
        WHERE LOWER(code) = LOWER(v_membership_center_code)
          AND tenant_id = p_tenant_id
          AND deleted_at IS NULL
        LIMIT 1;
      END IF;

      -- Insert the member
      INSERT INTO members (
        tenant_id,
        first_name,
        last_name,
        middle_name,
        preferred_name,
        email,
        contact_number,
        gender,
        marital_status,
        birthday,
        anniversary,
        address_street,
        address_city,
        address_state,
        address_postal_code,
        address_country,
        occupation,
        membership_type_id,
        membership_status_id,
        membership_center_id,
        membership_date,
        tags,
        created_at,
        updated_at
      ) VALUES (
        p_tenant_id,
        v_first_name,
        v_last_name,
        NULLIF(TRIM(v_member->>'middle_name'), ''),
        NULLIF(TRIM(v_member->>'preferred_name'), ''),
        NULLIF(v_email, ''),
        NULLIF(TRIM(v_member->>'contact_number'), ''),
        CASE
          WHEN LOWER(TRIM(v_member->>'gender')) IN ('male', 'female', 'other')
          THEN LOWER(TRIM(v_member->>'gender'))::text
          ELSE NULL
        END,
        CASE
          WHEN LOWER(TRIM(v_member->>'marital_status')) IN ('single', 'married', 'widowed', 'divorced', 'engaged')
          THEN LOWER(TRIM(v_member->>'marital_status'))::text
          ELSE NULL
        END,
        CASE
          WHEN v_member->>'birthday' IS NOT NULL AND v_member->>'birthday' != ''
          THEN (v_member->>'birthday')::DATE
          ELSE NULL
        END,
        CASE
          WHEN v_member->>'anniversary' IS NOT NULL AND v_member->>'anniversary' != ''
          THEN (v_member->>'anniversary')::DATE
          ELSE NULL
        END,
        NULLIF(TRIM(v_member->>'address_street'), ''),
        NULLIF(TRIM(v_member->>'address_city'), ''),
        NULLIF(TRIM(v_member->>'address_state'), ''),
        NULLIF(TRIM(v_member->>'address_postal_code'), ''),
        NULLIF(TRIM(v_member->>'address_country'), ''),
        NULLIF(TRIM(v_member->>'occupation'), ''),
        v_membership_type_id,
        v_membership_stage_id,
        v_membership_center_id,
        CASE
          WHEN v_member->>'membership_date' IS NOT NULL AND v_member->>'membership_date' != ''
          THEN (v_member->>'membership_date')::DATE
          ELSE CURRENT_DATE
        END,
        CASE
          WHEN v_member->'tags' IS NOT NULL AND jsonb_typeof(v_member->'tags') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_member->'tags'))
          ELSE NULL
        END,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_member_id;

      -- Record success
      v_imported_ids := v_imported_ids || to_jsonb(v_member_id::TEXT);
      v_imported_count := v_imported_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Record error and continue
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object('row', v_row_num, 'field', 'database', 'message', SQLERRM)
      );
      v_error_count := v_error_count + 1;
    END;
  END LOOP;

  -- Return result
  RETURN jsonb_build_object(
    'success', v_error_count = 0,
    'imported_count', v_imported_count,
    'error_count', v_error_count,
    'errors', v_errors,
    'imported_ids', v_imported_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Fixed import_members_batch RPC function - removed display_order reference';
END $$;
