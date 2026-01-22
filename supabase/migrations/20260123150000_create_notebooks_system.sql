-- =====================================================
-- Notebooks System Migration
-- OneNote-style notebook feature for Planning module
-- Supports hierarchical notes with visibility controls
-- =====================================================

-- Create enum types
CREATE TYPE notebook_visibility AS ENUM ('private', 'shared', 'tenant');
CREATE TYPE notebook_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE notebook_entry_type AS ENUM ('text', 'checklist', 'table', 'drawing', 'attachment');

-- =====================================================
-- Notebooks Table
-- Top-level notebooks (equivalent to OneNote notebooks)
-- =====================================================
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic fields
  title VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#4F46E5', -- Hex color for visual organization
  icon VARCHAR(50) DEFAULT 'book', -- Icon identifier

  -- Visibility and sharing
  visibility notebook_visibility NOT NULL DEFAULT 'private',
  owner_id UUID NOT NULL, -- User who created/owns the notebook

  -- Organization
  status notebook_status NOT NULL DEFAULT 'active',
  is_pinned BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT notebooks_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Indexes
CREATE INDEX idx_notebooks_tenant_id ON notebooks(tenant_id);
CREATE INDEX idx_notebooks_owner_id ON notebooks(owner_id);
CREATE INDEX idx_notebooks_status ON notebooks(status);
CREATE INDEX idx_notebooks_visibility ON notebooks(visibility);
CREATE INDEX idx_notebooks_deleted_at ON notebooks(deleted_at);
CREATE INDEX idx_notebooks_tags ON notebooks USING GIN(tags);
CREATE INDEX idx_notebooks_created_at ON notebooks(created_at DESC);

-- =====================================================
-- Notebook Sections Table
-- Sections within notebooks (equivalent to OneNote sections)
-- =====================================================
CREATE TABLE notebook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,

  -- Basic fields
  title VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),

  -- Organization
  sort_order INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT FALSE,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT sections_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Indexes
CREATE INDEX idx_sections_tenant_id ON notebook_sections(tenant_id);
CREATE INDEX idx_sections_notebook_id ON notebook_sections(notebook_id);
CREATE INDEX idx_sections_sort_order ON notebook_sections(sort_order);
CREATE INDEX idx_sections_deleted_at ON notebook_sections(deleted_at);

-- =====================================================
-- Notebook Pages Table
-- Individual pages within sections (equivalent to OneNote pages)
-- =====================================================
CREATE TABLE notebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES notebook_sections(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,

  -- Basic fields
  title VARCHAR(255) NOT NULL,
  content TEXT, -- Rich text content (HTML or markdown)
  content_type VARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'html', 'plain'

  -- Organization
  sort_order INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT FALSE,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT pages_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Indexes
CREATE INDEX idx_pages_tenant_id ON notebook_pages(tenant_id);
CREATE INDEX idx_pages_section_id ON notebook_pages(section_id);
CREATE INDEX idx_pages_notebook_id ON notebook_pages(notebook_id);
CREATE INDEX idx_pages_sort_order ON notebook_pages(sort_order);
CREATE INDEX idx_pages_is_favorite ON notebook_pages(is_favorite);
CREATE INDEX idx_pages_tags ON notebook_pages USING GIN(tags);
CREATE INDEX idx_pages_deleted_at ON notebook_pages(deleted_at);
CREATE INDEX idx_pages_created_at ON notebook_pages(created_at DESC);
CREATE INDEX idx_pages_updated_at ON notebook_pages(updated_at DESC);

-- Full-text search index for page content
CREATE INDEX idx_pages_content_search ON notebook_pages USING GIN(to_tsvector('english', content));
CREATE INDEX idx_pages_title_search ON notebook_pages USING GIN(to_tsvector('english', title));

-- =====================================================
-- Notebook Shares Table
-- Granular sharing control for notebooks
-- =====================================================
CREATE TABLE notebook_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,

  -- Sharing target (can be user, role, or campus)
  shared_with_user_id UUID, -- Specific user
  shared_with_role_id UUID, -- All users with this role
  shared_with_campus_id UUID, -- All users in this campus

  -- Permissions
  can_view BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_share BOOLEAN DEFAULT FALSE,

  -- Metadata
  shared_by UUID NOT NULL,
  expires_at TIMESTAMPTZ, -- Optional expiration

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure at least one sharing target is specified
  CONSTRAINT shares_has_target CHECK (
    (shared_with_user_id IS NOT NULL)::int +
    (shared_with_role_id IS NOT NULL)::int +
    (shared_with_campus_id IS NOT NULL)::int = 1
  ),

  -- Prevent duplicate shares
  CONSTRAINT shares_unique_user UNIQUE (notebook_id, shared_with_user_id),
  CONSTRAINT shares_unique_role UNIQUE (notebook_id, shared_with_role_id),
  CONSTRAINT shares_unique_campus UNIQUE (notebook_id, shared_with_campus_id)
);

