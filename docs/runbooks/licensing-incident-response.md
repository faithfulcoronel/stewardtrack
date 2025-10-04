# Licensing Incident Response Runbook

## Overview
This runbook provides step-by-step procedures for responding to licensing-related incidents in StewardTrack.

## Common Incidents

### 1. License Expiration

#### Symptoms
- Users unable to access licensed features
- Error messages about expired licenses
- Dashboard showing "expired" status

#### Diagnosis
```bash
# Check license status via API
curl -X GET https://your-domain.com/api/admin/monitoring/license-health \
  -H "Authorization: Bearer YOUR_TOKEN"

# Query database directly
SELECT * FROM tenant_license_summary
WHERE tenant_id = 'TENANT_ID'
AND expires_at < NOW();
```

#### Resolution Steps
1. **Immediate**: Extend license temporarily
   ```sql
   UPDATE tenant_feature_grants
   SET is_active = true
   WHERE tenant_id = 'TENANT_ID'
   AND feature_id IN (
     SELECT feature_id FROM product_offering_features
     WHERE offering_id = 'OFFERING_ID'
   );
   ```

2. **Contact**: Notify tenant admin about expiration
3. **Follow-up**: Process license renewal
4. **Prevent**: Set up expiration alerts (30, 7, 1 day before)

### 2. Seat Limit Exceeded

#### Symptoms
- New users cannot be added
- Error: "Seat limit exceeded"
- Utilization > 100%

#### Diagnosis
```bash
# Check seat utilization
curl -X GET https://your-domain.com/api/admin/monitoring/license-health \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.license_utilization'
```

#### Resolution Steps
1. **Immediate**: Identify inactive users
   ```sql
   SELECT u.id, u.email, u.last_sign_in_at
   FROM auth.users u
   JOIN user_roles ur ON u.id = ur.user_id
   WHERE ur.tenant_id = 'TENANT_ID'
   AND u.last_sign_in_at < NOW() - INTERVAL '90 days'
   ORDER BY u.last_sign_in_at;
   ```

2. **Temporary Fix**: Deactivate inactive users
   ```sql
   UPDATE auth.users
   SET is_active = false
   WHERE id IN (SELECT_INACTIVE_USER_IDS);
   ```

3. **Permanent Fix**: Upgrade tenant to higher tier or add seats
4. **Prevent**: Set up alerts at 90% utilization

### 3. RBAC-License Mismatch

#### Symptoms
- Users have role permissions but can't access features
- "License required" errors despite having roles
- Drift detected in validation reports

#### Diagnosis
```bash
# Run validation
curl -X POST https://your-domain.com/api/admin/validate-licenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "TENANT_ID"}'
```

#### Resolution Steps
1. **Identify Mismatches**
   ```sql
   SELECT * FROM detect_rbac_license_mismatches('TENANT_ID');
   ```

2. **Option A - Grant Missing Licenses**
   ```sql
   INSERT INTO tenant_feature_grants (tenant_id, feature_id, granted_at, is_active)
   SELECT 'TENANT_ID', feature_id, NOW(), true
   FROM license_feature_bundle_features
   WHERE bundle_id = 'REQUIRED_BUNDLE_ID'
   ON CONFLICT DO NOTHING;
   ```

3. **Option B - Remove RBAC Access**
   ```sql
   DELETE FROM role_surface_bindings
   WHERE role_id = 'ROLE_ID'
   AND surface_id IN (
     SELECT surface_id FROM surface_license_bindings
     WHERE required_bundle_id = 'MISSING_BUNDLE_ID'
   );
   ```

