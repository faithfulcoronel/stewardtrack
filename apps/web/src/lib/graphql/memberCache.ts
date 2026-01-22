/**
 * Member Cache for GraphQL
 *
 * Provides in-memory caching of member data to reduce database queries
 * Since member names are encrypted, we need to decrypt them for searching,
 * so caching the decrypted results improves performance.
 */

import { Member } from '@/models/member.model';

interface CacheEntry {
  data: Member[];
  timestamp: number;
  tenantId: string;
}

class MemberCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached members for a tenant
   */
  get(tenantId: string): Member[] | null {
    const entry = this.cache.get(tenantId);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(tenantId);
      return null;
    }

    console.log(`[MemberCache] Cache HIT for tenant ${tenantId} (${entry.data.length} members)`);
    return entry.data;
  }

  /**
   * Set cached members for a tenant
   */
  set(tenantId: string, members: Member[]): void {
    this.cache.set(tenantId, {
      data: members,
      timestamp: Date.now(),
      tenantId,
    });

    console.log(`[MemberCache] Cached ${members.length} members for tenant ${tenantId}`);
  }

  /**
   * Invalidate cache for a tenant
   */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
    console.log(`[MemberCache] Invalidated cache for tenant ${tenantId}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`[MemberCache] Cleared all cache`);
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
export const memberCache = new MemberCache();
