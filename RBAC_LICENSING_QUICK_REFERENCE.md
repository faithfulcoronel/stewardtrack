# RBAC + Licensing Quick Reference Guide

**Version**: Phase 2 Complete
**Last Updated**: 2025-10-04

---

## Quick Access Functions

### Permission Checks

```typescript
import {
  checkSurfaceAccess,
  getUserSurfaces,
  getLockedSurfaces,
  getSurfaceAccessInfo,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '@/lib/rbac/permissionHelpers';

// Check if user can access a surface (RBAC + License)
const canAccess = await checkSurfaceAccess(userId, 'member-management');

// Get all accessible surfaces
const surfaces = await getUserSurfaces(userId);

// Get surfaces locked by licensing
const locked = await getLockedSurfaces(userId);

// Get detailed access info
const info = await getSurfaceAccessInfo(userId, 'advanced-reports');
// Returns: { hasAccess, hasRbac, hasLicense, locked, lockReason }

// Check RBAC permission only (no license check)
const canEdit = await hasPermission(userId, 'member.edit');

// Check if user has ANY permission
const canModerate = await hasAnyPermission(userId, ['member.edit', 'member.delete']);

// Check if user has ALL permissions
const canFullyManage = await hasAllPermissions(userId, ['member.create', 'member.edit', 'member.delete']);
```

---

## API Endpoint Usage

### POST /api/rbac/check-access

```typescript
const response = await fetch('/api/rbac/check-access', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    surfaceId: 'member-management',
    tenantId: 'tenant-uuid' // optional
  })
});

const result = await response.json();
// {
//   success: true,
//   hasAccess: false,
//   hasRbac: true,
//   hasLicense: false,
//   reason: "License upgrade required"
// }
```

### GET /api/rbac/check-access

```typescript
const response = await fetch(
  `/api/rbac/check-access?userId=${userId}&surfaceId=${surfaceId}`
);
const result = await response.json();
```

---

## Service Usage

### UserRoleService

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserRoleService } from '@/services/UserRoleService';

const service = container.get<UserRoleService>(TYPES.UserRoleService);

// Check RBAC + License
const canAccess = await service.canAccessSurfaceWithLicense(userId, surfaceId, tenantId);

// Get accessible surfaces
const surfaces = await service.getUserAccessibleSurfaces(userId, tenantId);

// Get locked surfaces
const locked = await service.getLockedSurfaces(userId, tenantId);

// Get user role codes
const roles = await service.getUserRoleCodes(userId, tenantId);

// Check super admin
const isSuperAdmin = await service.isSuperAdmin(userId);
```

### SidebarService

```typescript
import { SidebarService } from '@/services/SidebarService';

const service = container.get<SidebarService>(TYPES.SidebarService);

// Get accessible menu items (strict filtering)
const accessibleItems = await service.getAccessibleMenuItems(userId, roleIds);

// Get all items with lock status (for upgrade prompts)
const itemsWithStatus = await service.getMenuItemsWithLicenseStatus(userId, roleIds);
```

### LicensingService

```typescript
import { LicensingService } from '@/services/LicensingService';

const service = container.get<LicensingService>(TYPES.LicensingService);

// Check surface access
const result = await service.checkSurfaceAccess(userId, surfaceId, tenantId);

// Get licensed surfaces
const surfaces = await service.getTenantLicensedSurfaces(tenantId);

// Get licensing summary
const summary = await service.getTenantLicensingSummary(tenantId);
// Returns: {
//   tenant_id,
//   active_offerings: ProductOffering[],
//   licensed_bundles: LicenseFeatureBundle[],
//   accessible_surfaces: string[],
//   effective_access: EffectiveSurfaceAccess[]
// }
```

---

## Metadata Integration

### Building Evaluation Context

```typescript
import { buildMetadataContext, buildGuestContext } from '@/lib/metadata/contextBuilder';

// Build full context with licensing
const context = await buildMetadataContext(userId, tenantId, searchParams);

// Build guest context (no auth)
const guestContext = buildGuestContext(searchParams);

// Enhance existing context with licensing
import { enhanceContextWithLicensing } from '@/lib/metadata/contextBuilder';
const enhancedContext = await enhanceContextWithLicensing(baseContext, tenantId);
```

### Using License Context in Expressions

```javascript
// In metadata expressions, you can now use:

// License tier
licenseTier === 'professional'
licenseTier === 'enterprise'

// License features
licenseFeatures.includes('advanced-reports')
licenseFeatures.includes('custom-dashboards')

// Licensed surfaces
licensedSurfaces.includes('financial-management')

