-- Normalize membership household data and add profile enrichment fields

-- Ensure marital status enum includes engaged
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'marital_status_type'
      AND e.enumlabel = 'engaged'
  ) THEN
    ALTER TYPE marital_status_type ADD VALUE 'engaged';
  END IF;
END $$;

-- Create member_households table for shared household data
CREATE TABLE IF NOT EXISTS member_households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text,
  envelope_number text,
  address_street text,
  address_city text,
  address_state text,
  address_postal_code text,
  member_names text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS member_households_envelope_unique
  ON member_households(tenant_id, envelope_number)
  WHERE envelope_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS member_households_tenant_idx
  ON member_households(tenant_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER set_member_households_updated_at
  BEFORE UPDATE ON member_households
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE member_households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Member households are viewable by tenant users" ON member_households;
CREATE POLICY "Member households are viewable by tenant users" ON member_households
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
      SELECT tu.tenant_id
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Member households are manageable by tenant admins" ON member_households;
CREATE POLICY "Member households are manageable by tenant admins" ON member_households
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (
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

-- Add new profile enrichment columns to members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS household_id uuid,
  ADD COLUMN IF NOT EXISTS anniversary date,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS primary_small_group text,
  ADD COLUMN IF NOT EXISTS discipleship_pathways text[],
  ADD COLUMN IF NOT EXISTS prayer_focus text,
  ADD COLUMN IF NOT EXISTS care_team text[],
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS physician_name text,
  ADD COLUMN IF NOT EXISTS next_serve_at date,
  ADD COLUMN IF NOT EXISTS leadership_roles text[],
  ADD COLUMN IF NOT EXISTS team_focus text,
  ADD COLUMN IF NOT EXISTS reports_to text,
  ADD COLUMN IF NOT EXISTS last_huddle_at date,
  ADD COLUMN IF NOT EXISTS giving_primary_fund text,
  ADD COLUMN IF NOT EXISTS giving_tier text,
  ADD COLUMN IF NOT EXISTS finance_notes text,
  ADD COLUMN IF NOT EXISTS data_steward text,
  ADD COLUMN IF NOT EXISTS last_review_at date;

-- Ensure household_id references new table
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_household_id_fkey;

ALTER TABLE members
  ADD CONSTRAINT members_household_id_fkey
  FOREIGN KEY (household_id)
  REFERENCES member_households(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_household_id ON members(household_id);
CREATE INDEX IF NOT EXISTS idx_members_anniversary ON members(anniversary);
CREATE INDEX IF NOT EXISTS idx_members_next_serve_at ON members(next_serve_at);
CREATE INDEX IF NOT EXISTS idx_members_last_review_at ON members(last_review_at);

-- Backfill household records for existing members
DO $$
DECLARE
  member_record RECORD;
  new_household_id uuid;
  member_names text[];
BEGIN
  FOR member_record IN
    SELECT id, tenant_id, household_id, first_name, last_name, preferred_name, envelope_number, address
    FROM members
    WHERE tenant_id IS NOT NULL
  LOOP
    new_household_id := COALESCE(member_record.household_id, gen_random_uuid());

    member_names := ARRAY_REMOVE(ARRAY[
      NULLIF(trim(member_record.first_name || ' ' || member_record.last_name), ' '),
      NULLIF(member_record.preferred_name, '')
    ], NULL);

    INSERT INTO member_households (
      id,
      tenant_id,
      name,
      envelope_number,
      member_names,
      address_street
    )
    VALUES (
      new_household_id,
      member_record.tenant_id,
      NULL,
      member_record.envelope_number,
      member_names,
      NULLIF(member_record.address, '')
    )
    ON CONFLICT (id) DO UPDATE SET
      tenant_id = EXCLUDED.tenant_id,
      envelope_number = COALESCE(EXCLUDED.envelope_number, member_households.envelope_number),
      member_names = COALESCE(EXCLUDED.member_names, member_households.member_names);

    UPDATE members
    SET household_id = new_household_id
    WHERE id = member_record.id;
  END LOOP;
END $$;

-- Synchronize existing envelope numbers into household table for easier lookups
UPDATE member_households mh
SET envelope_number = m.envelope_number
FROM members m
WHERE m.household_id = mh.id
  AND mh.envelope_number IS DISTINCT FROM m.envelope_number;

