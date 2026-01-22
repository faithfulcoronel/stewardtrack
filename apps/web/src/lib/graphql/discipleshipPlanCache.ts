/**
 * In-Memory Cache for Discipleship Plans
 *
 * Provides caching for discipleship plan queries with TTL-based invalidation
 * to reduce database load for frequent GraphQL queries
 */

import type { MemberDiscipleshipPlan } from '@/models/memberDiscipleshipPlan.model';

interface CacheEntry {
  data: MemberDiscipleshipPlan[];
  timestamp: number;
}

class DiscipleshipPlanCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached discipleship plans for a tenant
   */
  get(tenantId: string): MemberDiscipleshipPlan[] | null {
    const entry = this.cache.get(tenantId);

    if (!entry) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(tenantId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached discipleship plans for a tenant
   */
  set(tenantId: string, discipleshipPlans: MemberDiscipleshipPlan[]): void {
    this.cache.set(tenantId, {
      data: discipleshipPlans,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache for a tenant (called after mutations)
   */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const discipleshipPlanCache = new DiscipleshipPlanCache();
