-- =====================================================
-- Fix Global Search RPC Function
-- Corrects column references based on actual schema
-- =====================================================

-- Drop and recreate the function with correct column names
CREATE OR REPLACE FUNCTION global_search(
  p_tenant_id UUID,
  p_query TEXT,
  p_entity_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_query tsquery;
  v_results JSON;
  v_members JSON;
  v_accounts JSON;
  v_transactions JSON;
  v_events JSON;
  v_ministries JSON;
  v_care_plans JSON;
  v_discipleship_plans JSON;
  v_notebooks JSON;
  v_notes JSON;
  v_donations JSON;
  v_families JSON;
  v_start_time TIMESTAMPTZ;
  v_duration INTEGER;
  v_total_count INTEGER := 0;
  v_search_all BOOLEAN;
BEGIN
  v_start_time := clock_timestamp();

  -- Prepare search query with prefix matching
  v_search_query := plainto_tsquery('english', p_query) || to_tsquery('english', p_query || ':*');
  v_search_all := p_entity_types IS NULL OR array_length(p_entity_types, 1) IS NULL;

  -- Search Members
  IF v_search_all OR 'member' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'member',
      'results', COALESCE(json_agg(row_to_json(m)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM members WHERE tenant_id = p_tenant_id AND (
        first_name ILIKE '%' || p_query || '%' OR
        last_name ILIKE '%' || p_query || '%' OR
        email ILIKE '%' || p_query || '%' OR
        contact_number ILIKE '%' || p_query || '%'
      ))
    )
    INTO v_members
    FROM (
      SELECT
        m.id,
        m.first_name || ' ' || m.last_name AS title,
        m.email AS subtitle,
        COALESCE(m.occupation, m.address_city) AS description,
        m.profile_picture_url AS "imageUrl",
        m.tags,
        m.created_at AS timestamp,
        CASE
          WHEN m.first_name ILIKE p_query || '%' OR m.last_name ILIKE p_query || '%' THEN 1.0
          WHEN m.first_name ILIKE '%' || p_query || '%' OR m.last_name ILIKE '%' || p_query || '%' THEN 0.7
          ELSE 0.3
        END AS score
      FROM members m
      WHERE m.tenant_id = p_tenant_id
        AND (
          m.first_name ILIKE '%' || p_query || '%' OR
          m.last_name ILIKE '%' || p_query || '%' OR
          m.email ILIKE '%' || p_query || '%' OR
          m.contact_number ILIKE '%' || p_query || '%'
        )
      ORDER BY score DESC, m.first_name ASC
      LIMIT p_limit OFFSET p_offset
    ) m;

    v_total_count := v_total_count + COALESCE((v_members->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Accounts
  IF v_search_all OR 'account' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'account',
      'results', COALESCE(json_agg(row_to_json(a)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM accounts WHERE tenant_id = p_tenant_id AND (
        name ILIKE '%' || p_query || '%' OR
        account_number ILIKE '%' || p_query || '%' OR
        email ILIKE '%' || p_query || '%'
      ))
    )
    INTO v_accounts
    FROM (
      SELECT
        a.id,
        a.name AS title,
        a.account_number AS subtitle,
        a.account_type AS description,
        NULL AS "imageUrl",
        ARRAY[]::TEXT[] AS tags,
        a.created_at AS timestamp,
        CASE
          WHEN a.name ILIKE p_query || '%' THEN 1.0
          WHEN a.name ILIKE '%' || p_query || '%' THEN 0.7
          ELSE 0.3
        END AS score
      FROM accounts a
      WHERE a.tenant_id = p_tenant_id
        AND a.is_active = true
        AND (
          a.name ILIKE '%' || p_query || '%' OR
          a.account_number ILIKE '%' || p_query || '%' OR
          a.email ILIKE '%' || p_query || '%'
        )
      ORDER BY score DESC, a.name ASC
      LIMIT p_limit OFFSET p_offset
    ) a;

    v_total_count := v_total_count + COALESCE((v_accounts->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Financial Transactions
  IF v_search_all OR 'transaction' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'transaction',
      'results', COALESCE(json_agg(row_to_json(t)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM financial_transactions WHERE tenant_id = p_tenant_id AND (
        description ILIKE '%' || p_query || '%' OR
        CAST(debit AS TEXT) LIKE '%' || p_query || '%' OR
        CAST(credit AS TEXT) LIKE '%' || p_query || '%'
      ))
    )
    INTO v_transactions
    FROM (
      SELECT
        ft.id,
        ft.description AS title,
        ft.date || ' - ' || COALESCE(ft.type, 'transaction') AS subtitle,
        CASE WHEN ft.debit > 0 THEN 'Debit: ' || ft.debit ELSE 'Credit: ' || ft.credit END AS description,
        NULL AS "imageUrl",
        ARRAY[COALESCE(ft.type, 'transaction')]::TEXT[] AS tags,
        ft.date AS timestamp,
        0.5 AS score
      FROM financial_transactions ft
      WHERE ft.tenant_id = p_tenant_id
        AND (
          ft.description ILIKE '%' || p_query || '%' OR
          CAST(ft.debit AS TEXT) LIKE '%' || p_query || '%' OR
          CAST(ft.credit AS TEXT) LIKE '%' || p_query || '%'
        )
      ORDER BY ft.date DESC
      LIMIT p_limit OFFSET p_offset
    ) t;

    v_total_count := v_total_count + COALESCE((v_transactions->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Calendar Events
  IF v_search_all OR 'event' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'event',
      'results', COALESCE(json_agg(row_to_json(e)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM calendar_events WHERE tenant_id = p_tenant_id AND is_active = true AND (
        title ILIKE '%' || p_query || '%' OR
        description ILIKE '%' || p_query || '%' OR
        location ILIKE '%' || p_query || '%'
      ))
    )
    INTO v_events
    FROM (
      SELECT
        ce.id,
        ce.title,
        ce.start_at::DATE || COALESCE(' at ' || ce.location, '') AS subtitle,
        ce.description,
        NULL AS "imageUrl",
        ce.tags,
        ce.start_at AS timestamp,
        CASE
          WHEN ce.title ILIKE p_query || '%' THEN 1.0
          WHEN ce.title ILIKE '%' || p_query || '%' THEN 0.7
          ELSE 0.3
        END AS score
      FROM calendar_events ce
      WHERE ce.tenant_id = p_tenant_id
        AND ce.is_active = true
        AND (
          ce.title ILIKE '%' || p_query || '%' OR
          ce.description ILIKE '%' || p_query || '%' OR
          ce.location ILIKE '%' || p_query || '%'
        )
      ORDER BY ce.start_at DESC
      LIMIT p_limit OFFSET p_offset
    ) e;

    v_total_count := v_total_count + COALESCE((v_events->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Ministries (fixed: use leader_id with join, not leader_name)
  IF v_search_all OR 'ministry' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'ministry',
      'results', COALESCE(json_agg(row_to_json(m)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM ministries WHERE tenant_id = p_tenant_id AND is_active = true AND (
        name ILIKE '%' || p_query || '%' OR
        description ILIKE '%' || p_query || '%'
      ))
    )
    INTO v_ministries
    FROM (
      SELECT
        mi.id,
        mi.name AS title,
        COALESCE(ldr.first_name || ' ' || ldr.last_name, mi.category::TEXT) AS subtitle,
        mi.description,
        NULL AS "imageUrl",
        ARRAY[mi.category::TEXT]::TEXT[] AS tags,
        mi.created_at AS timestamp,
        CASE
          WHEN mi.name ILIKE p_query || '%' THEN 1.0
          WHEN mi.name ILIKE '%' || p_query || '%' THEN 0.7
          ELSE 0.3
        END AS score
      FROM ministries mi
      LEFT JOIN members ldr ON ldr.id = mi.leader_id
      WHERE mi.tenant_id = p_tenant_id
        AND mi.is_active = true
        AND (
          mi.name ILIKE '%' || p_query || '%' OR
          mi.description ILIKE '%' || p_query || '%'
        )
      ORDER BY score DESC, mi.name ASC
      LIMIT p_limit OFFSET p_offset
    ) m;

    v_total_count := v_total_count + COALESCE((v_ministries->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Care Plans
  IF v_search_all OR 'care_plan' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'care_plan',
      'results', COALESCE(json_agg(row_to_json(c)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM member_care_plans mcp
        JOIN members m ON m.id = mcp.member_id
        WHERE m.tenant_id = p_tenant_id AND (
          mcp.details ILIKE '%' || p_query || '%' OR
          mcp.status_label ILIKE '%' || p_query || '%' OR
          m.first_name ILIKE '%' || p_query || '%' OR
          m.last_name ILIKE '%' || p_query || '%'
        ))
    )
    INTO v_care_plans
    FROM (
      SELECT
        mcp.id,
        m.first_name || ' ' || m.last_name || ' - Care Plan' AS title,
        mcp.status_label AS subtitle,
        mcp.details AS description,
        m.profile_picture_url AS "imageUrl",
        ARRAY[COALESCE(mcp.priority, 'normal')]::TEXT[] AS tags,
        mcp.created_at AS timestamp,
        0.5 AS score
      FROM member_care_plans mcp
      JOIN members m ON m.id = mcp.member_id
      WHERE m.tenant_id = p_tenant_id
        AND (
          mcp.details ILIKE '%' || p_query || '%' OR
          mcp.status_label ILIKE '%' || p_query || '%' OR
          m.first_name ILIKE '%' || p_query || '%' OR
          m.last_name ILIKE '%' || p_query || '%'
        )
      ORDER BY mcp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) c;

    v_total_count := v_total_count + COALESCE((v_care_plans->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Discipleship Plans (fixed: pathway_id -> pathway)
  IF v_search_all OR 'discipleship_plan' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'discipleship_plan',
      'results', COALESCE(json_agg(row_to_json(d)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM member_discipleship_plans mdp
        JOIN members m ON m.id = mdp.member_id
        WHERE m.tenant_id = p_tenant_id AND (
          m.first_name ILIKE '%' || p_query || '%' OR
          m.last_name ILIKE '%' || p_query || '%'
        ))
    )
    INTO v_discipleship_plans
    FROM (
      SELECT
        mdp.id,
        m.first_name || ' ' || m.last_name || ' - Discipleship' AS title,
        mdp.pathway AS subtitle,
        mdp.mentor_name AS description,
        m.profile_picture_url AS "imageUrl",
        ARRAY[COALESCE(mdp.status, 'active')]::TEXT[] AS tags,
        mdp.created_at AS timestamp,
        0.5 AS score
      FROM member_discipleship_plans mdp
      JOIN members m ON m.id = mdp.member_id
      WHERE m.tenant_id = p_tenant_id
        AND (
          m.first_name ILIKE '%' || p_query || '%' OR
          m.last_name ILIKE '%' || p_query || '%' OR
          mdp.pathway ILIKE '%' || p_query || '%'
        )
      ORDER BY mdp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) d;

    v_total_count := v_total_count + COALESCE((v_discipleship_plans->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Notebooks
  IF v_search_all OR 'notebook' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'notebook',
      'results', COALESCE(json_agg(row_to_json(n)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM notebooks WHERE tenant_id = p_tenant_id AND status != 'deleted' AND (
        title ILIKE '%' || p_query || '%' OR
        description ILIKE '%' || p_query || '%'
      ))
    )
    INTO v_notebooks
    FROM (
      SELECT
        n.id,
        n.title,
        n.visibility || ' notebook' AS subtitle,
        n.description,
        NULL AS "imageUrl",
        COALESCE(n.tags, ARRAY[]::TEXT[]) AS tags,
        n.updated_at AS timestamp,
        CASE
          WHEN n.title ILIKE p_query || '%' THEN 1.0
          WHEN n.title ILIKE '%' || p_query || '%' THEN 0.7
          ELSE 0.3
        END AS score
      FROM notebooks n
      WHERE n.tenant_id = p_tenant_id
        AND n.status != 'deleted'
        AND (
          n.title ILIKE '%' || p_query || '%' OR
          n.description ILIKE '%' || p_query || '%'
        )
      ORDER BY score DESC, n.updated_at DESC
      LIMIT p_limit OFFSET p_offset
    ) n;

    v_total_count := v_total_count + COALESCE((v_notebooks->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Notebook Pages (Notes)
  IF v_search_all OR 'note' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'note',
      'results', COALESCE(json_agg(row_to_json(np)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM notebook_pages np
        JOIN notebooks n ON n.id = np.notebook_id
        WHERE n.tenant_id = p_tenant_id AND np.deleted_at IS NULL AND (
          np.title ILIKE '%' || p_query || '%' OR
          np.content ILIKE '%' || p_query || '%'
        ))
    )
    INTO v_notes
    FROM (
      SELECT
        np.id,
        np.title,
        n.title AS subtitle,
        LEFT(np.content, 150) AS description,
        NULL AS "imageUrl",
        COALESCE(np.tags, ARRAY[]::TEXT[]) AS tags,
        np.updated_at AS timestamp,
        CASE
          WHEN np.title ILIKE p_query || '%' THEN 1.0
          WHEN np.content ILIKE '%' || p_query || '%' THEN 0.6
          ELSE 0.3
        END AS score
      FROM notebook_pages np
      JOIN notebooks n ON n.id = np.notebook_id
      WHERE n.tenant_id = p_tenant_id
        AND np.deleted_at IS NULL
        AND (
          np.title ILIKE '%' || p_query || '%' OR
          np.content ILIKE '%' || p_query || '%'
        )
      ORDER BY score DESC, np.updated_at DESC
      LIMIT p_limit OFFSET p_offset
    ) np;

    v_total_count := v_total_count + COALESCE((v_notes->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Donations
  IF v_search_all OR 'donation' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'donation',
      'results', COALESCE(json_agg(row_to_json(d)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM donations WHERE tenant_id = p_tenant_id AND (
        CAST(amount AS TEXT) LIKE '%' || p_query || '%' OR
        status ILIKE '%' || p_query || '%'
      ))
    )
    INTO v_donations
    FROM (
      SELECT
        d.id,
        COALESCE(m.first_name || ' ' || m.last_name, 'Anonymous') || ' - ' || d.currency || ' ' || d.amount AS title,
        d.status || ' - ' || d.source AS subtitle,
        d.created_at::DATE::TEXT AS description,
        m.profile_picture_url AS "imageUrl",
        ARRAY[d.status, d.source]::TEXT[] AS tags,
        d.created_at AS timestamp,
        0.5 AS score
      FROM donations d
      LEFT JOIN members m ON m.id = d.member_id
      WHERE d.tenant_id = p_tenant_id
        AND (
          CAST(d.amount AS TEXT) LIKE '%' || p_query || '%' OR
          d.status ILIKE '%' || p_query || '%' OR
          m.first_name ILIKE '%' || p_query || '%' OR
          m.last_name ILIKE '%' || p_query || '%'
        )
      ORDER BY d.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) d;

    v_total_count := v_total_count + COALESCE((v_donations->>'totalCount')::INTEGER, 0);
  END IF;

  -- Search Families
  IF v_search_all OR 'family' = ANY(p_entity_types) THEN
    SELECT json_build_object(
      'entityType', 'family',
      'results', COALESCE(json_agg(row_to_json(f)), '[]'::json),
      'totalCount', (SELECT COUNT(*) FROM families WHERE tenant_id = p_tenant_id AND (
        name ILIKE '%' || p_query || '%' OR
        address_city ILIKE '%' || p_query || '%'
      ))
    )
    INTO v_families
    FROM (
      SELECT
        f.id,
        f.name AS title,
        f.address_city AS subtitle,
        f.address_street AS description,
        NULL AS "imageUrl",
        ARRAY[]::TEXT[] AS tags,
        f.created_at AS timestamp,
        CASE
          WHEN f.name ILIKE p_query || '%' THEN 1.0
          WHEN f.name ILIKE '%' || p_query || '%' THEN 0.7
          ELSE 0.3
        END AS score
      FROM families f
      WHERE f.tenant_id = p_tenant_id
        AND (
          f.name ILIKE '%' || p_query || '%' OR
          f.address_city ILIKE '%' || p_query || '%'
        )
      ORDER BY score DESC, f.name ASC
      LIMIT p_limit OFFSET p_offset
    ) f;

    v_total_count := v_total_count + COALESCE((v_families->>'totalCount')::INTEGER, 0);
  END IF;

  -- Calculate duration
  v_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- Build final response
  v_results := json_build_object(
    'query', p_query,
    'groups', json_build_array(
      v_members,
      v_accounts,
      v_transactions,
      v_events,
      v_ministries,
      v_care_plans,
      v_discipleship_plans,
      v_notebooks,
      v_notes,
      v_donations,
      v_families
    ),
    'totalCount', v_total_count,
    'duration', v_duration
  );

  -- Filter out null groups
  SELECT json_build_object(
    'query', v_results->>'query',
    'groups', (
      SELECT json_agg(g)
      FROM json_array_elements(v_results->'groups') AS g
      WHERE g IS NOT NULL AND g->>'entityType' IS NOT NULL
    ),
    'totalCount', (v_results->>'totalCount')::INTEGER,
    'duration', (v_results->>'duration')::INTEGER
  ) INTO v_results;

  RETURN v_results;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION global_search IS 'Unified global search across all entity types - v2 with corrected column references';
