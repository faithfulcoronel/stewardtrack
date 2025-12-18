/**
 * Tenant Utils
 *
 * Provides convenient tenant context utilities
 * Follows architectural pattern: Utility → Service → Repository → Adapter → Supabase
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';

export const tenantUtils = {
  async getTenantId(): Promise<string | null> {
    try {
      // Get tenant via service layer
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenant = await tenantService.getCurrentTenant();

      return tenant?.id ?? null;
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to determine tenant id', error);
      }
      return null;
    }
  },
};