-- Indexes
CREATE INDEX idx_shares_tenant_id ON notebook_shares(tenant_id);
CREATE INDEX idx_shares_notebook_id ON notebook_shares(notebook_id);
CREATE INDEX idx_shares_user_id ON notebook_shares(shared_with_user_id);
CREATE INDEX idx_shares_role_id ON notebook_shares(shared_with_role_id);
CREATE INDEX idx_shares_campus_id ON notebook_shares(shared_with_campus_id);
CREATE INDEX idx_shares_expires_at ON notebook_shares(expires_at);

-- =====================================================
-- Notebook Attachments Table
-- File attachments for pages
-- =====================================================
CREATE TABLE notebook_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES notebook_pages(id) ON DELETE CASCADE,

  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  storage_path TEXT NOT NULL, -- Supabase storage path

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_attachments_tenant_id ON notebook_attachments(tenant_id);
CREATE INDEX idx_attachments_page_id ON notebook_attachments(page_id);
CREATE INDEX idx_attachments_deleted_at ON notebook_attachments(deleted_at);

-- =====================================================
-- Notebook Activity Log Table
-- Track changes and collaboration
-- =====================================================
CREATE TABLE notebook_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Target
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
  section_id UUID REFERENCES notebook_sections(id) ON DELETE CASCADE,
  page_id UUID REFERENCES notebook_pages(id) ON DELETE CASCADE,

  -- Activity details
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'shared', 'viewed'
  actor_id UUID NOT NULL, -- User who performed the action
  details JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_tenant_id ON notebook_activity_log(tenant_id);
CREATE INDEX idx_activity_notebook_id ON notebook_activity_log(notebook_id);
CREATE INDEX idx_activity_page_id ON notebook_activity_log(page_id);
CREATE INDEX idx_activity_actor_id ON notebook_activity_log(actor_id);
CREATE INDEX idx_activity_created_at ON notebook_activity_log(created_at DESC);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebook_sections_updated_at
  BEFORE UPDATE ON notebook_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebook_pages_updated_at
  BEFORE UPDATE ON notebook_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebook_shares_updated_at
  BEFORE UPDATE ON notebook_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Cascade update trigger: Update notebook updated_at when pages change
-- =====================================================
CREATE OR REPLACE FUNCTION update_notebook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE notebooks
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.notebook_id, OLD.notebook_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notebook_on_page_change
  AFTER INSERT OR UPDATE OR DELETE ON notebook_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_timestamp();

CREATE TRIGGER update_notebook_on_section_change
  AFTER INSERT OR UPDATE OR DELETE ON notebook_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_timestamp();

