# Testing Guide: Licensing-RBAC Integration

**Purpose:** Comprehensive testing guide for the automatic permission deployment system
**Date:** 2025-12-19
**Status:** Ready for Testing

---

## Prerequisites

Before testing, ensure:
- ✅ Migration `20251219091008_cleanup_orphaned_rbac_licensing_data.sql` has been run
- ✅ All code changes deployed
- ✅ Local Supabase is running (`npx supabase start`)
- ✅ Dev server is running (`npm run dev`)

---

## Quick Start Testing

### 1. Apply Migration

```bash
cd c:\Users\CortanatechSolutions\source\repos\github\stewardtrack
npx supabase db push
```

**Verify migration success:**
```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'roles'
AND column_name IN ('metadata_key', 'is_system');

-- Expected output:
-- metadata_key | text
-- is_system    | boolean
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test New Tenant Registration

1. Navigate to `http://localhost:3000/signup`
2. Fill out registration form:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Church Name: `Test Church`
   - First/Last Name: `Test User`
   - Select a product offering (e.g., Professional)
3. Click "Register"
4. Wait for registration to complete

### 4. Verify Permission Deployment

Check the server console logs for:
```
Created 4 default roles for tenant <tenant_id>
Roles created with metadata_key linking to permission templates
PermissionDeploymentService will auto-assign permissions based on licensed features
Permission deployment for tenant <tenant_id>: {...}
```

---

## Detailed Testing Steps

### Test 1: Database Schema Verification

**Purpose:** Ensure migration applied correctly

**SQL Checks:**
```sql
-- 1. Check roles table has new columns
SELECT
  id,
  name,
  metadata_key,
  is_system,
  tenant_id
FROM roles
WHERE metadata_key IS NOT NULL
LIMIT 5;

-- Expected: Shows roles with metadata_key like 'role_tenant_admin'

-- 2. Check archived tables exist
SELECT COUNT(*) FROM archived_orphaned_permissions;
SELECT COUNT(*) FROM archived_orphaned_surface_bindings;

-- Expected: Numbers showing archived data (may be 0 if clean database)

-- 3. Check indexes created
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('roles', 'permissions', 'rbac_surface_bindings')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: Shows indexes like idx_roles_metadata_key, idx_permissions_source_ref, etc.
```

**Pass Criteria:** All queries return expected results with no errors

---

### Test 2: New Tenant Registration

**Purpose:** Verify automatic permission deployment on signup

**Steps:**
1. Navigate to `/signup`
2. Complete registration form with test data
3. Note the `tenant_id` from success message or database

**Verification Queries:**
```sql
-- Replace <tenant_id> with actual tenant ID

-- 1. Check default roles created with metadata_key
SELECT
  name,
  metadata_key,
  is_system,
  scope
FROM roles
WHERE tenant_id = '<tenant_id>'
ORDER BY name;

-- Expected: 4 roles (Tenant Administrator, Staff Member, Volunteer, Church Member)
-- All should have metadata_key and is_system = true

-- 2. Check permissions deployed
SELECT
  code,
  name,
  source,
  source_reference
FROM permissions
WHERE tenant_id = '<tenant_id>'
ORDER BY code;

-- Expected: Multiple permissions with source = 'license_feature'

-- 3. Check role-permission assignments
SELECT
  r.name AS role_name,
  p.code AS permission_code,
  rp.granted_at
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.tenant_id = '<tenant_id>'
ORDER BY r.name, p.code;

-- Expected: Multiple assignments, especially to Tenant Administrator role

-- 4. Check surface bindings created
SELECT
  ms.module,
  ms.route,
  sb.required_feature_code,
  sb.is_active
FROM rbac_surface_bindings sb
JOIN metadata_surfaces ms ON ms.id = sb.surface_id
WHERE sb.tenant_id = '<tenant_id>';

-- Expected: Surface bindings for features with surface_id
```

**Pass Criteria:**
- ✅ 4 roles created with correct `metadata_key` values
- ✅ All roles have `is_system = true`
- ✅ Permissions exist with `source = 'license_feature'`
- ✅ Tenant Administrator role has multiple permission assignments
- ✅ Surface bindings created for features

---

### Test 3: User Login and Access

**Purpose:** Verify tenant_admin can access licensed features

**Steps:**
1. Login with the test account created in Test 2
2. Navigate to dashboard
3. Try accessing various features based on tier

**Checks:**
```
Starter Tier:
- ✅ Can access basic member management
- ✅ Can view basic reports
- ❌ Cannot access advanced features

Professional Tier:
- ✅ Can access member management
- ✅ Can access donation tracking
- ✅ Can access advanced reports
- ❌ Cannot access enterprise features

Enterprise Tier:
- ✅ Can access all features
- ✅ No "Access Denied" errors
```

**Pass Criteria:** Access matches the selected tier with no unexpected errors

---

### Test 4: License Assignment (Existing Tenant)

**Purpose:** Verify permission sync when changing licenses

