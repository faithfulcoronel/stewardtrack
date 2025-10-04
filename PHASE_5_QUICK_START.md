# Phase 5: Quick Start Guide

## What Was Built

Phase 5 completes the licensing-RBAC integration with production-ready optimization, monitoring, and governance features.

## Quick Access

### 1. Services (Import from DI Container)

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';

// View refresh management
const refreshService = container.get<MaterializedViewRefreshService>(
  TYPES.MaterializedViewRefreshService
);

// License monitoring
const monitoringService = container.get<LicenseMonitoringService>(
  TYPES.LicenseMonitoringService
);

// License validation
const validationService = container.get<LicenseValidationService>(
  TYPES.LicenseValidationService
);

// Performance metrics
const metricsService = container.get<MetricsService>(
  TYPES.MetricsService
);
```

### 2. Key API Endpoints

#### Health Monitoring
```bash
GET /api/admin/monitoring/license-health
```

#### Manual View Refresh
```bash
POST /api/admin/refresh-views
{
  "view": "tenant_license_summary",  # optional
  "force": true                       # optional
}
```

#### License Validation
```bash
POST /api/admin/validate-licenses
{
  "tenant_id": "xxx-xxx-xxx"  # optional
}
```

### 3. Caching

```typescript
import { getCached, CacheKeys, CacheInvalidation } from '@/lib/cache/licenseCache';

// Cached retrieval
const features = await getCached(
  CacheKeys.tenantFeatures(tenantId),
  () => fetchFeatures(tenantId),
  5 * 60 * 1000 // 5 min TTL
);

// Invalidation
await CacheInvalidation.invalidateTenant(tenantId);
```

### 4. Feature Flags

```typescript
import { isFeatureEnabled, getFeatureFlags } from '@/lib/featureFlags/licenseFeatureFlags';

// Check specific feature
const enabled = await isFeatureEnabled('LICENSING_ENFORCEMENT_ENABLED', tenantId);

// Get all flags
const flags = await getFeatureFlags(tenantId);
```

### 5. Audit Queries

```typescript
import {
  getLicenseChangeHistory,
  getUserRoleHistory,
  getComplianceReport
} from '@/lib/audit/licenseAuditQueries';

// Get change history
const changes = await getLicenseChangeHistory(tenantId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date(),
  limit: 100
});

// Generate compliance report
const report = await getComplianceReport(
  tenantId,
  new Date('2025-01-01'),
  new Date()
);
```

### 6. Self-Healing

```bash
# Dry run (show issues only)
npm run heal:licenses -- --tenant-id=TENANT_ID --dry-run

# Auto-fix
npm run heal:licenses -- --tenant-id=TENANT_ID --auto-fix

# Heal all tenants
npm run heal:licenses -- --all --auto-fix
```

## Environment Variables

```bash
# Core Settings
LICENSING_ROLLOUT_STAGE=general_availability
LICENSING_ENFORCEMENT_ENABLED=true
ONBOARDING_WIZARD_ENABLED=true
AUTO_PROVISION_ENABLED=true

# Performance
MATERIALIZED_VIEW_REFRESH_ENABLED=true
CACHE_ENABLED=true
REDIS_CACHE_ENABLED=false
REDIS_URL=redis://localhost:6379

# Monitoring
PERFORMANCE_METRICS_ENABLED=true
MONITORING_ALERTS_ENABLED=true
LICENSE_VALIDATION_ENABLED=true
SELF_HEALING_ENABLED=true
```

## Database Functions

```sql
-- Refresh views
SELECT refresh_tenant_license_summary();
SELECT refresh_effective_surface_access();
SELECT refresh_tenant_user_effective_permissions_safe();

-- Schedule all
SELECT scheduled_refresh_all_materialized_views();

-- Get metrics
SELECT get_latency_percentiles('permission_check_latency', NULL, NOW() - INTERVAL '24 hours', NOW());
SELECT get_performance_metrics_summary(NOW() - INTERVAL '24 hours', NOW());

-- Validation
SELECT * FROM detect_rbac_license_mismatches('TENANT_ID');

-- Cleanup
SELECT cleanup_old_performance_metrics(90); -- 90 days retention
```

## Common Tasks

### Check System Health
```bash
curl -X GET https://your-domain.com/api/admin/monitoring/license-health \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.health_score'
```

### Refresh All Views
```bash
curl -X POST https://your-domain.com/api/admin/refresh-views \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Validate All Licenses
```bash
curl -X POST https://your-domain.com/api/admin/validate-licenses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Clear Cache
```typescript
import { CacheInvalidation } from '@/lib/cache/licenseCache';

// Clear all
await CacheInvalidation.invalidateAll();

// Clear tenant
await CacheInvalidation.invalidateTenant(tenantId);
```

## Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| Permission Check | < 50ms (p95) | `get_latency_percentiles('permission_check_latency')` |
| API Response | < 200ms (p95) | `get_latency_percentiles('api_latency')` |
| View Refresh | < 5s | Check `materialized_view_refresh_jobs` table |
| Health Score | > 90 | `GET /api/admin/monitoring/license-health` |
| Cache Hit Rate | > 80% | `getLicenseCache().getStats()` |

## Troubleshooting

### View Refresh Failed
```bash
# Check logs
SELECT * FROM materialized_view_refresh_jobs
WHERE success = false
ORDER BY started_at DESC
LIMIT 10;

# Manual refresh with fallback
SELECT refresh_tenant_user_effective_permissions_safe();
```

### Cache Issues
```typescript
// Check stats
const cache = getLicenseCache();
console.log(cache.getStats());

// Clear and rebuild
await CacheInvalidation.invalidateAll();
```

### License Validation Issues
```bash
# Run validation
curl -X POST /api/admin/validate-licenses \
  -d '{"tenant_id": "TENANT_ID"}'

# Auto-fix
npm run heal:licenses -- --tenant-id=TENANT_ID --auto-fix
```

### Performance Degradation
```sql
-- Check metrics
SELECT * FROM get_performance_metrics_summary(
  NOW() - INTERVAL '1 hour',
  NOW()
);

-- Check view staleness
SELECT view_name, last_refresh, is_stale
FROM (
  SELECT DISTINCT ON (view_name)
    view_name,
    completed_at as last_refresh,
    (NOW() - completed_at) > INTERVAL '1 hour' as is_stale
  FROM materialized_view_refresh_jobs
  ORDER BY view_name, started_at DESC
) subquery;
```

## Documentation

- **Full Report**: `/PHASE_5_IMPLEMENTATION_REPORT.md`
- **Runbooks**: `/docs/runbooks/`
- **Deployment Plan**: `/docs/deployment/licensing-rollout-plan.md`
- **Incident Response**: `/docs/runbooks/licensing-incident-response.md`

## Next Steps

1. Review feature flags configuration
2. Set up monitoring dashboards
3. Configure alert thresholds
4. Train support team
5. Begin internal testing (Week 1)
6. Launch pilot program (Week 3)
7. GA rollout (Week 7+)

## Support

- Engineering: See PHASE_5_IMPLEMENTATION_REPORT.md Section 19
- Incidents: Follow `/docs/runbooks/licensing-incident-response.md`
- Questions: Review comprehensive report
