/**
 * Care Plan Cache for GraphQL
 *
 * Provides in-memory caching of care plan data to reduce database queries
 */

import { MemberCarePlan } from '@/models/memberCarePlan.model';

interface CacheEntry {
  data: MemberCarePlan[];
  timestamp: number;
  tenantId: string;
}

class CarePlanCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached care plans for a tenant
   */
  get(tenantId: string): MemberCarePlan[] | null {
    const entry = this.cache.get(tenantId);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(tenantId);
      return null;
    }

    console.log(`[CarePlanCache] Cache HIT for tenant ${tenantId} (${entry.data.length} care plans)`);
    return entry.data;
  }

  /**
   * Set cached care plans for a tenant
   */
  set(tenantId: string, carePlans: MemberCarePlan[]): void {
    this.cache.set(tenantId, {
      data: carePlans,
      timestamp: Date.now(),
      tenantId,
    });

    console.log(`[CarePlanCache] Cached ${carePlans.length} care plans for tenant ${tenantId}`);
  }

  /**
   * Invalidate cache for a tenant
   */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
    console.log(`[CarePlanCache] Invalidated cache for tenant ${tenantId}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`[CarePlanCache] Cleared all cache`);
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()).map(e => ({
        tenantId: e.tenantId,
        count: e.data.length,
        age: Math.round((Date.now() - e.timestamp) / 1000) + 's',
      })),
    };
  }
}

// Export singleton instance
export const carePlanCache = new CarePlanCache();