**Setup:**
Create a test tenant first (or use existing):
```sql
-- Find an existing tenant
SELECT id, name, subscription_tier
FROM tenants
LIMIT 1;
```

**Steps:**
1. Login as super_admin or use API endpoint
2. Navigate to `/admin/licensing` (if UI exists)
3. OR use API: `POST /api/licensing/assign-license`
   ```json
   {
     "tenantId": "<tenant_id>",
     "offeringId": "<new_offering_id>",
     "notes": "Testing license upgrade"
   }
   ```

**Verification:**
```sql
-- Check permission sync occurred
SELECT
  COUNT(*) as total_permissions,
  COUNT(DISTINCT source_reference) as feature_count
FROM permissions
WHERE tenant_id = '<tenant_id>'
AND source = 'license_feature';

-- Check sync log in server console
-- Look for: "Permission sync for tenant <tenant_id> after license assignment"
```

**Pass Criteria:**
- ✅ API returns success with sync message
- ✅ Server logs show permission deployment
- ✅ Permission count increased (if upgraded) or decreased (if downgraded)
- ✅ No errors in sync process

---

### Test 5: Feature Permission Templates

**Purpose:** Verify role templates are applied correctly

**Setup:**
Check existing feature permissions with templates:
```sql
SELECT
  fc.code AS feature_code,
  fc.name AS feature_name,
  fp.permission_code,
  prt.role_key,
  prt.is_recommended
FROM feature_catalog fc
JOIN feature_permissions fp ON fp.feature_id = fc.id
LEFT JOIN permission_role_templates prt ON prt.feature_permission_id = fp.id
WHERE fc.deleted_at IS NULL
ORDER BY fc.code, fp.permission_code, prt.role_key
LIMIT 20;
```

**Test:**
1. Create new tenant (via registration)
2. Check if role assignments match templates

**Verification:**
```sql
-- For a specific feature, check if template assignments match actual assignments
WITH feature_templates AS (
  SELECT
    fp.permission_code,
    prt.role_key,
    fp.feature_id
  FROM feature_permissions fp
  JOIN permission_role_templates prt ON prt.feature_permission_id = fp.id
  WHERE fp.feature_id = '<some_feature_id>'
),
actual_assignments AS (
  SELECT
    p.code AS permission_code,
    r.metadata_key AS role_key
  FROM permissions p
  JOIN role_permissions rp ON rp.permission_id = p.id
  JOIN roles r ON r.id = rp.role_id
  WHERE p.tenant_id = '<tenant_id>'
    AND p.source_reference = '<same_feature_id>'
)
SELECT
  ft.permission_code,
  ft.role_key AS template_role,
  aa.role_key AS actual_role,
  CASE
    WHEN aa.role_key IS NULL THEN 'MISSING'
    WHEN ft.role_key = aa.role_key THEN 'MATCH'
    ELSE 'MISMATCH'
  END AS status
FROM feature_templates ft
LEFT JOIN actual_assignments aa ON aa.permission_code = ft.permission_code;
```

**Pass Criteria:**
- ✅ All template assignments result in actual role-permission links
- ✅ Status column shows mostly 'MATCH'
- ✅ No 'MISSING' statuses for required permissions

---

### Test 6: Surface Binding Access Gates

**Purpose:** Verify surface bindings control access correctly

**Steps:**
1. Login as tenant_admin
2. Try accessing a page that requires a licensed feature
3. Try accessing a page that requires an unlicensed feature (if applicable)

**Check ACCESS_GATE_GUIDE.md examples:**
```typescript
// Example from ACCESS_GATE_GUIDE.md
// Should work if feature is licensed
<FeatureGate featureCode="advanced_reporting">
  <AdvancedReportsPage />
</FeatureGate>
```

**Verification Queries:**
```sql
-- Check surface bindings for tenant
SELECT
  ms.module,
  ms.route,
  ms.title,
  sb.required_feature_code,
  sb.is_active,
  CASE
    WHEN tfg.id IS NOT NULL THEN 'LICENSED'
    ELSE 'NOT LICENSED'
  END AS license_status
FROM rbac_surface_bindings sb
JOIN metadata_surfaces ms ON ms.id = sb.surface_id
LEFT JOIN tenant_feature_grants tfg ON tfg.tenant_id = sb.tenant_id
  AND tfg.feature_id IN (
    SELECT id FROM feature_catalog WHERE code = sb.required_feature_code
  )
WHERE sb.tenant_id = '<tenant_id>';
```

**Pass Criteria:**
- ✅ Access granted for licensed features
- ✅ Access denied for unlicensed features
- ✅ No console errors or crashes
- ✅ Proper error messages displayed

---

## Performance Testing

### Test 7: Bulk Permission Deployment

**Purpose:** Verify system handles large-scale deployments

**Setup:**
Create a feature with many permissions:
```sql
-- Create test feature
INSERT INTO feature_catalog (code, name, category, phase, is_active)
VALUES ('bulk_test', 'Bulk Test Feature', 'testing', 'alpha', true)
RETURNING id;

-- Create 50 permissions for this feature
-- (Use a script or repeat INSERT 50 times)
```