-- =====================================================
-- Activity logging triggers
-- =====================================================
CREATE OR REPLACE FUNCTION log_notebook_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notebook_activity_log (tenant_id, notebook_id, action, actor_id, details)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'created',
      NEW.created_by,
      jsonb_build_object('title', NEW.title)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO notebook_activity_log (tenant_id, notebook_id, action, actor_id, details)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'updated',
      NEW.updated_by,
      jsonb_build_object('title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_notebook_changes
  AFTER INSERT OR UPDATE ON notebooks
  FOR EACH ROW
  EXECUTE FUNCTION log_notebook_activity();

-- =====================================================
-- Row-Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check notebook access
CREATE OR REPLACE FUNCTION has_notebook_access(
  p_notebook_id UUID,
  p_user_id UUID,
  p_required_permission TEXT DEFAULT 'view'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_notebook notebooks%ROWTYPE;
  v_user_roles UUID[];
  v_user_campus_id UUID;
BEGIN
  -- Get notebook details
  SELECT * INTO v_notebook FROM notebooks WHERE id = p_notebook_id;

  -- Owner always has access
  IF v_notebook.owner_id = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Tenant-wide visibility
  IF v_notebook.visibility = 'tenant' THEN
    RETURN TRUE;
  END IF;

  -- Private notebooks only accessible by owner
  IF v_notebook.visibility = 'private' THEN
    RETURN FALSE;
  END IF;

  -- Check shared access
  IF v_notebook.visibility = 'shared' THEN
    -- Direct user share
    IF EXISTS (
      SELECT 1 FROM notebook_shares
      WHERE notebook_id = p_notebook_id
        AND shared_with_user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW())
        AND CASE p_required_permission
              WHEN 'view' THEN can_view
              WHEN 'edit' THEN can_edit
              WHEN 'delete' THEN can_delete
              WHEN 'share' THEN can_share
              ELSE FALSE
            END
    ) THEN
      RETURN TRUE;
    END IF;

    -- Role-based share
    SELECT ARRAY_AGG(role_id) INTO v_user_roles
    FROM user_roles
    WHERE user_id = p_user_id;

    IF EXISTS (
      SELECT 1 FROM notebook_shares
      WHERE notebook_id = p_notebook_id
        AND shared_with_role_id = ANY(v_user_roles)
        AND (expires_at IS NULL OR expires_at > NOW())
        AND CASE p_required_permission
              WHEN 'view' THEN can_view
              WHEN 'edit' THEN can_edit
              WHEN 'delete' THEN can_delete
              WHEN 'share' THEN can_share
              ELSE FALSE
            END
    ) THEN
      RETURN TRUE;
    END IF;

    -- Campus-based share
    SELECT campus_id INTO v_user_campus_id
    FROM tenant_users
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_user_campus_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM notebook_shares
      WHERE notebook_id = p_notebook_id
        AND shared_with_campus_id = v_user_campus_id
        AND (expires_at IS NULL OR expires_at > NOW())
        AND CASE p_required_permission
              WHEN 'view' THEN can_view
              WHEN 'edit' THEN can_edit
              WHEN 'delete' THEN can_delete
              WHEN 'share' THEN can_share
              ELSE FALSE
            END
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notebooks RLS policies
CREATE POLICY notebooks_select_policy ON notebooks
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Service role bypass
      auth.jwt() ->> 'role' = 'service_role'
      OR
      -- User access check
      has_notebook_access(id, auth.uid(), 'view')
    )
  );

CREATE POLICY notebooks_insert_policy ON notebooks
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY notebooks_update_policy ON notebooks
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND has_notebook_access(id, auth.uid(), 'edit')
  );

CREATE POLICY notebooks_delete_policy ON notebooks
  FOR DELETE
  USING (
    has_notebook_access(id, auth.uid(), 'delete')
  );

-- Notebook sections RLS policies
CREATE POLICY sections_select_policy ON notebook_sections
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND has_notebook_access(notebook_id, auth.uid(), 'view')
  );

CREATE POLICY sections_insert_policy ON notebook_sections
  FOR INSERT
  WITH CHECK (
    has_notebook_access(notebook_id, auth.uid(), 'edit')
  );

CREATE POLICY sections_update_policy ON notebook_sections
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND has_notebook_access(notebook_id, auth.uid(), 'edit')
  );

CREATE POLICY sections_delete_policy ON notebook_sections
  FOR DELETE
  USING (
    has_notebook_access(notebook_id, auth.uid(), 'delete')
  );

-- Notebook pages RLS policies
CREATE POLICY pages_select_policy ON notebook_pages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND has_notebook_access(notebook_id, auth.uid(), 'view')
  );

CREATE POLICY pages_insert_policy ON notebook_pages
  FOR INSERT
  WITH CHECK (
    has_notebook_access(notebook_id, auth.uid(), 'edit')
  );

CREATE POLICY pages_update_policy ON notebook_pages
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND has_notebook_access(notebook_id, auth.uid(), 'edit')
  );

CREATE POLICY pages_delete_policy ON notebook_pages
  FOR DELETE
  USING (
    has_notebook_access(notebook_id, auth.uid(), 'delete')
  );

