/**
 * Family Cache for GraphQL
 *
 * Provides in-memory caching of family data to reduce database queries
 */

import { Family } from '@/models/family.model';

interface CacheEntry {
  data: Family[];
  timestamp: number;
  tenantId: string;
}

class FamilyCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached families for a tenant
   */
  get(tenantId: string): Family[] | null {
    const entry = this.cache.get(tenantId);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(tenantId);
      return null;
    }

    console.log(`[FamilyCache] Cache HIT for tenant ${tenantId} (${entry.data.length} families)`);
    return entry.data;
  }

  /**
   * Set cached families for a tenant
   */
  set(tenantId: string, families: Family[]): void {
    this.cache.set(tenantId, {
      data: families,
      timestamp: Date.now(),
      tenantId,
    });

    console.log(`[FamilyCache] Cached ${families.length} families for tenant ${tenantId}`);
  }

  /**
   * Invalidate cache for a tenant
   */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
    console.log(`[FamilyCache] Invalidated cache for tenant ${tenantId}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`[FamilyCache] Cleared all cache`);
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
export const familyCache = new FamilyCache();