4. **Refresh Views**
   ```bash
   curl -X POST https://your-domain.com/api/admin/refresh-views \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### 4. Materialized View Stale/Failed

#### Symptoms
- Permission checks slow or incorrect
- Licensing data out of sync
- Dashboard showing old data

#### Diagnosis
```bash
# Check view health
curl -X GET https://your-domain.com/api/admin/refresh-views \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.latest'
```

#### Resolution Steps
1. **Manual Refresh**
   ```bash
   curl -X POST https://your-domain.com/api/admin/refresh-views \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"force": true}'
   ```

2. **If Concurrent Refresh Fails**
   ```sql
   -- Drop and recreate unique index
   DROP INDEX IF EXISTS tenant_user_effective_permissions_unique_id_idx;
   REFRESH MATERIALIZED VIEW tenant_user_effective_permissions;
   CREATE UNIQUE INDEX tenant_user_effective_permissions_unique_id_idx
   ON tenant_user_effective_permissions (unique_id);
   ```

3. **Check Refresh Logs**
   ```sql
   SELECT * FROM materialized_view_refresh_jobs
   WHERE success = false
   ORDER BY started_at DESC
   LIMIT 10;
   ```

### 5. Onboarding Stuck/Failed

#### Symptoms
- Tenant onboarding incomplete
- Users can't access system
- Missing default roles/permissions

#### Diagnosis
```sql
SELECT * FROM onboarding_progress
WHERE tenant_id = 'TENANT_ID';
```

#### Resolution Steps
1. **Identify Stuck Step**
   ```sql
   SELECT current_step, completed_steps, metadata
   FROM onboarding_progress
   WHERE tenant_id = 'TENANT_ID';
   ```

2. **Re-run Failed Step** (see onboarding-recovery.md)
3. **Manual Provisioning**
   ```sql
   -- Grant default features
   INSERT INTO tenant_feature_grants (tenant_id, feature_id, granted_at, is_active)
   SELECT 'TENANT_ID', feature_id, NOW(), true
   FROM product_offering_features
   WHERE offering_id = 'DEFAULT_OFFERING_ID';

   -- Assign default admin role
   INSERT INTO user_roles (user_id, tenant_id, role_id)
   VALUES ('USER_ID', 'TENANT_ID', 'ADMIN_ROLE_ID');
   ```

4. **Mark Complete**
   ```sql
   UPDATE onboarding_progress
   SET completed = true, completed_at = NOW()
   WHERE tenant_id = 'TENANT_ID';
   ```

## Escalation Procedures

### Level 1 - Support Engineer
- License expiration (< 24 hours overdue)
- Seat limit warnings
- Minor mismatches

### Level 2 - Senior Engineer
- Critical license issues
- Data corruption
- Materialized view failures
- Multiple tenant impact

### Level 3 - Engineering Lead
- System-wide outages
- Security incidents
- Data loss risks

## Monitoring & Alerts

### Critical Alerts (Page immediately)
- License expired (affects > 10 users)
- Seat limit exceeded by > 20%
- Materialized view refresh failed (> 2 times)
- System health score < 50

### Warning Alerts (Email/Slack)
- License expiring in < 7 days
- Seat utilization > 90%
- RBAC drift detected
- Onboarding abandoned (> 48 hours)

## Post-Incident

### After Resolving
1. Document root cause
2. Update runbook if needed
3. Implement preventive measures
4. Notify affected users
5. Schedule post-mortem (if major)

### Post-Mortem Template
```markdown
## Incident Summary
- **Date**: YYYY-MM-DD
- **Duration**: X hours
- **Affected Tenants**: N
- **Root Cause**:

## Timeline
- HH:MM - Incident detected
- HH:MM - Response initiated
- HH:MM - Issue resolved

## Root Cause Analysis
[Detailed explanation]

## Resolution
[Steps taken to resolve]

## Prevention
[Changes to prevent recurrence]

## Action Items
- [ ] Update monitoring
- [ ] Improve documentation
- [ ] Code/config changes
```

## Useful Commands

### Quick Health Check
```bash
# Overall system health
curl -X GET https://your-domain.com/api/admin/monitoring/license-health \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.health_score'

# Validation summary
curl -X GET https://your-domain.com/api/admin/validate-licenses \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.summary'
```

### Emergency Cache Clear
```bash
# Clear all license caches
curl -X POST https://your-domain.com/api/admin/cache/clear \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Force Refresh All Views
```bash
curl -X POST https://your-domain.com/api/admin/refresh-views \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

## Contact Information

- **On-Call Engineer**: [Pager Duty]
- **Engineering Lead**: [Contact]
- **Product Owner**: [Contact]
- **Customer Success**: [Contact]
