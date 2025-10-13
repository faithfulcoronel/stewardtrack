import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';
import { tenantUtils } from '@/utils/tenantUtils';

export interface RoleMetadataMapping {
  roleId: string;
  roleName: string;
  metadataKey: string;
  scope: string;
}

export interface BundleMetadataMapping {
  bundleId: string;
  bundleName: string;
  metadataKey: string;
  scope: string;
}

@injectable()
export class RbacRegistryService {
  private roleMetadataCache = new Map<string, RoleMetadataMapping[]>();
  private bundleMetadataCache = new Map<string, BundleMetadataMapping[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    @inject(TYPES.IUserRoleManagementRepository)
    private userRoleRepo: IUserRoleManagementRepository
  ) {}

  async getRoleMetadataMappings(tenantId?: string): Promise<RoleMetadataMapping[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return [];
    }

    const cacheKey = `roles:${effectiveTenantId}`;

    // Check cache
    if (this.roleMetadataCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.roleMetadataCache.get(cacheKey) || [];
      }
    }

    try {
      // Fetch from database using raw SQL through the adapter
      const supabase = await (this.userRoleRepo as any).adapter.getSupabaseClient();
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, metadata_key, scope')
        .eq('tenant_id', effectiveTenantId)
        .not('metadata_key', 'is', null);

      if (error) {
        console.error('Error fetching role metadata mappings:', error);
        return [];
      }

      const mappings: RoleMetadataMapping[] = (data || []).map(row => ({
        roleId: row.id,
        roleName: row.name,
        metadataKey: row.metadata_key,
        scope: row.scope || 'tenant',
      }));

      // Update cache
      this.roleMetadataCache.set(cacheKey, mappings);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return mappings;
    } catch (error) {
      console.error('Error fetching role metadata mappings:', error);
      return [];
    }
  }

  async getBundleMetadataMappings(tenantId?: string): Promise<BundleMetadataMapping[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return [];
    }

    const cacheKey = `bundles:${effectiveTenantId}`;

    // Check cache
    if (this.bundleMetadataCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.bundleMetadataCache.get(cacheKey) || [];
      }
    }

    try {
      // Fetch from database using raw SQL through the adapter
      const supabase = await (this.userRoleRepo as any).adapter.getSupabaseClient();
      const { data, error } = await supabase
        .from('permission_bundles')
        .select('id, name, metadata_key, scope')
        .eq('tenant_id', effectiveTenantId)
        .not('metadata_key', 'is', null);

      if (error) {
        console.error('Error fetching bundle metadata mappings:', error);
        return [];
      }

      const mappings: BundleMetadataMapping[] = (data || []).map(row => ({
        bundleId: row.id,
        bundleName: row.name,
        metadataKey: row.metadata_key,
        scope: row.scope || 'tenant',
      }));

      // Update cache
      this.bundleMetadataCache.set(cacheKey, mappings);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return mappings;
    } catch (error) {
      console.error('Error fetching bundle metadata mappings:', error);
      return [];
    }
  }

  async getUserMetadataKeys(userId: string, tenantId?: string): Promise<string[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return [];
    }

    try {
      // Use the repository method which respects RBAC configuration
      return await this.userRoleRepo.getUserRoleMetadataKeys(userId, effectiveTenantId);
    } catch (error) {
      console.error('Error getting user metadata keys:', error);
      return [];
    }
  }

  async resolveMetadataKeyToIds(metadataKey: string, tenantId?: string): Promise<{
    roleIds: string[];
    bundleIds: string[];
  }> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return { roleIds: [], bundleIds: [] };
    }

    const [roleMappings, bundleMappings] = await Promise.all([
      this.getRoleMetadataMappings(effectiveTenantId),
      this.getBundleMetadataMappings(effectiveTenantId),
    ]);

    const roleIds = roleMappings
      .filter(mapping => mapping.metadataKey === metadataKey)
      .map(mapping => mapping.roleId);

    const bundleIds = bundleMappings
      .filter(mapping => mapping.metadataKey === metadataKey)
      .map(mapping => mapping.bundleId);

    return { roleIds, bundleIds };
  }

  async createRoleMetadataBinding(
    roleId: string,
    metadataKey: string,
    tenantId?: string
  ): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    try {
      const supabase = await (this.userRoleRepo as any).adapter.getSupabaseClient();
      const { error } = await supabase
        .from('roles')
        .update({ metadata_key: metadataKey, updated_at: new Date().toISOString() })
        .eq('id', roleId)
        .eq('tenant_id', effectiveTenantId);

      if (error) {
        throw error;
      }

      // Clear cache
      this.clearCache(effectiveTenantId);
    } catch (error) {
      console.error('Error creating role metadata binding:', error);
      throw error;
    }
  }

  async createBundleMetadataBinding(
    bundleId: string,
    metadataKey: string,
    tenantId?: string
  ): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    try {
      const supabase = await (this.userRoleRepo as any).adapter.getSupabaseClient();
      const { error } = await supabase
        .from('permission_bundles')
        .update({ metadata_key: metadataKey, updated_at: new Date().toISOString() })
        .eq('id', bundleId)
        .eq('tenant_id', effectiveTenantId);

      if (error) {
        throw error;
      }

      // Clear cache
      this.clearCache(effectiveTenantId);
    } catch (error) {
      console.error('Error creating bundle metadata binding:', error);
      throw error;
    }
  }

  clearCache(tenantId: string): void {
    this.roleMetadataCache.delete(`roles:${tenantId}`);
    this.bundleMetadataCache.delete(`bundles:${tenantId}`);
    this.cacheExpiry.delete(`roles:${tenantId}`);
    this.cacheExpiry.delete(`bundles:${tenantId}`);
  }

  clearAllCaches(): void {
    this.roleMetadataCache.clear();
    this.bundleMetadataCache.clear();
    this.cacheExpiry.clear();
  }
}