# Supabase Migrations Directory - Architecture & Patterns

## Overview

The `supabase/migrations/` directory contains **SQL migration files** that define the database schema for StewardTrack. Migrations are applied sequentially to create tables, indexes, RLS policies, functions, and triggers.

**Key Principle:** Database schema is version-controlled and managed via incremental migrations.

## Migration System

### How Migrations Work

Supabase uses **PostgreSQL** with a migration-based schema management system:

1. **Sequential Execution**: Migrations run in order by timestamp
2. **One-Way**: Migrations are forward-only (no automatic rollback)
3. **Idempotent**: Use `IF NOT EXISTS` / `IF EXISTS` for safety
4. **Tracked**: Applied migrations tracked in `supabase_migrations.schema_migrations` table

### Migration File Naming

```
<timestamp>_<description>.sql

Examples:
20250212190331_wooden_coast.sql
20250215104145_dusty_pebble.sql
20251219091017_remove_permission_bundles.sql
20251219091018_remove_additional_bundle_tables.sql
```

**Timestamp Format:** `YYYYMMDDHHMMSS`
**Description:** Auto-generated (e.g., `wooden_coast`) or descriptive (e.g., `remove_permission_bundles`)

### Directory Structure

```
supabase/
├── config.toml                  # Supabase local configuration
├── migrations/                  # SQL migration files (100+ files)
│   ├── 20250212190331_wooden_coast.sql
│   ├── 20250215104145_dusty_pebble.sql
│   ├── 20251219091017_remove_permission_bundles.sql
│   └── ...
└── functions/                   # Edge functions (e.g., email-service)
```

## Key Database Tables

### Multi-Tenancy

**`tenants`** - Church organizations
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`tenant_users`** - User ↔ Tenant assignments
```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
```

### RBAC System (Simplified 2-Layer)

**`roles`** - Role definitions
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('system', 'tenant', 'delegated')),
  metadata_key TEXT,
  is_delegatable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, name)
);
```

**`permissions`** - Permission definitions
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`role_permissions`** - Direct role → permission mapping (NO BUNDLES)
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(role_id, permission_id, tenant_id)
);
```

**`user_roles`** - User → Role assignments (supports multi-role)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role_id, tenant_id)
);
```

**`delegations`** - Role-based delegation with scopes
```sql
CREATE TABLE delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES auth.users(id),
  delegatee_id UUID NOT NULL REFERENCES auth.users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  scope_type TEXT CHECK (scope_type IN ('Campus', 'Ministry', 'Event')),
  scope_id UUID,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Licensing System

**`product_offerings`** - Pricing plans
```sql
CREATE TABLE product_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('Essential', 'Professional', 'Enterprise', 'Premium')),
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`license_features`** - Feature catalog
```sql
CREATE TABLE license_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`license_feature_bundles`** - Feature groupings for product offerings
```sql
CREATE TABLE license_feature_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  bundle_type TEXT NOT NULL CHECK (bundle_type IN ('base', 'addon', 'premium')),
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`tenant_feature_grants`** - Active feature access per tenant
```sql
CREATE TABLE tenant_feature_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  feature_id UUID NOT NULL REFERENCES license_features(id),
  grant_source TEXT NOT NULL CHECK (grant_source IN ('package', 'manual', 'trial', 'promotional')),
  package_id UUID,
  source_reference TEXT,
  starts_at DATE,
  expires_at DATE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  -- Unique constraint prevents duplicate grants
  UNIQUE(tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'), COALESCE(source_reference, ''))
);
```

**`licenses`** - Tenant license assignments (historical)
```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  offering_id UUID NOT NULL REFERENCES product_offerings(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Feature-Permission Mapping

**`feature_catalog`** - Feature definitions with permission requirements
```sql
CREATE TABLE feature_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_code TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`feature_permissions`** - Features → Required permissions
```sql
CREATE TABLE feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES feature_catalog(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_id, permission_id)
);
```

### Onboarding

**`onboarding_progress`** - Wizard progress tracking
```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  current_step INTEGER DEFAULT 1,
  step_welcome JSONB,
  step_church_details JSONB,
  step_rbac_setup JSONB,
  step_feature_tour JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Audit & Tracking