// Combined checks
licenseTier === 'professional' && licenseFeatures.includes('analytics')
```

### Metadata Manifest Example

```typescript
{
  "components": [
    {
      "id": "premium-button",
      "type": "Button",
      "props": {
        "visible": {
          "kind": "expression",
          "expression": "licenseTier === 'professional' || licenseTier === 'enterprise'"
        },
        "disabled": {
          "kind": "expression",
          "expression": "!licenseFeatures.includes('premium-actions')"
        },
        "label": {
          "kind": "static",
          "value": "Premium Feature"
        }
      }
    }
  ]
}
```

---

## Database Queries

### Query Tenant License Summary

```sql
-- Get tenant licensing information
SELECT * FROM v_tenant_license_summary
WHERE tenant_id = 'tenant-uuid';

-- Check if tenant has specific feature
SELECT active_feature_codes
FROM v_tenant_license_summary
WHERE tenant_id = 'tenant-uuid'
  AND 'advanced-reports' = ANY(active_feature_codes);

-- Get all tenants with professional tier
SELECT tenant_id, tenant_name, offering_name
FROM v_tenant_license_summary
WHERE offering_tier = 'professional';

-- Refresh materialized view
SELECT refresh_tenant_license_summary();
```

### Query Effective Surface Access

```sql
-- Get surfaces accessible to a tenant
SELECT surface_id, surface_title, required_features
FROM v_effective_surface_access
WHERE tenant_id = 'tenant-uuid';

-- Check specific surface access
SELECT * FROM can_access_surface(
  'user-uuid',
  'tenant-uuid',
  'member-management'
);
```

---

## Common Patterns

### Pattern 1: Page-Level Access Guard

```typescript
// app/admin/reports/page.tsx
import { redirect } from 'next/navigation';
import { checkSurfaceAccess } from '@/lib/rbac/permissionHelpers';

export default async function ReportsPage() {
  const userId = await getCurrentUserId();
  const canAccess = await checkSurfaceAccess(userId, 'advanced-reports');

  if (!canAccess) {
    redirect('/upgrade');
  }

  return <ReportsContent />;
}
```

### Pattern 2: Conditional UI with Lock Indicator

```typescript
import { getSurfaceAccessInfo } from '@/lib/rbac/permissionHelpers';
import { Lock } from 'lucide-react';

