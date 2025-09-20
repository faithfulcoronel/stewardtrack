-- Announcements table for tenant-specific messages

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for quicker lookups
CREATE INDEX IF NOT EXISTS announcements_tenant_id_idx ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS announcements_deleted_at_idx ON announcements(deleted_at);

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies modeled after other tables
CREATE POLICY "Announcements are viewable by tenant users" ON announcements
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);

CREATE POLICY "Announcements can be inserted by tenant users" ON announcements
  FOR INSERT TO authenticated
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Announcements can be updated by tenant users" ON announcements
  FOR UPDATE TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Announcements can be deleted by tenant users" ON announcements
  FOR DELETE TO authenticated
  USING (check_tenant_access(tenant_id));

-- updated_at trigger
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
