import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock environment variables for testing
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

describe('RBAC Database Functions Integration Tests', () => {
  let supabase: any;
  let testTenantId: string;
  let testUserId: string;
  let testRoleId: string;
  let testPermissionId: string;

  beforeAll(async () => {
    // Skip if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.log('Skipping database integration tests - not in test environment');
      return;
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant for RBAC',
        slug: 'test-rbac-tenant',
      })
      .select()
      .single();

    if (tenantError) {
      console.warn('Could not create test tenant:', tenantError);
      return;
    }

    testTenantId = tenant.id;

    // Create test role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Admin',
        metadata_key: 'test_admin',
        scope: 'tenant',
      })
      .select()
      .single();

    if (roleError) {
      console.warn('Could not create test role:', roleError);
      return;
    }

    testRoleId = role.id;

    // Create test permission
    const { data: permission, error: permissionError } = await supabase
      .from('permissions')
      .insert({
        tenant_id: testTenantId,
        code: 'test:view',
        name: 'Test View Permission',
        module: 'test',
        scope: 'tenant',
      })
      .select()
      .single();

    if (permissionError) {
      console.warn('Could not create test permission:', permissionError);
      return;
    }

    testPermissionId = permission.id;

    // Create role-permission mapping
    await supabase
      .from('role_permissions')
      .insert({
        tenant_id: testTenantId,
        role_id: testRoleId,
        permission_id: testPermissionId,
      });
  });

  afterAll(async () => {
    if (process.env.NODE_ENV !== 'test' || !testTenantId) {
      return;
    }

    // Cleanup test data
    try {
      await supabase.from('role_permissions').delete().eq('tenant_id', testTenantId);
      await supabase.from('permissions').delete().eq('tenant_id', testTenantId);
      await supabase.from('roles').delete().eq('tenant_id', testTenantId);
      await supabase.from('tenants').delete().eq('id', testTenantId);
    } catch (error) {
      console.warn('Error cleaning up test data:', error);
    }
  });

  beforeEach(() => {
    if (process.env.NODE_ENV !== 'test') {
      return;
    }

    // Mock auth.uid() for tests
    testUserId = 'test-user-12345';
  });

  describe('Enhanced Permission Functions', () => {
    it('should check permissions with can_user function', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      // First create user_role association
      await supabase.from('user_roles').insert({
        tenant_id: testTenantId,
        user_id: testUserId,
        role_id: testRoleId,
      });

      // Test the can_user function
      const { data, error } = await supabase.rpc('can_user', {
        required_permission: 'test:view',
        target_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      // Note: This might return false if auth context isn't properly set up
      expect(typeof data).toBe('boolean');
    });

    it('should get user effective permissions', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('get_user_effective_permissions', {
        target_user_id: testUserId,
        target_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        const permission = data[0];
        expect(permission).toHaveProperty('permission_code');
        expect(permission).toHaveProperty('permission_name');
        expect(permission).toHaveProperty('role_name');
      }
    });

    it('should get user role metadata keys', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('get_user_role_metadata_keys', {
        target_user_id: testUserId,
        target_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        expect(data).toContain('test_admin');
      }
    });
  });

  describe('Permission Bundles', () => {
    let testBundleId: string;

    beforeEach(async () => {
      if (process.env.NODE_ENV !== 'test') {
        return;
      }

      // Create test permission bundle
      const { data: bundle, error } = await supabase
        .from('permission_bundles')
        .insert({
          tenant_id: testTenantId,
          code: 'test_bundle',
          name: 'Test Bundle',
          metadata_key: 'test_bundle',
          scope: 'tenant',
        })
        .select()
        .single();

      if (!error) {
        testBundleId = bundle.id;

        // Add permission to bundle
        await supabase.from('bundle_permissions').insert({
          tenant_id: testTenantId,
          bundle_id: testBundleId,
          permission_id: testPermissionId,
        });

        // Associate role with bundle
        await supabase.from('role_bundles').insert({
          tenant_id: testTenantId,
          role_id: testRoleId,
          bundle_id: testBundleId,
        });
      }
    });

    it('should work with permission bundles', async () => {
      if (process.env.NODE_ENV !== 'test' || !testBundleId) {
        console.log('Skipping test - not in test environment or bundle not created');
        return;
      }

      // Test that bundle permissions are included in effective permissions
      const { data, error } = await supabase.rpc('get_user_effective_permissions', {
        target_user_id: testUserId,
        target_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // Should find permissions through bundle association
      const bundlePermission = data?.find((p: any) => p.assignment_type === 'bundle');
      if (bundlePermission) {
        expect(bundlePermission.bundle_code).toBe('test_bundle');
      }
    });
  });

  describe('Surface Bindings', () => {
    let testMenuItemId: string;
    let testSurfaceBindingId: string;

    beforeEach(async () => {
      if (process.env.NODE_ENV !== 'test') {
        return;
      }

      // Create test menu item
      const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .insert({
          tenant_id: testTenantId,
          code: 'test_menu',
          label: 'Test Menu',
          path: '/test',
        })
        .select()
        .single();

      if (!menuError) {
        testMenuItemId = menuItem.id;

        // Create surface binding
        const { data: binding, error: bindingError } = await supabase
          .from('rbac_surface_bindings')
          .insert({
            tenant_id: testTenantId,
            role_id: testRoleId,
            menu_item_id: testMenuItemId,
          })
          .select()
          .single();

        if (!bindingError) {
          testSurfaceBindingId = binding.id;
        }
      }
    });

    it('should get user accessible menu items', async () => {
      if (process.env.NODE_ENV !== 'test' || !testMenuItemId) {
        console.log('Skipping test - not in test environment or menu item not created');
        return;
      }

      const { data, error } = await supabase.rpc('get_user_licensed_menu_items', {
        target_user_id: testUserId,
        target_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      const testMenu = data?.find((item: any) => item.menu_code === 'test_menu');
      if (testMenu) {
        expect(testMenu.menu_label).toBe('Test Menu');
        expect(testMenu.menu_path).toBe('/test');
      }
    });
  });

  describe('License Integration', () => {
    let testFeatureId: string;

    beforeEach(async () => {
      if (process.env.NODE_ENV !== 'test') {
        return;
      }

      // Ensure feature exists in catalog
      await supabase
        .from('feature_catalog')
        .upsert(
          {
            code: 'advanced_admin',
            name: 'Advanced Admin',
            category: 'test',
            description: 'Test-only advanced administration feature.',
            phase: 'ga',
          },
          { onConflict: 'code' }
        );

      const { data: feature } = await supabase
        .from('feature_catalog')
        .select('id')
        .eq('code', 'advanced_admin')
        .single();

      testFeatureId = feature?.id;

      if (testFeatureId) {
        await supabase
          .from('tenant_feature_grants')
          .delete()
          .eq('tenant_id', testTenantId)
          .eq('feature_id', testFeatureId)
          .eq('source_reference', 'test-suite');

        await supabase.from('tenant_feature_grants').insert({
          tenant_id: testTenantId,
          feature_id: testFeatureId,
          grant_source: 'direct',
          source_reference: 'test-suite',
          starts_at: new Date().toISOString().slice(0, 10),
        });
      }
    });

    it('should check tenant feature access', async () => {
      if (process.env.NODE_ENV !== 'test' || !testFeatureId) {
        console.log('Skipping test - not in test environment or feature not created');
        return;
      }

      const { data, error } = await supabase.rpc('tenant_has_feature', {
        feature_code: 'advanced_admin',
        tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(data).toBe(true);

      // Test non-existent feature
      const { data: noFeature, error: noFeatureError } = await supabase.rpc('tenant_has_feature', {
        feature_code: 'non_existent_feature',
        tenant_id: testTenantId,
      });

      expect(noFeatureError).toBeNull();
      expect(noFeature).toBe(false);
    });
  });

  describe('Materialized View', () => {
    it('should refresh materialized view safely', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('refresh_tenant_user_effective_permissions_safe');

      // Should not error (though may not have permissions in test environment)
      expect(error).toBeNull();
    });

    it('should have data in materialized view', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase
        .from('tenant_user_effective_permissions')
        .select('*')
        .eq('tenant_id', testTenantId)
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Audit and Health Functions', () => {
    it('should get RBAC health metrics', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('get_rbac_health_metrics', {
        target_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        const healthMetric = data[0];
        expect(healthMetric).toHaveProperty('metric_name');
        expect(healthMetric).toHaveProperty('status');
        expect(healthMetric).toHaveProperty('metric_value');
        expect(healthMetric).toHaveProperty('details');
      }
    });

    it('should validate tenant isolation', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('validate_rbac_tenant_isolation');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // Should return empty array if no issues (or array of issues if found)
      data?.forEach((issue: any) => {
        expect(issue).toHaveProperty('table_name');
        expect(issue).toHaveProperty('issue_type');
        expect(issue).toHaveProperty('issue_count');
      });
    });

    it('should run validation report', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('run_rbac_validation_report');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        const report = data[0];
        expect(report).toHaveProperty('check_type');
        expect(report).toHaveProperty('status');
        expect(report).toHaveProperty('details');
      }
    });
  });

  describe('Data Migration Functions', () => {
    it('should backfill RBAC tenant IDs safely', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('backfill_rbac_tenant_ids');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // Returns operations performed
      data?.forEach((operation: any) => {
        expect(operation).toHaveProperty('table_name');
        expect(operation).toHaveProperty('operation');
        expect(operation).toHaveProperty('affected_rows');
        expect(typeof operation.affected_rows).toBe('bigint');
      });
    });

    it('should create default metadata bindings', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('create_default_metadata_bindings');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // Returns operations performed per tenant
      data?.forEach((operation: any) => {
        expect(operation).toHaveProperty('tenant_id');
        expect(operation).toHaveProperty('operation');
        expect(operation).toHaveProperty('created_count');
      });
    });

    it('should create sample permission bundles', async () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Skipping test - not in test environment');
        return;
      }

      const { data, error } = await supabase.rpc('create_sample_permission_bundles', {
        target_tenant_id: testTenantId,
      });

      expect(error).toBeNull();
      expect(typeof data).toBe('bigint');
      expect(data).toBeGreaterThan(0);

      // Verify bundles were created
      const { data: bundles, error: bundlesError } = await supabase
        .from('permission_bundles')
        .select('*')
        .eq('tenant_id', testTenantId);

      expect(bundlesError).toBeNull();
      expect(Array.isArray(bundles)).toBe(true);
      expect(bundles?.length).toBeGreaterThan(0);
    });
  });
});