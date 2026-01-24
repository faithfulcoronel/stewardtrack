-- =====================================================
-- Age Distribution RPC Function
-- Returns member count by church age groups
-- =====================================================

CREATE OR REPLACE FUNCTION get_member_age_distribution(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_with_birthday INT;
  v_total_without_birthday INT;
  v_average_age NUMERIC;
  v_median_age NUMERIC;
  v_age_groups JSON;
BEGIN
  -- Count members with and without birthday
  SELECT
    COUNT(*) FILTER (WHERE birthday IS NOT NULL),
    COUNT(*) FILTER (WHERE birthday IS NULL)
  INTO v_total_with_birthday, v_total_without_birthday
  FROM members
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  -- Calculate average age
  SELECT AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, birthday::date)))::NUMERIC(10,1)
  INTO v_average_age
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND birthday IS NOT NULL;

  -- Calculate median age
  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(YEAR FROM AGE(CURRENT_DATE, birthday::date))
  )::NUMERIC(10,1)
  INTO v_median_age
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND birthday IS NOT NULL;

  -- Get age group distribution
  WITH age_calc AS (
    SELECT
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, birthday::date))::INT as age
    FROM members
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND birthday IS NOT NULL
  ),
  age_groups AS (
    SELECT
      CASE
        WHEN age BETWEEN 0 AND 3 THEN 'nursery'
        WHEN age BETWEEN 4 AND 6 THEN 'preschool'
        WHEN age BETWEEN 7 AND 9 THEN 'primary'
        WHEN age BETWEEN 10 AND 12 THEN 'juniors'
        WHEN age BETWEEN 13 AND 17 THEN 'youth'
        WHEN age BETWEEN 18 AND 25 THEN 'young_adults'
        WHEN age BETWEEN 26 AND 35 THEN 'adults_26_35'
        WHEN age BETWEEN 36 AND 45 THEN 'adults_36_45'
        WHEN age BETWEEN 46 AND 55 THEN 'adults_46_55'
        WHEN age BETWEEN 56 AND 64 THEN 'pre_seniors'
        WHEN age >= 65 THEN 'seniors'
        ELSE 'unknown'
      END as age_group,
      CASE
        WHEN age BETWEEN 0 AND 3 THEN 'Nursery (0-3)'
        WHEN age BETWEEN 4 AND 6 THEN 'Preschool (4-6)'
        WHEN age BETWEEN 7 AND 9 THEN 'Primary (7-9)'
        WHEN age BETWEEN 10 AND 12 THEN 'Juniors (10-12)'
        WHEN age BETWEEN 13 AND 17 THEN 'Youth (13-17)'
        WHEN age BETWEEN 18 AND 25 THEN 'Young Adults (18-25)'
        WHEN age BETWEEN 26 AND 35 THEN 'Adults (26-35)'
        WHEN age BETWEEN 36 AND 45 THEN 'Adults (36-45)'
        WHEN age BETWEEN 46 AND 55 THEN 'Adults (46-55)'
        WHEN age BETWEEN 56 AND 64 THEN 'Pre-Seniors (56-64)'
        WHEN age >= 65 THEN 'Seniors (65+)'
        ELSE 'Unknown'
      END as label,
      CASE
        WHEN age BETWEEN 0 AND 3 THEN 0
        WHEN age BETWEEN 4 AND 6 THEN 4
        WHEN age BETWEEN 7 AND 9 THEN 7
        WHEN age BETWEEN 10 AND 12 THEN 10
        WHEN age BETWEEN 13 AND 17 THEN 13
        WHEN age BETWEEN 18 AND 25 THEN 18
        WHEN age BETWEEN 26 AND 35 THEN 26
        WHEN age BETWEEN 36 AND 45 THEN 36
        WHEN age BETWEEN 46 AND 55 THEN 46
        WHEN age BETWEEN 56 AND 64 THEN 56
        WHEN age >= 65 THEN 65
        ELSE 0
      END as min_age,
      CASE
        WHEN age BETWEEN 0 AND 3 THEN 3
        WHEN age BETWEEN 4 AND 6 THEN 6
        WHEN age BETWEEN 7 AND 9 THEN 9
        WHEN age BETWEEN 10 AND 12 THEN 12
        WHEN age BETWEEN 13 AND 17 THEN 17
        WHEN age BETWEEN 18 AND 25 THEN 25
        WHEN age BETWEEN 26 AND 35 THEN 35
        WHEN age BETWEEN 36 AND 45 THEN 45
        WHEN age BETWEEN 46 AND 55 THEN 55
        WHEN age BETWEEN 56 AND 64 THEN 64
        WHEN age >= 65 THEN 120
        ELSE 0
      END as max_age,
      CASE
        WHEN age BETWEEN 0 AND 3 THEN 1
        WHEN age BETWEEN 4 AND 6 THEN 2
        WHEN age BETWEEN 7 AND 9 THEN 3
        WHEN age BETWEEN 10 AND 12 THEN 4
        WHEN age BETWEEN 13 AND 17 THEN 5
        WHEN age BETWEEN 18 AND 25 THEN 6
        WHEN age BETWEEN 26 AND 35 THEN 7
        WHEN age BETWEEN 36 AND 45 THEN 8
        WHEN age BETWEEN 46 AND 55 THEN 9
        WHEN age BETWEEN 56 AND 64 THEN 10
        WHEN age >= 65 THEN 11
        ELSE 12
      END as sort_order
    FROM age_calc
  ),
  grouped AS (
    SELECT
      age_group,
      label,
      min_age,
      max_age,
      sort_order,
      COUNT(*) as count,
      CASE
        WHEN v_total_with_birthday > 0
        THEN ROUND((COUNT(*)::NUMERIC / v_total_with_birthday::NUMERIC) * 100, 1)
        ELSE 0
      END as percentage
    FROM age_groups
    GROUP BY age_group, label, min_age, max_age, sort_order
    ORDER BY sort_order
  )
  SELECT json_agg(
    json_build_object(
      'ageGroup', age_group,
      'label', label,
      'minAge', min_age,
      'maxAge', max_age,
      'count', count,
      'percentage', percentage
    )
  ) INTO v_age_groups
  FROM grouped;

  v_result := json_build_object(
    'items', COALESCE(v_age_groups, '[]'::json),
    'averageAge', COALESCE(v_average_age, 0),
    'medianAge', COALESCE(v_median_age, 0),
    'membersWithBirthday', COALESCE(v_total_with_birthday, 0),
    'membersWithoutBirthday', COALESCE(v_total_without_birthday, 0)
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_member_age_distribution(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_member_age_distribution IS 'Returns member age distribution by church age groups (nursery through seniors)';