-- Notebook shares RLS policies
CREATE POLICY shares_select_policy ON notebook_shares
  FOR SELECT
  USING (
    has_notebook_access(notebook_id, auth.uid(), 'view')
  );

CREATE POLICY shares_insert_policy ON notebook_shares
  FOR INSERT
  WITH CHECK (
    has_notebook_access(notebook_id, auth.uid(), 'share')
  );

CREATE POLICY shares_update_policy ON notebook_shares
  FOR UPDATE
  USING (
    has_notebook_access(notebook_id, auth.uid(), 'share')
  );

CREATE POLICY shares_delete_policy ON notebook_shares
  FOR DELETE
  USING (
    has_notebook_access(notebook_id, auth.uid(), 'share')
  );

-- Notebook attachments RLS policies
CREATE POLICY attachments_select_policy ON notebook_attachments
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM notebook_pages
      WHERE id = page_id
        AND has_notebook_access(notebook_id, auth.uid(), 'view')
    )
  );

CREATE POLICY attachments_insert_policy ON notebook_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebook_pages
      WHERE id = page_id
        AND has_notebook_access(notebook_id, auth.uid(), 'edit')
    )
  );

CREATE POLICY attachments_delete_policy ON notebook_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebook_pages
      WHERE id = page_id
        AND has_notebook_access(notebook_id, auth.uid(), 'delete')
    )
  );

-- Activity log RLS policies
CREATE POLICY activity_select_policy ON notebook_activity_log
  FOR SELECT
  USING (
    notebook_id IS NULL
    OR has_notebook_access(notebook_id, auth.uid(), 'view')
  );

CREATE POLICY activity_insert_policy ON notebook_activity_log
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- =====================================================
-- RBAC Permissions
-- =====================================================

-- Insert notebook permissions (system-level)
INSERT INTO permissions (tenant_id, code, name, description, module, action, scope) VALUES
  (NULL, 'notebooks:view', 'View Notebooks', 'View notebooks and pages', 'planning', 'view', 'tenant'),
  (NULL, 'notebooks:create', 'Create Notebooks', 'Create new notebooks', 'planning', 'create', 'tenant'),
  (NULL, 'notebooks:edit', 'Edit Notebooks', 'Edit notebooks and pages', 'planning', 'edit', 'tenant'),
  (NULL, 'notebooks:delete', 'Delete Notebooks', 'Delete notebooks and pages', 'planning', 'delete', 'tenant'),
  (NULL, 'notebooks:share', 'Share Notebooks', 'Share notebooks with others', 'planning', 'share', 'tenant'),
  (NULL, 'notebooks:admin', 'Administer Notebooks', 'Full notebook administration', 'planning', 'admin', 'tenant')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Copy permissions to all existing tenants
INSERT INTO permissions (tenant_id, code, name, description, module, action, scope, created_by, updated_by)
SELECT
    t.id,
    p.code,
    p.name,
    p.description,
    p.module,
    p.action,
    p.scope,
    t.created_by,
    t.created_by
FROM tenants t
CROSS JOIN permissions p
WHERE p.tenant_id IS NULL
  AND p.code LIKE 'notebooks:%'
  AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Grant permissions to role personas (all except member and visitor)
DO $$
DECLARE
  v_tenant_admin_role_id UUID;
  v_senior_pastor_role_id UUID;
  v_associate_pastor_role_id UUID;
  v_ministry_leader_role_id UUID;
  v_treasurer_role_id UUID;
  v_auditor_role_id UUID;
  v_secretary_role_id UUID;
  v_deacon_elder_role_id UUID;
  v_volunteer_role_id UUID;
