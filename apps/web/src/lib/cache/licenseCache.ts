import 'server-only';

/**
 * LicenseCache
 *
 * In-memory caching layer for frequently accessed license data.
 * Provides TTL-based expiration and optional Redis integration.
 *
 * Features:
 * - In-memory cache with configurable TTL
 * - Automatic cache invalidation on license changes
 * - Redis integration for distributed caching (optional)
 * - Graceful fallback to in-memory when Redis unavailable
 * - Cache statistics and monitoring
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export interface LicenseCacheConfig {
  ttlMs?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum number of entries (default: 1000)
  enableRedis?: boolean; // Enable Redis integration (default: false)
  redisUrl?: string; // Redis connection URL
}

class LicenseCacheStore {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };

  private config: Required<LicenseCacheConfig>;
  private redisClient: any = null;

  constructor(config: LicenseCacheConfig = {}) {
    this.config = {
      ttlMs: config.ttlMs || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 1000,
      enableRedis: config.enableRedis || false,
      redisUrl: config.redisUrl || process.env.REDIS_URL || '',
    };

    if (this.config.enableRedis && this.config.redisUrl) {
      this.initializeRedis();
    }
  }

  /**
   * Initialize Redis client (if enabled and available)
   */
  private async initializeRedis() {
    try {
      // Dynamically import Redis only if needed
      const { createClient } = await import('redis');

      this.redisClient = createClient({
        url: this.config.redisUrl,
      });

      this.redisClient.on('error', (err: any) => {
        console.error('Redis Client Error:', err);
        this.redisClient = null; // Disable Redis on error
      });

      await this.redisClient.connect();
      console.log('Redis cache initialized successfully');
    } catch (error) {
      console.warn('Redis not available, using in-memory cache only:', error);
      this.redisClient = null;
    }
  }

  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first if enabled
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(this.prefixKey(key));
        if (redisValue) {
          this.stats.hits++;
          return JSON.parse(redisValue);
        }
      } catch (error) {
        console.warn('Redis get failed, falling back to in-memory:', error);
      }
    }

    // Fall back to in-memory cache
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const actualTtl = ttlMs || this.config.ttlMs;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + actualTtl,
      createdAt: now,
    };

    // Set in Redis if enabled
    if (this.redisClient) {
      try {
        await this.redisClient.setEx(
          this.prefixKey(key),
          Math.floor(actualTtl / 1000), // Redis uses seconds
          JSON.stringify(value)
        );
      } catch (error) {
        console.warn('Redis set failed, using in-memory only:', error);
      }
    }

    // Always set in in-memory cache
    this.cache.set(key, entry);

    // Evict oldest entries if cache is too large
    if (this.cache.size > this.config.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<void> {
    // Delete from Redis if enabled
    if (this.redisClient) {
      try {
        await this.redisClient.del(this.prefixKey(key));
      } catch (error) {
        console.warn('Redis delete failed:', error);
      }
    }

    // Delete from in-memory cache
    this.cache.delete(key);
  }

  /**
   * Delete all entries matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    // Delete from Redis if enabled
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(this.prefixKey(pattern));
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.warn('Redis pattern delete failed:', error);
      }
    }

    // Delete from in-memory cache
    const keysToDelete: string[] = [];
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear Redis if enabled
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(this.prefixKey('*'));
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.warn('Redis clear failed:', error);
      }
    }

    // Clear in-memory cache
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Evict the oldest entry from the cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Add prefix to Redis keys for namespacing
   */
  private prefixKey(key: string): string {
    return `license:${key}`;
  }

  /**
   * Close Redis connection if open
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Singleton instance
let cacheInstance: LicenseCacheStore | null = null;

/**
 * Get or create the cache instance
 */
export function getLicenseCache(config?: LicenseCacheConfig): LicenseCacheStore {
  if (!cacheInstance) {
    cacheInstance = new LicenseCacheStore(config);
  }
  return cacheInstance;
}

/**
 * Cache key generators for different entity types
 */
export const CacheKeys = {
  tenantLicense: (tenantId: string) => `tenant:${tenantId}:license`,
  tenantFeatures: (tenantId: string) => `tenant:${tenantId}:features`,
  tenantOfferings: (tenantId: string) => `tenant:${tenantId}:offerings`,
  userPermissions: (tenantId: string, userId: string) => `tenant:${tenantId}:user:${userId}:permissions`,
  surfaceAccess: (tenantId: string, surfaceId: string) => `tenant:${tenantId}:surface:${surfaceId}:access`,
  effectiveAccess: (tenantId: string) => `tenant:${tenantId}:effective-access`,
  licenseSummary: (tenantId: string) => `tenant:${tenantId}:license-summary`,
  productOffering: (offeringId: string) => `offering:${offeringId}`,
  featureBundle: (bundleId: string) => `bundle:${bundleId}`,
};

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate all caches for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    const cache = getLicenseCache();
    await cache.deletePattern(`tenant:${tenantId}:*`);
  },

  /**
   * Invalidate user-specific caches
   */
  async invalidateUser(tenantId: string, userId: string): Promise<void> {
    const cache = getLicenseCache();
    await cache.delete(CacheKeys.userPermissions(tenantId, userId));
  },

  /**
   * Invalidate license-related caches
   */
  async invalidateLicense(tenantId: string): Promise<void> {
    const cache = getLicenseCache();
    await cache.delete(CacheKeys.tenantLicense(tenantId));
    await cache.delete(CacheKeys.tenantFeatures(tenantId));
    await cache.delete(CacheKeys.tenantOfferings(tenantId));
    await cache.delete(CacheKeys.licenseSummary(tenantId));
    await cache.deletePattern(`tenant:${tenantId}:surface:*`);
  },

  /**
   * Invalidate all caches
   */
  async invalidateAll(): Promise<void> {
    const cache = getLicenseCache();
    await cache.clear();
  },
};

/**
 * Cached data retrieval with automatic fallback
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  const cache = getLicenseCache();

  // Try to get from cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await cache.set(key, data, ttlMs);

  return data;
}
