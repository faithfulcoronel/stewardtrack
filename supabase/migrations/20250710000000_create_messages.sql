-- Messaging tables for user-to-admin issue reporting

-- Message threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS message_threads_tenant_id_idx ON message_threads(tenant_id);
CREATE INDEX IF NOT EXISTS message_threads_status_idx ON message_threads(status);
CREATE INDEX IF NOT EXISTS message_threads_deleted_at_idx ON message_threads(deleted_at);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON messages(thread_id);
CREATE INDEX IF NOT EXISTS messages_tenant_id_idx ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
CREATE INDEX IF NOT EXISTS messages_deleted_at_idx ON messages(deleted_at);

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for message_threads
CREATE POLICY "Threads are viewable by tenant users" ON message_threads
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);

CREATE POLICY "Threads can be inserted by tenant users" ON message_threads
  FOR INSERT TO authenticated
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Threads can be updated by tenant users" ON message_threads
  FOR UPDATE TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Threads can be deleted by tenant users" ON message_threads
  FOR DELETE TO authenticated
  USING (check_tenant_access(tenant_id));

-- Policies for messages
CREATE POLICY "Messages are viewable by tenant users" ON messages
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Messages can be inserted by tenant users" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Messages can be updated by tenant users" ON messages
  FOR UPDATE TO authenticated
  USING (check_tenant_access(tenant_id));

-- updated_at triggers
CREATE TRIGGER update_message_threads_updated_at
BEFORE UPDATE ON message_threads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE message_threads IS 'Issue reporting threads between users and admin';
COMMENT ON TABLE messages IS 'Messages posted inside a thread';