BEGIN
  -- Get system role IDs by metadata_key (role persona system)
  SELECT id INTO v_tenant_admin_role_id FROM roles WHERE metadata_key = 'role_tenant_admin' AND tenant_id IS NULL;
  SELECT id INTO v_senior_pastor_role_id FROM roles WHERE metadata_key = 'role_senior_pastor' AND tenant_id IS NULL;
  SELECT id INTO v_associate_pastor_role_id FROM roles WHERE metadata_key = 'role_associate_pastor' AND tenant_id IS NULL;
  SELECT id INTO v_ministry_leader_role_id FROM roles WHERE metadata_key = 'role_ministry_leader' AND tenant_id IS NULL;
  SELECT id INTO v_treasurer_role_id FROM roles WHERE metadata_key = 'role_treasurer' AND tenant_id IS NULL;
  SELECT id INTO v_auditor_role_id FROM roles WHERE metadata_key = 'role_auditor' AND tenant_id IS NULL;
  SELECT id INTO v_secretary_role_id FROM roles WHERE metadata_key = 'role_secretary' AND tenant_id IS NULL;
  SELECT id INTO v_deacon_elder_role_id FROM roles WHERE metadata_key = 'role_deacon_elder' AND tenant_id IS NULL;
  SELECT id INTO v_volunteer_role_id FROM roles WHERE metadata_key = 'role_volunteer' AND tenant_id IS NULL;

  -- Tenant Admin: Full access
  IF v_tenant_admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_tenant_admin_role_id, id FROM permissions
    WHERE code LIKE 'notebooks:%' AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Senior Pastor: Full access
  IF v_senior_pastor_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_senior_pastor_role_id, id FROM permissions
    WHERE code LIKE 'notebooks:%' AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Associate Pastor: All permissions
  IF v_associate_pastor_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_associate_pastor_role_id, id FROM permissions
    WHERE code LIKE 'notebooks:%' AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Ministry Leader: Create, edit, share
  IF v_ministry_leader_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_ministry_leader_role_id, id FROM permissions
    WHERE code IN ('notebooks:view', 'notebooks:create', 'notebooks:edit', 'notebooks:share')
      AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Treasurer: View and create
  IF v_treasurer_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_treasurer_role_id, id FROM permissions
    WHERE code IN ('notebooks:view', 'notebooks:create', 'notebooks:edit')
      AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Auditor: View and create
  IF v_auditor_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_auditor_role_id, id FROM permissions
    WHERE code IN ('notebooks:view', 'notebooks:create', 'notebooks:edit')
      AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Secretary: View, create, edit
  IF v_secretary_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_secretary_role_id, id FROM permissions
    WHERE code IN ('notebooks:view', 'notebooks:create', 'notebooks:edit')
      AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Deacon/Elder: View, create, edit
  IF v_deacon_elder_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_deacon_elder_role_id, id FROM permissions
    WHERE code IN ('notebooks:view', 'notebooks:create', 'notebooks:edit')
      AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Volunteer: View and create
  IF v_volunteer_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_volunteer_role_id, id FROM permissions
    WHERE code IN ('notebooks:view', 'notebooks:create')
      AND tenant_id IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Note: Member and Visitor roles intentionally excluded from notebooks permissions
END $$;

-- =====================================================
-- Computed statistics view
-- =====================================================
CREATE OR REPLACE VIEW notebook_stats AS
SELECT
  n.id AS notebook_id,
  n.tenant_id,
  n.title,
  n.owner_id,
  n.visibility,
  COUNT(DISTINCT ns.id) AS section_count,
  COUNT(DISTINCT np.id) AS page_count,
  COUNT(DISTINCT na.id) AS attachment_count,
  MAX(np.updated_at) AS last_page_updated_at,
  n.created_at,
  n.updated_at
FROM notebooks n
LEFT JOIN notebook_sections ns ON ns.notebook_id = n.id AND ns.deleted_at IS NULL
LEFT JOIN notebook_pages np ON np.notebook_id = n.id AND np.deleted_at IS NULL
LEFT JOIN notebook_attachments na ON na.page_id = np.id AND na.deleted_at IS NULL
WHERE n.deleted_at IS NULL
GROUP BY n.id, n.tenant_id, n.title, n.owner_id, n.visibility, n.created_at, n.updated_at;

-- Grant access to view
GRANT SELECT ON notebook_stats TO authenticated;

COMMENT ON TABLE notebooks IS 'Top-level notebooks for organizing notes (OneNote-style)';
COMMENT ON TABLE notebook_sections IS 'Sections within notebooks for grouping related pages';
COMMENT ON TABLE notebook_pages IS 'Individual pages containing note content';
COMMENT ON TABLE notebook_shares IS 'Granular sharing control for notebooks with expiration support';
COMMENT ON TABLE notebook_attachments IS 'File attachments linked to notebook pages';
COMMENT ON TABLE notebook_activity_log IS 'Audit trail for notebook activities';
COMMENT ON VIEW notebook_stats IS 'Aggregated statistics for notebooks';
