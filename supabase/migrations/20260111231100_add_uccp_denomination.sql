-- Migration: Add UCCP (United Church of Christ in the Philippines) denomination
-- This migration adds UCCP to the default denominations and updates the function

-- =============================================================================
-- STEP 1: Update the insert_default_denominations_for_tenant function to include UCCP
-- =============================================================================

CREATE OR REPLACE FUNCTION insert_default_denominations_for_tenant(p_tenant_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  INSERT INTO religious_denominations (tenant_id, code, name, description, is_system, sort_order, created_by)
  VALUES
    (p_tenant_id, 'uccp', 'United Church of Christ in the Philippines (UCCP)', 'United Church of Christ in the Philippines', true, 1, v_user_id),
    (p_tenant_id, 'baptist', 'Baptist', 'Baptist denomination', true, 2, v_user_id),
    (p_tenant_id, 'catholic', 'Catholic', 'Roman Catholic Church', true, 3, v_user_id),
    (p_tenant_id, 'methodist', 'Methodist', 'Methodist denomination', true, 4, v_user_id),
    (p_tenant_id, 'presbyterian', 'Presbyterian', 'Presbyterian denomination', true, 5, v_user_id),
    (p_tenant_id, 'lutheran', 'Lutheran', 'Lutheran denomination', true, 6, v_user_id),
    (p_tenant_id, 'episcopal', 'Episcopal', 'Episcopal/Anglican denomination', true, 7, v_user_id),
    (p_tenant_id, 'pentecostal', 'Pentecostal', 'Pentecostal denomination', true, 8, v_user_id),
    (p_tenant_id, 'church_of_christ', 'Church of Christ', 'Church of Christ denomination', true, 9, v_user_id),
    (p_tenant_id, 'assemblies_of_god', 'Assemblies of God', 'Assemblies of God denomination', true, 10, v_user_id),
    (p_tenant_id, 'seventh_day_adventist', 'Seventh-day Adventist', 'Seventh-day Adventist denomination', true, 11, v_user_id),
    (p_tenant_id, 'nondenominational', 'Non-denominational', 'Non-denominational Christian', true, 12, v_user_id),
    (p_tenant_id, 'evangelical', 'Evangelical', 'Evangelical Christian', true, 13, v_user_id),
    (p_tenant_id, 'born_again', 'Born Again Christian', 'Born Again Christian', true, 14, v_user_id),
    (p_tenant_id, 'iglesia_ni_cristo', 'Iglesia ni Cristo', 'Iglesia ni Cristo', true, 15, v_user_id),
    (p_tenant_id, 'jehovahs_witness', 'Jehovah''s Witness', 'Jehovah''s Witness', true, 16, v_user_id),
    (p_tenant_id, 'latter_day_saints', 'Latter-day Saints', 'Church of Jesus Christ of Latter-day Saints', true, 17, v_user_id),
    (p_tenant_id, 'orthodox', 'Orthodox', 'Eastern Orthodox Church', true, 18, v_user_id),
    (p_tenant_id, 'interdenominational', 'Interdenominational', 'Interdenominational Christian', true, 19, v_user_id),
    (p_tenant_id, 'other', 'Other', 'Other denomination not listed', true, 99, v_user_id),
    (p_tenant_id, 'none', 'None / No prior denomination', 'No prior religious affiliation', true, 100, v_user_id)
  ON CONFLICT (tenant_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION insert_default_denominations_for_tenant(uuid, uuid) IS 'Inserts default religious denominations for a tenant, including UCCP';

-- =============================================================================
-- STEP 2: Insert UCCP for all existing tenants that don't have it
-- =============================================================================

INSERT INTO religious_denominations (tenant_id, code, name, description, is_system, sort_order)
SELECT
  t.id,
  'uccp',
  'United Church of Christ in the Philippines (UCCP)',
  'United Church of Christ in the Philippines',
  true,
  1
FROM tenants t
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM religious_denominations rd
    WHERE rd.tenant_id = t.id AND rd.code = 'uccp'
  )
ON CONFLICT (tenant_id, code) DO NOTHING;

-- =============================================================================
-- STEP 3: Also add Interdenominational for existing tenants
-- =============================================================================

INSERT INTO religious_denominations (tenant_id, code, name, description, is_system, sort_order)
SELECT
  t.id,
  'interdenominational',
  'Interdenominational',
  'Interdenominational Christian',
  true,
  19
FROM tenants t
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM religious_denominations rd
    WHERE rd.tenant_id = t.id AND rd.code = 'interdenominational'
  )
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added UCCP and Interdenominational to religious denominations';
END $$;