export default async function FeatureCard({ surfaceId }: { surfaceId: string }) {
  const userId = await getCurrentUserId();
  const info = await getSurfaceAccessInfo(userId, surfaceId);

  return (
    <Card className={info.locked ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle>
          Feature Name
          {info.locked && (
            <Tooltip content={info.lockReason}>
              <Lock className="h-4 w-4 ml-2 text-amber-500" />
            </Tooltip>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {info.hasAccess ? (
          <FeatureContent />
        ) : (
          <UpgradePrompt reason={info.lockReason} />
        )}
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: API Route Protection

```typescript
// app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkSurfaceAccess } from '@/lib/rbac/permissionHelpers';

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  const canAccess = await checkSurfaceAccess(userId, 'advanced-reports');

  if (!canAccess) {
    return NextResponse.json(
      { error: 'Access denied. Upgrade required.' },
      { status: 403 }
    );
  }

  const reports = await getReports();
  return NextResponse.json({ reports });
}
```

### Pattern 4: Upgrade Flow

```typescript
import { getLockedSurfaces } from '@/lib/rbac/permissionHelpers';

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const lockedSurfaces = await getLockedSurfaces(userId);

  if (lockedSurfaces.length > 0) {
    return (
      <UpgradePrompt
        lockedFeatures={lockedSurfaces}
        currentTier="basic"
        recommendedTier="professional"
      />
    );
  }

  return <Dashboard />;
}
```

### Pattern 5: Batch Permission Check

```typescript
import { getUserSurfaces } from '@/lib/rbac/permissionHelpers';

export default async function FeatureGrid() {
  const userId = await getCurrentUserId();
  const accessibleSurfaces = await getUserSurfaces(userId);

  const features = [
    { id: 'reports', surfaceId: 'advanced-reports' },
    { id: 'analytics', surfaceId: 'analytics-dashboard' },
    { id: 'exports', surfaceId: 'data-export' },
  ];

  return (
    <Grid>
      {features.map(feature => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          enabled={accessibleSurfaces.includes(feature.surfaceId)}
        />
      ))}
    </Grid>
  );
}
```

---

## Error Handling

### Graceful Degradation

```typescript
import { checkSurfaceAccess } from '@/lib/rbac/permissionHelpers';

async function checkAccess(userId: string, surfaceId: string) {
  try {
    return await checkSurfaceAccess(userId, surfaceId);
  } catch (error) {
    console.error('Permission check failed:', error);
    // Fail closed - deny access on error
    return false;
  }
}
```

### Logging Access Denials

```typescript
import { getSurfaceAccessInfo } from '@/lib/rbac/permissionHelpers';
import { AuditService } from '@/services/AuditService';

async function auditAccessDenial(userId: string, surfaceId: string) {
  const info = await getSurfaceAccessInfo(userId, surfaceId);

  if (!info.hasAccess) {
    await auditService.log({
      event: 'ACCESS_DENIED',
      user_id: userId,
      resource_id: surfaceId,
      reason: info.lockReason || 'Permission denied',
      metadata: {
        hasRbac: info.hasRbac,
        hasLicense: info.hasLicense,
      },
    });
  }
}
```

---

## Performance Tips

### 1. Batch Queries
```typescript
// ❌ Bad: Multiple individual queries
for (const surface of surfaces) {
  const canAccess = await checkSurfaceAccess(userId, surface);
}

// ✅ Good: Single batch query
const accessibleSurfaces = await getUserSurfaces(userId);
const results = surfaces.map(surface => ({
  surface,
  canAccess: accessibleSurfaces.includes(surface)
}));
```

### 2. Cache Results
```typescript
// Cache accessible surfaces for user session
const cacheKey = `surfaces:${userId}:${tenantId}`;
let surfaces = cache.get(cacheKey);

if (!surfaces) {
  surfaces = await getUserSurfaces(userId, tenantId);
  cache.set(cacheKey, surfaces, { ttl: 300 }); // 5 min TTL
}
```

### 3. Use Materialized View
```typescript
// Direct query to materialized view for tenant-level checks
const { data } = await supabase
  .from('v_tenant_license_summary')
  .select('licensed_surface_ids')
  .eq('tenant_id', tenantId)
  .single();

const hasAccess = data.licensed_surface_ids.includes(surfaceId);
```

---

## Testing Examples

### Unit Test: Permission Helper

```typescript
import { checkSurfaceAccess } from '@/lib/rbac/permissionHelpers';

describe('checkSurfaceAccess', () => {
  it('denies access when user lacks license', async () => {
    // Mock: User has RBAC but no license
    mockUserRoleService.getUserAccessibleMetadataSurfaces.mockResolvedValue([
      { id: 'reports' }
    ]);
    mockLicensingService.checkSurfaceAccess.mockResolvedValue({
      hasAccess: false
    });

    const result = await checkSurfaceAccess('user-1', 'reports');
    expect(result).toBe(false);
  });
});
```

### Integration Test: API Endpoint

```typescript
describe('POST /api/rbac/check-access', () => {
  it('returns correct access information', async () => {
    const response = await fetch('/api/rbac/check-access', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        surfaceId: 'member-management'
      })
    });

    const data = await response.json();
    expect(data).toMatchObject({
      success: true,
      hasAccess: expect.any(Boolean),
      hasRbac: expect.any(Boolean),
      hasLicense: expect.any(Boolean)
    });
  });
});
```

---

## Troubleshooting

### Issue: Access denied despite license
**Solution**: Refresh materialized view
```sql
SELECT refresh_tenant_license_summary();
```

### Issue: Locked surfaces not showing
**Solution**: Verify surface_id in menu_items
```sql
SELECT id, label, surface_id FROM menu_items WHERE tenant_id = ?;
```

### Issue: License context undefined in metadata
**Solution**: Use context builder
```typescript
const context = await buildMetadataContext(userId, tenantId);
```

---

## Migration Checklist

- [ ] Apply migration: `npx supabase db push`
- [ ] Refresh materialized view: `SELECT refresh_tenant_license_summary();`
- [ ] Update frontend imports to use permission helpers
- [ ] Replace direct RBAC checks with combined checks
- [ ] Add license status indicators to UI
- [ ] Test all permission-gated features
- [ ] Monitor performance metrics
- [ ] Schedule periodic view refresh (cron job)

---

## Support & Documentation

- **Implementation Report**: `PHASE_2_IMPLEMENTATION_REPORT.md`
- **Architecture Guidelines**: `CLAUDE_AI_GUIDELINES.md`
- **Phase 1 Report**: Check previous licensing implementation docs
- **API Documentation**: See inline JSDoc comments in source files

---

**Last Updated**: 2025-10-04
**Phase**: 2 Complete
**Next Phase**: UI Implementation (Phase 3)