**Test:**
1. Assign license with this feature to tenant
2. Monitor deployment time
3. Check server logs for performance metrics

**Pass Criteria:**
- ✅ Deployment completes within reasonable time (< 5 seconds for 50 permissions)
- ✅ No timeout errors
- ✅ All permissions deployed successfully
- ✅ Memory usage remains stable

---

## Error Handling Testing

### Test 8: Graceful Degradation

**Purpose:** Verify system handles errors gracefully

**Test Cases:**

**Case 1: Missing Role Template**
```sql
-- Create permission without role templates
INSERT INTO feature_permissions (feature_id, permission_code, display_name, category, action)
VALUES ('<feature_id>', 'test:orphan', 'Orphan Permission', 'test', 'orphan');

-- Deploy and check logs
```
**Expected:** Warning logged, deployment continues

**Case 2: Invalid metadata_key**
```sql
-- Temporarily remove metadata_key from a role
UPDATE roles
SET metadata_key = NULL
WHERE code = 'staff' AND tenant_id = '<tenant_id>';

-- Try deploying permissions
```
**Expected:** Warning logged for unmatched template, other roles still get permissions

**Case 3: Duplicate Permission**
```sql
-- Manually create a permission that deployment will try to create
INSERT INTO permissions (tenant_id, code, name, module, category, is_active)
VALUES ('<tenant_id>', 'members:view', 'View Members', 'members', 'members', true);

-- Deploy (should skip duplicate)
```
**Expected:** Warning logged, no error, deployment continues

**Pass Criteria:**
- ✅ Errors logged clearly
- ✅ Deployment doesn't crash
- ✅ Partial success is possible
- ✅ Users can still access existing permissions

---

## Cleanup and Reset

### Reset Test Environment

```sql
-- Delete test tenant and all related data
DELETE FROM tenants WHERE name LIKE 'Test%';

-- Check archived data
SELECT * FROM archived_orphaned_permissions LIMIT 5;
SELECT * FROM archived_orphaned_surface_bindings LIMIT 5;

-- Optional: Clear archives
TRUNCATE archived_orphaned_permissions;
TRUNCATE archived_orphaned_surface_bindings;
```

---

## Troubleshooting

### Issue: "No permissions deployed"

**Check:**
1. Feature has permissions defined in `feature_permissions` table
2. Feature is linked to offering in `license_feature_bundles`
3. Offering is granted to tenant in `tenant_feature_grants`
4. Server logs show deployment attempt

**Fix:**
```sql
-- Manually trigger deployment for tenant
-- (Create admin endpoint or use service directly)
```

### Issue: "Role not found by metadata_key"

**Check:**
```sql
SELECT * FROM roles
WHERE tenant_id = '<tenant_id>'
AND metadata_key IS NULL;
```

**Fix:**
```sql
UPDATE roles
SET metadata_key = 'role_' || code,
    is_system = true
WHERE tenant_id = '<tenant_id>'
AND metadata_key IS NULL;
```

### Issue: "Duplicate permission code"

**This is normal!** Deployment is idempotent. The warning can be ignored.

### Issue: "Surface binding not created"

**Check:**
```sql
-- Does feature have surface_id?
SELECT code, name, surface_id
FROM feature_catalog
WHERE code = '<feature_code>';

-- If NULL, surface binding won't be created
```

---

## Success Criteria Summary

### All Tests Pass When:

- ✅ Migration applies without errors
- ✅ New tenants get 4 default roles with `metadata_key`
- ✅ Permissions automatically deployed on registration
- ✅ Role templates applied to tenant_admin
- ✅ Surface bindings created for features
- ✅ User can access licensed features after login
- ✅ License changes trigger permission sync
- ✅ No console errors or crashes
- ✅ Performance acceptable (< 5s for typical deployment)
- ✅ Errors handled gracefully

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests passed on local environment
- [ ] Migration tested on staging database
- [ ] Backup production database
- [ ] Run migration on production: `npx supabase db push`
- [ ] Deploy code changes
- [ ] Test one new tenant registration
- [ ] Monitor logs for errors
- [ ] Create rollback plan (restore from backup if needed)
- [ ] Document any issues encountered
- [ ] Update team on deployment status

---

## Monitoring in Production

**Key Metrics to Watch:**
- New tenant registration success rate
- Permission deployment errors
- Average deployment time
- License assignment success rate

**Log Queries:**
```
Search for: "Permission deployment for tenant"
Search for: "Permission sync for tenant"
Search for: "Failed to deploy permissions"
```

**Database Health Checks:**
```sql
-- Check for tenants without permissions
SELECT
  t.id,
  t.name,
  COUNT(p.id) AS permission_count
FROM tenants t
LEFT JOIN permissions p ON p.tenant_id = t.id
  AND p.source = 'license_feature'
GROUP BY t.id, t.name
HAVING COUNT(p.id) = 0;

-- Should return 0 rows for healthy system
```

---

**Last Updated:** 2025-12-19
**Next Review:** After production deployment
