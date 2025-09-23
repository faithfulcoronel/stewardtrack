-- Rename membership_status table to membership_stage to reflect updated terminology
ALTER TABLE membership_status RENAME TO membership_stage;

-- Rename supporting indexes for the new table name
ALTER INDEX IF EXISTS idx_membership_status_tenant_code RENAME TO idx_membership_stage_tenant_code;
ALTER INDEX IF EXISTS idx_membership_status_deleted_at RENAME TO idx_membership_stage_deleted_at;

-- Provide a legacy view so existing code referencing membership_status continues to work
CREATE OR REPLACE VIEW membership_status AS
SELECT *
FROM membership_stage;

COMMENT ON VIEW membership_status IS 'Legacy compatibility view. membership_stage is now the canonical table.';

-- Update column comment to use the new terminology
COMMENT ON COLUMN members.membership_status_id IS 'Reference to membership_stage table (legacy column name retained for compatibility).';

-- Create membership centers for multi-site congregations
CREATE TABLE IF NOT EXISTS membership_center (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  address jsonb,
  service_times text[],
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_membership_center_tenant_code ON membership_center(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_membership_center_deleted_at ON membership_center(deleted_at);

ALTER TABLE membership_center ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membership centers are viewable by tenant users" ON membership_center
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Membership centers can be managed by tenant admins" ON membership_center
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

CREATE TRIGGER set_membership_center_updated_at
  BEFORE UPDATE ON membership_center
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add center reference and ministry context columns to members
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS membership_center_id uuid REFERENCES membership_center(id),
  ADD COLUMN IF NOT EXISTS preferred_contact_method text CHECK (
    preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'text', 'mail')
  ) DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS care_status_code text,
  ADD COLUMN IF NOT EXISTS care_pastor text,
  ADD COLUMN IF NOT EXISTS care_follow_up_at date,
  ADD COLUMN IF NOT EXISTS serving_team text,
  ADD COLUMN IF NOT EXISTS serving_role text,
  ADD COLUMN IF NOT EXISTS serving_schedule text,
  ADD COLUMN IF NOT EXISTS serving_coach text,
  ADD COLUMN IF NOT EXISTS discipleship_next_step text,
  ADD COLUMN IF NOT EXISTS discipleship_mentor text,
  ADD COLUMN IF NOT EXISTS discipleship_group text,
  ADD COLUMN IF NOT EXISTS giving_recurring_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS giving_recurring_frequency text,
  ADD COLUMN IF NOT EXISTS giving_recurring_method text,
  ADD COLUMN IF NOT EXISTS giving_pledge_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS giving_pledge_campaign text,
  ADD COLUMN IF NOT EXISTS giving_last_gift_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS giving_last_gift_at date,
  ADD COLUMN IF NOT EXISTS giving_last_gift_fund text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS idx_members_membership_center ON members(membership_center_id);

COMMENT ON COLUMN members.membership_center_id IS 'Primary center assignment for the member.''s household.';
COMMENT ON COLUMN members.preferred_contact_method IS 'Preferred communication method (email, phone, text, or mail).';
COMMENT ON COLUMN members.care_status_code IS 'Current care escalation status for pastoral teams.';
COMMENT ON COLUMN members.care_pastor IS 'Pastor or care lead assigned to the member.''s shepherding plan.';
COMMENT ON COLUMN members.care_follow_up_at IS 'Next scheduled pastoral follow-up date.';
COMMENT ON COLUMN members.serving_team IS 'Primary serving team for the member.';
COMMENT ON COLUMN members.serving_role IS 'Role fulfilled by the member within their serving team.';
COMMENT ON COLUMN members.serving_schedule IS 'Serving rhythm or schedule for the member.''s team.';
COMMENT ON COLUMN members.serving_coach IS 'Coach or team lead supporting the member.''s serving assignment.';
COMMENT ON COLUMN members.discipleship_next_step IS 'Next discipleship milestone or action for the member.';
COMMENT ON COLUMN members.discipleship_mentor IS 'Mentor assigned to disciple the member.';
COMMENT ON COLUMN members.discipleship_group IS 'Primary discipleship or small group connection.';
COMMENT ON COLUMN members.giving_recurring_amount IS 'Configured recurring giving amount for the member.''s household.';
COMMENT ON COLUMN members.giving_recurring_frequency IS 'Frequency label for the member''s recurring giving (e.g., Monthly).';
COMMENT ON COLUMN members.giving_recurring_method IS 'Payment method used for the member''s recurring giving (e.g., ACH, card).';
COMMENT ON COLUMN members.giving_pledge_amount IS 'Active pledge commitment amount associated with the member.';
COMMENT ON COLUMN members.giving_pledge_campaign IS 'Campaign or fund associated with the member''s pledge.';
COMMENT ON COLUMN members.giving_last_gift_amount IS 'Amount of the most recent gift from the member.';
COMMENT ON COLUMN members.giving_last_gift_at IS 'Date of the member''s most recent gift.';
COMMENT ON COLUMN members.giving_last_gift_fund IS 'Fund designation for the member''s most recent gift.';
COMMENT ON COLUMN members.tags IS 'Freeform ministry tags that power quick filters and highlights.';

UPDATE members
SET preferred_contact_method = COALESCE(preferred_contact_method, 'email');

UPDATE members
SET tags = ARRAY[]::text[]
WHERE tags IS NULL;

-- Track membership stage movement for better journey insights
CREATE TABLE IF NOT EXISTS membership_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  previous_stage_id uuid REFERENCES membership_stage(id),
  stage_id uuid REFERENCES membership_stage(id) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_stage_history_tenant ON membership_stage_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_membership_stage_history_member ON membership_stage_history(member_id, changed_at DESC);

ALTER TABLE membership_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stage history is viewable by tenant users" ON membership_stage_history
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Stage history entries can be managed by tenant admins" ON membership_stage_history
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

-- Care plan table to coordinate shepherding assignments
CREATE TABLE IF NOT EXISTS member_care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  status_code text NOT NULL,
  status_label text,
  assigned_to text,
  follow_up_at date,
  closed_at timestamptz,
  priority text,
  details text,
  membership_stage_id uuid REFERENCES membership_stage(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_member_care_plans_tenant ON member_care_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_care_plans_member ON member_care_plans(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_member_care_plans_active ON member_care_plans(is_active) WHERE deleted_at IS NULL;

ALTER TABLE member_care_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Care plans are viewable by tenant users" ON member_care_plans
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Care plans can be managed by tenant admins" ON member_care_plans
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

CREATE TRIGGER set_member_care_plans_updated_at
  BEFORE UPDATE ON member_care_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Serving assignments to coordinate volunteer rhythms
CREATE TABLE IF NOT EXISTS member_serving_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  role_name text,
  schedule text,
  coach_name text,
  status text,
  start_on date,
  end_on date,
  is_primary boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_member_serving_assignments_tenant ON member_serving_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_serving_assignments_member ON member_serving_assignments(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_member_serving_assignments_primary ON member_serving_assignments(member_id) WHERE is_primary = true AND deleted_at IS NULL;

ALTER TABLE member_serving_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Serving assignments are viewable by tenant users" ON member_serving_assignments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Serving assignments can be managed by tenant admins" ON member_serving_assignments
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

CREATE TRIGGER set_member_serving_assignments_updated_at
  BEFORE UPDATE ON member_serving_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Discipleship pathways and milestones
CREATE TABLE IF NOT EXISTS member_discipleship_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  pathway text,
  next_step text,
  mentor_name text,
  small_group text,
  target_date date,
  status text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_member_discipleship_plans_tenant ON member_discipleship_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_discipleship_plans_member ON member_discipleship_plans(member_id) WHERE deleted_at IS NULL;

ALTER TABLE member_discipleship_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discipleship plans are viewable by tenant users" ON member_discipleship_plans
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Discipleship plans can be managed by tenant admins" ON member_discipleship_plans
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

CREATE TRIGGER set_member_discipleship_plans_updated_at
  BEFORE UPDATE ON member_discipleship_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS member_discipleship_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES member_discipleship_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  milestone_date date,
  celebrated_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_member_discipleship_milestones_tenant ON member_discipleship_milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_discipleship_milestones_member ON member_discipleship_milestones(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_member_discipleship_milestones_plan ON member_discipleship_milestones(plan_id) WHERE deleted_at IS NULL;

ALTER TABLE member_discipleship_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discipleship milestones are viewable by tenant users" ON member_discipleship_milestones
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Discipleship milestones can be managed by tenant admins" ON member_discipleship_milestones
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

-- Giving profiles to bridge finance insights to membership records
CREATE TABLE IF NOT EXISTS member_giving_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  recurring_amount numeric(12,2),
  recurring_frequency text,
  recurring_method text,
  recurring_status text,
  pledge_amount numeric(12,2),
  pledge_campaign text,
  pledge_start_date date,
  pledge_end_date date,
  ytd_amount numeric(12,2),
  ytd_year integer,
  last_gift_amount numeric(12,2),
  last_gift_at date,
  last_gift_fund text,
  last_gift_source text,
  data_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_giving_profiles_member_year ON member_giving_profiles(member_id, ytd_year) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_member_giving_profiles_tenant ON member_giving_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_giving_profiles_member ON member_giving_profiles(member_id) WHERE deleted_at IS NULL;
ALTER TABLE member_giving_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Giving profiles are viewable by tenant users" ON member_giving_profiles
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Giving profiles can be managed by tenant admins" ON member_giving_profiles
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

CREATE TRIGGER set_member_giving_profiles_updated_at
  BEFORE UPDATE ON member_giving_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- Helper to recalculate giving profile aggregates after ledger activity
CREATE OR REPLACE FUNCTION refresh_member_giving_profile(
  p_member_id uuid,
  p_tenant_id uuid,
  p_reference_date date DEFAULT current_date,
  p_user_id uuid DEFAULT NULL
) RETURNS member_giving_profiles
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_year integer := date_part('year', COALESCE(p_reference_date, current_date))::integer;
  v_now timestamptz := now();
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_ytd_amount numeric(12,2);
  v_last_amount numeric(12,2);
  v_last_date date;
  v_last_fund text;
  v_last_source text;
  v_profile member_giving_profiles%ROWTYPE;
BEGIN
  -- Sum posted, non-voided credit activity for the requested year
  SELECT COALESCE(SUM(ft.credit), 0)
  INTO v_ytd_amount
  FROM financial_transactions ft
  JOIN financial_transaction_headers h ON h.id = ft.header_id
  WHERE ft.member_id = p_member_id
    AND ft.tenant_id = p_tenant_id
    AND ft.deleted_at IS NULL
    AND h.deleted_at IS NULL
    AND h.status <> 'voided'
    AND ft.credit > 0
    AND date_part('year', ft.date) = v_year;

  -- Capture the most recent credit entry for last gift insights
  SELECT ft.credit,
         ft.date,
         f.name,
         s.name
  INTO v_last_amount,
       v_last_date,
       v_last_fund,
       v_last_source
  FROM financial_transactions ft
  JOIN financial_transaction_headers h ON h.id = ft.header_id
  LEFT JOIN funds f ON f.id = ft.fund_id
  LEFT JOIN financial_sources s ON s.id = ft.source_id
  WHERE ft.member_id = p_member_id
    AND ft.tenant_id = p_tenant_id
    AND ft.deleted_at IS NULL
    AND h.deleted_at IS NULL
    AND h.status <> 'voided'
    AND ft.credit > 0
  ORDER BY ft.date DESC, ft.created_at DESC
  LIMIT 1;

  INSERT INTO member_giving_profiles (
    tenant_id,
    member_id,
    ytd_year,
    ytd_amount,
    last_gift_amount,
    last_gift_at,
    last_gift_fund,
    last_gift_source,
    created_at,
    created_by,
    updated_at,
    updated_by
  ) VALUES (
    p_tenant_id,
    p_member_id,
    v_year,
    v_ytd_amount,
    v_last_amount,
    v_last_date,
    v_last_fund,
    v_last_source,
    v_now,
    v_user_id,
    v_now,
    v_user_id
  )
  ON CONFLICT (member_id, ytd_year) WHERE deleted_at IS NULL
  DO UPDATE SET
    ytd_amount = EXCLUDED.ytd_amount,
    last_gift_amount = EXCLUDED.last_gift_amount,
    last_gift_at = EXCLUDED.last_gift_at,
    last_gift_fund = EXCLUDED.last_gift_fund,
    last_gift_source = EXCLUDED.last_gift_source,
    updated_at = v_now,
    updated_by = v_user_id
  RETURNING * INTO v_profile;

  UPDATE members
  SET giving_last_gift_amount = v_profile.last_gift_amount,
      giving_last_gift_at = v_profile.last_gift_at,
      giving_last_gift_fund = v_profile.last_gift_fund,
      giving_recurring_amount = COALESCE(v_profile.recurring_amount, giving_recurring_amount),
      giving_recurring_frequency = COALESCE(v_profile.recurring_frequency, giving_recurring_frequency),
      giving_recurring_method = COALESCE(v_profile.recurring_method, giving_recurring_method),
      giving_pledge_amount = COALESCE(v_profile.pledge_amount, giving_pledge_amount),
      giving_pledge_campaign = COALESCE(v_profile.pledge_campaign, giving_pledge_campaign)
  WHERE id = p_member_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION refresh_member_giving_profile(uuid, uuid, date, uuid) IS 'Recalculates YTD totals and last gift details for a member giving profile based on posted ledger activity.';

GRANT EXECUTE ON FUNCTION refresh_member_giving_profile(uuid, uuid, date, uuid) TO authenticated;

-- RPC to process member giving ledger activity while maintaining double-entry integrity
CREATE OR REPLACE FUNCTION process_member_giving_transaction(
  p_operation text,
  p_transaction jsonb,
  p_profile jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_operation text := lower(trim(p_operation));
  v_now timestamptz := now();
  v_user_id uuid := COALESCE((p_transaction->>'user_id')::uuid, auth.uid());
  v_tenant_id uuid;
  v_member_id uuid;
  v_header_id uuid;
  v_transaction_date date;
  v_description text;
  v_reference text;
  v_income_account_id uuid;
  v_cash_account_id uuid;
  v_category_id uuid;
  v_fund_id uuid;
  v_source_id uuid;
  v_amount numeric(12,2);
  v_transaction_number text;
  v_member_first text;
  v_member_last text;
  v_member_label text;
  v_existing_header financial_transaction_headers%ROWTYPE;
  v_existing_member_id uuid;
  v_credit_row financial_transactions%ROWTYPE;
  v_debit_row financial_transactions%ROWTYPE;
  v_profile_row member_giving_profiles%ROWTYPE;
  v_result jsonb;
  v_reference_date date;
BEGIN
  IF v_operation NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Unsupported operation: %', p_operation;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user context is required';
  END IF;

  IF v_operation = 'create' THEN
    v_tenant_id := (p_transaction->>'tenant_id')::uuid;
    v_member_id := (p_transaction->>'member_id')::uuid;

    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'tenant_id is required for create operations';
    END IF;

    IF v_member_id IS NULL THEN
      RAISE EXCEPTION 'member_id is required for create operations';
    END IF;
  ELSE
    v_header_id := (p_transaction->>'header_id')::uuid;
    IF v_header_id IS NULL THEN
      RAISE EXCEPTION 'header_id is required for % operations', v_operation;
    END IF;

    SELECT h.*, credit_row.member_id
    INTO v_existing_header, v_existing_member_id
    FROM financial_transaction_headers h
    LEFT JOIN LATERAL (
      SELECT ft.member_id
      FROM financial_transactions ft
      WHERE ft.header_id = h.id
        AND ft.credit > 0
        AND ft.deleted_at IS NULL
      ORDER BY ft.date DESC, ft.created_at DESC
      LIMIT 1
    ) credit_row ON TRUE
    WHERE h.id = v_header_id
      AND h.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Financial transaction header % not found', v_header_id;
    END IF;

    IF v_existing_header.status = 'voided' AND v_operation <> 'delete' THEN
      RAISE EXCEPTION 'Cannot update voided financial transaction header %', v_header_id;
    END IF;

    v_tenant_id := v_existing_header.tenant_id;
    v_member_id := COALESCE((p_transaction->>'member_id')::uuid, v_existing_member_id);

    IF v_member_id IS NULL THEN
      RAISE EXCEPTION 'member_id could not be resolved for header %', v_header_id;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM tenant_users tu
    WHERE tu.tenant_id = v_tenant_id
      AND tu.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User % is not authorized for tenant %', v_user_id, v_tenant_id;
  END IF;

  SELECT m.first_name, m.last_name
  INTO v_member_first, v_member_last
  FROM members m
  WHERE m.id = v_member_id
    AND m.tenant_id = v_tenant_id
    AND m.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member % is not active for tenant %', v_member_id, v_tenant_id;
  END IF;

  v_member_label := trim(both ' ' FROM COALESCE(v_member_first, '') || ' ' || COALESCE(v_member_last, ''));

  v_amount := CASE
    WHEN p_transaction ? 'amount' THEN NULLIF(p_transaction->>'amount', '')::numeric(12,2)
    ELSE NULL
  END;

  v_transaction_date := CASE
    WHEN p_transaction ? 'transaction_date' THEN NULLIF(p_transaction->>'transaction_date', '')::date
    ELSE NULL
  END;

  v_description := NULLIF(p_transaction->>'description', '');
  v_reference := NULLIF(p_transaction->>'reference', '');
  v_income_account_id := CASE WHEN p_transaction ? 'income_account_id' THEN (p_transaction->>'income_account_id')::uuid ELSE NULL END;
  v_cash_account_id := CASE WHEN p_transaction ? 'cash_account_id' THEN (p_transaction->>'cash_account_id')::uuid ELSE NULL END;
  v_category_id := CASE WHEN p_transaction ? 'category_id' THEN (p_transaction->>'category_id')::uuid ELSE NULL END;
  v_fund_id := CASE WHEN p_transaction ? 'fund_id' THEN (p_transaction->>'fund_id')::uuid ELSE NULL END;
  v_source_id := CASE WHEN p_transaction ? 'source_id' THEN (p_transaction->>'source_id')::uuid ELSE NULL END;

  IF v_operation <> 'create' THEN
    SELECT *
    INTO v_credit_row
    FROM financial_transactions
    WHERE header_id = v_header_id
      AND credit > 0
      AND deleted_at IS NULL
    ORDER BY created_at
    LIMIT 1;

    SELECT *
    INTO v_debit_row
    FROM financial_transactions
    WHERE header_id = v_header_id
      AND debit > 0
      AND deleted_at IS NULL
    ORDER BY created_at
    LIMIT 1;

    IF v_credit_row.id IS NULL OR v_debit_row.id IS NULL THEN
      RAISE EXCEPTION 'Ledger entries for header % are incomplete', v_header_id;
    END IF;

    IF v_amount IS NULL THEN
      v_amount := COALESCE(v_credit_row.credit, v_debit_row.debit);
    END IF;

    v_transaction_date := COALESCE(v_transaction_date, v_credit_row.date, v_existing_header.transaction_date, current_date);
    v_description := COALESCE(v_description, v_existing_header.description, CASE WHEN v_member_label <> '' THEN 'Giving - ' || v_member_label ELSE 'Giving entry' END);
    v_reference := COALESCE(v_reference, v_existing_header.reference);
    v_income_account_id := COALESCE(v_income_account_id, v_credit_row.account_id);
    v_cash_account_id := COALESCE(v_cash_account_id, v_debit_row.account_id);
    v_category_id := COALESCE(v_category_id, v_credit_row.category_id);
    v_fund_id := COALESCE(v_fund_id, v_credit_row.fund_id);
    v_source_id := COALESCE(v_source_id, v_existing_header.source_id);
  ELSE
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'amount must be a positive value for giving transactions';
    END IF;

    v_transaction_date := COALESCE(v_transaction_date, current_date);
    v_description := COALESCE(v_description, CASE WHEN v_member_label <> '' THEN 'Giving - ' || v_member_label ELSE 'Giving entry' END);

    IF v_income_account_id IS NULL THEN
      RAISE EXCEPTION 'income_account_id is required for create operations';
    END IF;
    IF v_cash_account_id IS NULL THEN
      RAISE EXCEPTION 'cash_account_id is required for create operations';
    END IF;
    IF v_category_id IS NULL THEN
      RAISE EXCEPTION 'category_id is required for create operations';
    END IF;
  END IF;

  IF v_operation = 'create' THEN
    v_transaction_number := generate_transaction_number(v_tenant_id, v_transaction_date, 'income', v_member_id);

    INSERT INTO financial_transaction_headers (
      transaction_number,
      transaction_date,
      description,
      reference,
      source_id,
      status,
      tenant_id,
      created_by,
      updated_by,
      created_at,
      updated_at,
      posted_at,
      posted_by
    ) VALUES (
      v_transaction_number,
      v_transaction_date,
      v_description,
      v_reference,
      v_source_id,
      'posted',
      v_tenant_id,
      v_user_id,
      v_user_id,
      v_now,
      v_now,
      v_now,
      v_user_id
    )
    RETURNING * INTO v_existing_header;

    v_header_id := v_existing_header.id;

    INSERT INTO financial_transactions (
      type,
      description,
      date,
      member_id,
      category_id,
      fund_id,
      tenant_id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      header_id,
      account_id,
      debit,
      credit,
      source_id
    ) VALUES (
      'income',
      v_description,
      v_transaction_date,
      v_member_id,
      v_category_id,
      v_fund_id,
      v_tenant_id,
      v_now,
      v_now,
      v_user_id,
      v_user_id,
      v_header_id,
      v_cash_account_id,
      v_amount,
      0,
      v_source_id
    )
    RETURNING * INTO v_debit_row;

    INSERT INTO financial_transactions (
      type,
      description,
      date,
      member_id,
      category_id,
      fund_id,
      tenant_id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      header_id,
      account_id,
      debit,
      credit,
      source_id
    ) VALUES (
      'income',
      v_description,
      v_transaction_date,
      v_member_id,
      v_category_id,
      v_fund_id,
      v_tenant_id,
      v_now,
      v_now,
      v_user_id,
      v_user_id,
      v_header_id,
      v_income_account_id,
      0,
      v_amount,
      v_source_id
    )
    RETURNING * INTO v_credit_row;
  ELSIF v_operation = 'update' THEN
    UPDATE financial_transaction_headers
    SET transaction_date = v_transaction_date,
        description = v_description,
        reference = v_reference,
        source_id = v_source_id,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_header_id;

    IF v_existing_header.status = 'draft' THEN
      UPDATE financial_transaction_headers
      SET status = 'posted',
          posted_at = COALESCE(v_existing_header.posted_at, v_now),
          posted_by = COALESCE(v_existing_header.posted_by, v_user_id)
      WHERE id = v_header_id;
    END IF;

    UPDATE financial_transactions
    SET description = v_description,
        date = v_transaction_date,
        member_id = v_member_id,
        category_id = v_category_id,
        fund_id = v_fund_id,
        account_id = v_income_account_id,
        debit = 0,
        credit = v_amount,
        source_id = v_source_id,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_credit_row.id;

    UPDATE financial_transactions
    SET description = v_description,
        date = v_transaction_date,
        member_id = v_member_id,
        category_id = v_category_id,
        fund_id = v_fund_id,
        account_id = v_cash_account_id,
        debit = v_amount,
        credit = 0,
        source_id = v_source_id,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_debit_row.id;
  ELSE
    IF v_existing_header.status <> 'voided' THEN
      UPDATE financial_transaction_headers
      SET status = 'voided',
          voided_at = v_now,
          voided_by = v_user_id,
          updated_at = v_now,
          updated_by = v_user_id
      WHERE id = v_header_id;
    END IF;

    UPDATE financial_transactions
    SET deleted_at = v_now,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE header_id = v_header_id
      AND deleted_at IS NULL;

    v_transaction_date := COALESCE(v_transaction_date, v_existing_header.transaction_date, current_date);
  END IF;

  IF v_operation IN ('create', 'update') THEN
    PERFORM is_transaction_balanced(v_header_id);
  END IF;

  v_reference_date := COALESCE(v_transaction_date, current_date);
  v_profile_row := refresh_member_giving_profile(v_member_id, v_tenant_id, v_reference_date, v_user_id);

  IF p_profile ?| ARRAY['recurring_amount','recurring_frequency','recurring_method','recurring_status','pledge_amount','pledge_campaign','pledge_start_date','pledge_end_date','data_source'] THEN
    UPDATE member_giving_profiles
    SET recurring_amount = CASE WHEN p_profile ? 'recurring_amount' THEN NULLIF(p_profile->>'recurring_amount', '')::numeric(12,2) ELSE recurring_amount END,
        recurring_frequency = CASE WHEN p_profile ? 'recurring_frequency' THEN NULLIF(p_profile->>'recurring_frequency', '') ELSE recurring_frequency END,
        recurring_method = CASE WHEN p_profile ? 'recurring_method' THEN NULLIF(p_profile->>'recurring_method', '') ELSE recurring_method END,
        recurring_status = CASE WHEN p_profile ? 'recurring_status' THEN NULLIF(p_profile->>'recurring_status', '') ELSE recurring_status END,
        pledge_amount = CASE WHEN p_profile ? 'pledge_amount' THEN NULLIF(p_profile->>'pledge_amount', '')::numeric(12,2) ELSE pledge_amount END,
        pledge_campaign = CASE WHEN p_profile ? 'pledge_campaign' THEN NULLIF(p_profile->>'pledge_campaign', '') ELSE pledge_campaign END,
        pledge_start_date = CASE WHEN p_profile ? 'pledge_start_date' THEN NULLIF(p_profile->>'pledge_start_date', '')::date ELSE pledge_start_date END,
        pledge_end_date = CASE WHEN p_profile ? 'pledge_end_date' THEN NULLIF(p_profile->>'pledge_end_date', '')::date ELSE pledge_end_date END,
        data_source = CASE WHEN p_profile ? 'data_source' THEN NULLIF(p_profile->>'data_source', '') ELSE data_source END,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_profile_row.id
    RETURNING * INTO v_profile_row;
  END IF;

  UPDATE members
  SET giving_recurring_amount = v_profile_row.recurring_amount,
      giving_recurring_frequency = v_profile_row.recurring_frequency,
      giving_recurring_method = v_profile_row.recurring_method,
      giving_pledge_amount = v_profile_row.pledge_amount,
      giving_pledge_campaign = v_profile_row.pledge_campaign
  WHERE id = v_member_id
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL;

  v_result := jsonb_build_object(
    'header_id', v_header_id,
    'profile_id', v_profile_row.id,
    'member_id', v_member_id,
    'tenant_id', v_tenant_id
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION process_member_giving_transaction(text, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION process_member_giving_transaction(text, jsonb, jsonb) IS 'Processes member giving ledger activity with double-entry accounting and refreshes giving profile insights.';

-- Backwards compatible wrapper returning the profile id
CREATE OR REPLACE FUNCTION process_member_giving_profile_transaction(
  p_operation text,
  p_profile jsonb,
  p_transaction jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := process_member_giving_transaction(p_operation, p_transaction, p_profile);
  RETURN (v_result->>'profile_id')::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION process_member_giving_profile_transaction(text, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION process_member_giving_profile_transaction(text, jsonb, jsonb) IS 'Deprecated wrapper that returns the member giving profile id after processing a giving transaction.';

-- Lightweight tagging to power highlights and filters
CREATE TABLE IF NOT EXISTS member_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  tag text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_tags_unique_label ON member_tags(tenant_id, member_id, lower(tag)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_member_tags_member ON member_tags(member_id) WHERE deleted_at IS NULL;

ALTER TABLE member_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Member tags are viewable by tenant users" ON member_tags
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Member tags can be managed by tenant admins" ON member_tags
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

-- Milestones and ministry activity timeline for profiles
CREATE TABLE IF NOT EXISTS member_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text,
  event_category text,
  status text,
  icon text,
  occurred_at timestamptz,
  recorded_at timestamptz DEFAULT now(),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_member_timeline_events_tenant ON member_timeline_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_timeline_events_member ON member_timeline_events(member_id, occurred_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE member_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Timeline events are viewable by tenant users" ON member_timeline_events
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Timeline events can be managed by tenant admins" ON member_timeline_events
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('admin', 'owner')
    )
  );

CREATE TRIGGER set_member_timeline_events_updated_at
  BEFORE UPDATE ON member_timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Ensure membership updates log stage history automatically
CREATE OR REPLACE FUNCTION record_membership_stage_history()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_changed_by uuid;
BEGIN
  v_changed_by := COALESCE(auth.uid(), NEW.updated_by, NEW.created_by);

  IF TG_OP = 'INSERT' THEN
    IF NEW.membership_status_id IS NOT NULL THEN
      INSERT INTO membership_stage_history (tenant_id, member_id, previous_stage_id, stage_id, changed_at, changed_by)
      VALUES (NEW.tenant_id, NEW.id, NULL, NEW.membership_status_id, now(), v_changed_by);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.membership_status_id IS DISTINCT FROM OLD.membership_status_id THEN
      INSERT INTO membership_stage_history (tenant_id, member_id, previous_stage_id, stage_id, changed_at, changed_by)
      VALUES (NEW.tenant_id, NEW.id, OLD.membership_status_id, NEW.membership_status_id, now(), v_changed_by);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_membership_status_history ON members;
CREATE TRIGGER trg_membership_status_history
  AFTER INSERT OR UPDATE OF membership_status_id ON members
  FOR EACH ROW
  EXECUTE FUNCTION record_membership_stage_history();