**`rbac_audit_log`** - RBAC change audit trail
```sql
CREATE TABLE rbac_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`license_assignment_history`** - License change history
```sql
CREATE TABLE license_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  offering_id UUID NOT NULL REFERENCES product_offerings(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Row-Level Security (RLS)

StewardTrack uses **RLS policies** to enforce multi-tenant isolation at the database level.

### Standard RLS Pattern

```sql
-- Enable RLS on table
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's data
CREATE POLICY "Users can view their tenant data"
  ON my_table
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert for their tenant
CREATE POLICY "Users can insert for their tenant"
  ON my_table
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their tenant's data
CREATE POLICY "Users can update their tenant data"
  ON my_table
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their tenant's data (with permission)
CREATE POLICY "Users can delete their tenant data"
  ON my_table
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_permissions_view
      WHERE user_id = auth.uid()
        AND permission_code = 'my_resource:delete'
    )
  );
```

### RLS Helper Functions

```sql
-- Get current user's tenant ID(s)
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_permissions_view
    WHERE user_id = auth.uid()
      AND permission_code = permission_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Database Functions

### Permission Resolution

```sql
-- Get all effective permissions for a user
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE(permission_id UUID, permission_code TEXT, permission_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.id, p.code, p.name
  FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.tenant_id = p_tenant_id
    AND rp.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;
```

### License Provisioning

```sql
-- Get all features from a product offering (bundles + direct)
CREATE OR REPLACE FUNCTION get_offering_all_features(p_offering_id UUID)
RETURNS TABLE(feature_id UUID, package_id UUID, is_required BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  -- Features from bundles
  SELECT DISTINCT
    lfbf.feature_id,
    lfbf.bundle_id AS package_id,
    pob.is_required
  FROM product_offering_bundles pob
  JOIN license_feature_bundle_features lfbf ON pob.bundle_id = lfbf.bundle_id
  WHERE pob.offering_id = p_offering_id
    AND lfbf.is_active = TRUE

  UNION

  -- Direct features
  SELECT DISTINCT
    pof.feature_id,
    NULL AS package_id,
    pof.is_required
  FROM product_offering_features pof
  WHERE pof.offering_id = p_offering_id;
END;
$$ LANGUAGE plpgsql;
```

## Migration Patterns

### Pattern 1: Create Table with RLS

```sql
-- Create table
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_my_table_tenant ON my_table(tenant_id);
CREATE INDEX idx_my_table_created ON my_table(created_at);

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "tenant_isolation_select" ON my_table
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_insert" ON my_table
  FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_update" ON my_table
  FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_delete" ON my_table
  FOR DELETE USING (tenant_id IN (SELECT get_user_tenant_ids()));
```

### Pattern 2: Add Column with Default

```sql
-- Add column with default (safe for large tables)
ALTER TABLE my_table
ADD COLUMN new_column TEXT DEFAULT 'default_value';

-- Remove default (keeps existing values)
ALTER TABLE my_table
ALTER COLUMN new_column DROP DEFAULT;
```

### Pattern 3: Drop Table with Cascade

```sql
-- Drop table and all dependencies
DROP TABLE IF EXISTS my_table CASCADE;
```

### Pattern 4: Rename Column

```sql
-- Rename column
ALTER TABLE my_table
RENAME COLUMN old_name TO new_name;
```

### Pattern 5: Add Foreign Key

```sql
-- Add foreign key constraint
ALTER TABLE my_table
ADD CONSTRAINT fk_my_table_tenant
FOREIGN KEY (tenant_id)
REFERENCES tenants(id)
ON DELETE CASCADE;
```

### Pattern 6: Create Function

```sql
-- Create or replace function
CREATE OR REPLACE FUNCTION my_function(p_param TEXT)
RETURNS TABLE(result TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT column_name
  FROM my_table
  WHERE name = p_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Pattern 7: Update Existing Data

```sql
-- Update with transaction
BEGIN;

UPDATE my_table
SET status = 'active'
WHERE status IS NULL;

COMMIT;
```

### Pattern 8: Add New Feature with Permissions (IMPORTANT)

When adding a new feature with permissions, follow this exact pattern. **Reference:** `20260108100000_add_goals_core_feature.sql`

**CRITICAL RULES:**
1. **Permission Code Format**: Must match regex `^[a-z_]+:[a-z_]+$` - lowercase letters and underscores ONLY (no hyphens!)
   - ✅ `members:view_self` (correct - underscore)
   - ❌ `members:view-self` (WRONG - hyphen will fail constraint)
2. **Helper Functions**: Create and DROP helper functions within the same migration (they don't persist)
3. **All 5 Steps Required**: Follow all steps to ensure complete feature setup

```sql
-- =============================================================================
-- Migration: Add <Feature Name> Feature
-- =============================================================================
-- Description of what this feature adds
-- Feature: <feature.code>
-- Tier: Essential/Premium/Professional/Enterprise
-- Permissions:
-- - <category>:<action> - Description
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add feature to feature_catalog
-- =============================================================================
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES (
  '<feature.code>',
  '<Feature Display Name>',
  '<category>',
  '<description>',
  'essential', -- or 'premium', 'professional', 'enterprise'
  true,
  'ga'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- =============================================================================
-- STEP 2: Add permissions to feature_permissions
-- =============================================================================
-- Create helper function (will be dropped at end)
CREATE OR REPLACE FUNCTION insert_<feature>_permission(
  p_feature_code text,
  p_permission_code text,
  p_display_name text,
  p_description text,
  p_is_required boolean DEFAULT true,
  p_display_order integer DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_feature_id uuid;
  v_category text;
  v_action text;
BEGIN
  SELECT id INTO v_feature_id
  FROM feature_catalog
  WHERE code = p_feature_code AND deleted_at IS NULL;

  IF v_feature_id IS NULL THEN
    RAISE NOTICE 'Feature not found: %', p_feature_code;
    RETURN;
  END IF;

  v_category := split_part(p_permission_code, ':', 1);
  v_action := split_part(p_permission_code, ':', 2);

  INSERT INTO feature_permissions (
    feature_id, permission_code, display_name, description,
    category, action, is_required, display_order
  )
  VALUES (
    v_feature_id, p_permission_code, p_display_name, p_description,
    v_category, v_action, p_is_required, p_display_order
  )
  ON CONFLICT (feature_id, permission_code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    action = EXCLUDED.action,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Insert permissions (use underscores, NOT hyphens!)
SELECT insert_<feature>_permission('<feature.code>', '<category>:<action>', '<Display Name>', '<Description>', true, 1);

-- Clean up helper function
DROP FUNCTION IF EXISTS insert_<feature>_permission(text, text, text, text, boolean, integer);

-- =============================================================================
-- STEP 3: Link feature to product offerings (all tiers)
-- =============================================================================
-- Essential tier
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'essential'
  AND fc.code = '<feature.code>'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Repeat for 'premium', 'professional', 'enterprise' tiers...

-- =============================================================================
-- STEP 4: Add permission role templates
-- =============================================================================
-- Uses direct INSERT since helper function was cleaned up in seed migration
INSERT INTO permission_role_templates (feature_permission_id, role_key, is_recommended, reason)
SELECT
  fp.id,
  r.role_key,
  true,
  r.reason
FROM feature_permissions fp
JOIN feature_catalog fc ON fp.feature_id = fc.id
CROSS JOIN (
  VALUES
    ('<category>:<action>', 'member', 'Reason'),
    ('<category>:<action>', 'volunteer', 'Reason'),
    ('<category>:<action>', 'staff', 'Reason'),
    ('<category>:<action>', 'tenant_admin', 'Reason')
) AS r(permission_code, role_key, reason)
WHERE fp.permission_code = r.permission_code
  AND fc.deleted_at IS NULL
ON CONFLICT (feature_permission_id, role_key) DO UPDATE SET
  is_recommended = EXCLUDED.is_recommended,
  reason = EXCLUDED.reason,
  updated_at = now();

-- =============================================================================
-- STEP 5: Grant feature to existing tenants
-- =============================================================================
INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source, starts_at)
SELECT DISTINCT
  t.id,
  fc.id,
  'direct',
  CURRENT_DATE
FROM tenants t
CROSS JOIN feature_catalog fc
WHERE fc.code = '<feature.code>'
  AND fc.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_feature_grants tfg
    WHERE tfg.tenant_id = t.id
      AND tfg.feature_id = fc.id
  )
ON CONFLICT DO NOTHING;

COMMIT;
```

**Key Tables Involved:**
- `feature_catalog` - Feature definitions (code, name, tier, etc.)
- `feature_permissions` - Permissions for each feature (CHECK constraint on permission_code format!)
- `product_offering_features` - Links features to product offerings
- `permission_role_templates` - Default role assignments for permissions
- `tenant_feature_grants` - Grants features to tenants

## Common Migration Tasks

### Creating a New Table

```sql
/**
 * Create <table_name> table
 *
 * Description: <Purpose of this table>
 *
 * Date: YYYY-MM-DD
 * Author: <Your name>
 */

-- Create table
CREATE TABLE <table_name> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_<table_name>_tenant ON <table_name>(tenant_id);
CREATE INDEX idx_<table_name>_deleted ON <table_name>(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tenant_isolation_select" ON <table_name>
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_insert" ON <table_name>
  FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_update" ON <table_name>
  FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "tenant_isolation_delete" ON <table_name>
  FOR DELETE USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Table <table_name> created successfully';
END $$;
```

### Adding an Index

```sql
-- Create index (use CONCURRENTLY for production)
CREATE INDEX CONCURRENTLY idx_my_table_column
ON my_table(column_name);
```

### Dropping a Column

```sql
-- Drop column (use IF EXISTS for safety)
ALTER TABLE my_table
DROP COLUMN IF EXISTS old_column;
```

## Best Practices

### 1. Use Descriptive Comments

```sql
/**
 * Migration Title
 *
 * Description: Detailed description of what this migration does and why
 *
 * Changes:
 * - Create table X
 * - Add index on Y
 * - Update RLS policies
 *
 * Date: YYYY-MM-DD
 * Author: Name
 */
```

### 2. Use IF EXISTS / IF NOT EXISTS

```sql
-- Safe table creation
CREATE TABLE IF NOT EXISTS my_table (...);

-- Safe table drop
DROP TABLE IF EXISTS my_table CASCADE;

-- Safe column drop
ALTER TABLE my_table DROP COLUMN IF EXISTS old_column;
```

### 3. Always Enable RLS for Tenant-Scoped Tables

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

### 4. Create Indexes for Foreign Keys

```sql
CREATE INDEX idx_my_table_tenant ON my_table(tenant_id);
CREATE INDEX idx_my_table_foreign_key ON my_table(foreign_key_id);
```

### 5. Use Transactions for Data Migrations

```sql
BEGIN;

-- Data migration logic
UPDATE my_table SET status = 'active' WHERE status IS NULL;

COMMIT;
```

### 6. Add Success Confirmation

```sql
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
END $$;
```

## Running Migrations

### Local Development

```bash
# Start Supabase locally
npx supabase start

# Apply all pending migrations
npx supabase db push

# Reset database (rerun all migrations)
npx supabase db reset

# Create a new migration
npx supabase migration new <description>
```

### Migration Status

```bash
# View migration status
npx supabase migration list
```

## Troubleshooting

### Issue: Migration Failed

**Solution:**
1. Check error message in terminal
2. Fix SQL in migration file
3. Reset database: `npx supabase db reset`
4. Reapply: `npx supabase db push`

### Issue: RLS Policy Blocking Queries

**Solution:**
1. Check RLS policies on table
2. Verify user's tenant_users record
3. Check `auth.uid()` returns correct user
4. Test query with service role key (bypasses RLS)

### Issue: Unique Constraint Violation

**Solution:**
1. Check if duplicate data exists
2. Add `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`
3. Update unique constraints if needed

## Related Documentation

- **Supabase Docs:** https://supabase.com/docs/guides/database
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Database Schema:** Query tables directly in Supabase Studio
