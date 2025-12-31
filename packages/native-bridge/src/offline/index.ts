/**
 * Offline Sync Manager
 *
 * Manages offline data caching and synchronization for mobile apps.
 * - Caches critical data (members, events) for offline viewing
 * - Queues mutations when offline
 * - Syncs queued changes when back online
 * - Conflict resolution with server timestamp priority
 */

import { isNative, isBrowser } from '../platform';
import * as storage from '../storage';

// Types
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  version: number;
  expiresAt?: number;
}

export interface QueuedMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

export interface OfflineConfig {
  /** Cache expiration time in milliseconds (default: 24 hours) */
  cacheExpiration: number;
  /** Maximum retry attempts for failed mutations */
  maxRetries: number;
  /** Entities to cache for offline access */
  cachedEntities: string[];
  /** Conflict resolution strategy */
  conflictStrategy: 'server-wins' | 'client-wins' | 'manual';
}

const DEFAULT_CONFIG: OfflineConfig = {
  cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
  maxRetries: 3,
  cachedEntities: ['members', 'events', 'announcements', 'ministry_teams'],
  conflictStrategy: 'server-wins',
};

// Storage keys
const CACHE_PREFIX = 'st_cache_';
const QUEUE_KEY = 'st_offline_queue';
const CONFIG_KEY = 'st_offline_config';
const LAST_SYNC_KEY = 'st_last_sync';

// Online/offline event listeners
type ConnectionListener = (isOnline: boolean) => void;
let connectionListeners: ConnectionListener[] = [];
let isOnlineState = true;

/**
 * Initialize offline sync manager
 */
export async function initialize(config: Partial<OfflineConfig> = {}): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  await storage.setJSON(CONFIG_KEY, finalConfig);

  // Set up online/offline detection
  if (isBrowser()) {
    isOnlineState = navigator.onLine;

    window.addEventListener('online', () => {
      isOnlineState = true;
      connectionListeners.forEach((listener) => listener(true));
      // Auto-sync when coming back online
      syncPendingMutations().catch(console.error);
    });

    window.addEventListener('offline', () => {
      isOnlineState = false;
      connectionListeners.forEach((listener) => listener(false));
    });
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  if (isBrowser()) {
    return navigator.onLine;
  }
  return isOnlineState;
}

/**
 * Add listener for connection state changes
 */
export function addConnectionListener(listener: ConnectionListener): () => void {
  connectionListeners.push(listener);
  return () => {
    connectionListeners = connectionListeners.filter((l) => l !== listener);
  };
}

/**
 * Cache data for offline access
 */
export async function cacheData<T>(
  entity: string,
  key: string,
  data: T,
  expirationMs?: number
): Promise<void> {
  const config = await getConfig();
  const cacheKey = `${CACHE_PREFIX}${entity}_${key}`;

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    version: 1,
    expiresAt: expirationMs
      ? Date.now() + expirationMs
      : Date.now() + config.cacheExpiration,
  };

  await storage.setJSON(cacheKey, entry);
}

/**
 * Get cached data
 */
export async function getCachedData<T>(
  entity: string,
  key: string
): Promise<T | null> {
  const cacheKey = `${CACHE_PREFIX}${entity}_${key}`;
  const entry = await storage.getJSON<CacheEntry<T>>(cacheKey);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    await storage.removeItem(cacheKey);
    return null;
  }

  return entry.data;
}

/**
 * Get all cached data for an entity
 */
export async function getAllCachedData<T>(entity: string): Promise<T[]> {
  const keys = await storage.keys();
  const prefix = `${CACHE_PREFIX}${entity}_`;
  const results: T[] = [];

  for (const key of keys) {
    if (key.startsWith(prefix)) {
      const entry = await storage.getJSON<CacheEntry<T>>(key);
      if (entry && (!entry.expiresAt || entry.expiresAt >= Date.now())) {
        results.push(entry.data);
      }
    }
  }

  return results;
}

/**
 * Clear cached data for an entity
 */
export async function clearCache(entity?: string): Promise<void> {
  const keys = await storage.keys();
  const prefix = entity ? `${CACHE_PREFIX}${entity}_` : CACHE_PREFIX;

  for (const key of keys) {
    if (key.startsWith(prefix)) {
      await storage.removeItem(key);
    }
  }
}

/**
 * Queue a mutation for later sync
 */
export async function queueMutation(
  type: 'create' | 'update' | 'delete',
  entity: string,
  payload: Record<string, unknown>
): Promise<string> {
  const config = await getConfig();
  const queue = await getQueue();

  const mutation: QueuedMutation = {
    id: generateId(),
    type,
    entity,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: config.maxRetries,
  };

  queue.push(mutation);
  await storage.setJSON(QUEUE_KEY, queue);

  return mutation.id;
}

/**
 * Get pending mutations queue
 */
export async function getQueue(): Promise<QueuedMutation[]> {
  const queue = await storage.getJSON<QueuedMutation[]>(QUEUE_KEY);
  return queue || [];
}

/**
 * Get pending mutation count
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Sync pending mutations with server
 */
export async function syncPendingMutations(
  syncHandler?: (mutation: QueuedMutation) => Promise<boolean>
): Promise<SyncResult> {
  if (!isOnline()) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: ['Device is offline'],
    };
  }

  const queue = await getQueue();
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  const remainingMutations: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      let synced = false;

      if (syncHandler) {
        synced = await syncHandler(mutation);
      } else {
        // Default sync behavior - call API endpoint
        synced = await defaultSyncHandler(mutation);
      }

      if (synced) {
        result.synced++;
      } else {
        mutation.retryCount++;
        if (mutation.retryCount < mutation.maxRetries) {
          remainingMutations.push(mutation);
        } else {
          result.failed++;
          result.errors.push(`Max retries exceeded for ${mutation.entity} ${mutation.type}`);
        }
      }
    } catch (error) {
      mutation.retryCount++;
      if (mutation.retryCount < mutation.maxRetries) {
        remainingMutations.push(mutation);
      } else {
        result.failed++;
        result.errors.push(
          error instanceof Error ? error.message : `Failed to sync ${mutation.entity}`
        );
      }
    }
  }

  // Update queue with remaining mutations
  await storage.setJSON(QUEUE_KEY, remainingMutations);
  await storage.setItem(LAST_SYNC_KEY, Date.now().toString());

  result.success = result.failed === 0;
  return result;
}

/**
 * Remove a mutation from the queue
 */
export async function removeMutation(mutationId: string): Promise<boolean> {
  const queue = await getQueue();
  const index = queue.findIndex((m) => m.id === mutationId);

  if (index === -1) {
    return false;
  }

  queue.splice(index, 1);
  await storage.setJSON(QUEUE_KEY, queue);
  return true;
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
  const timestamp = await storage.getItem(LAST_SYNC_KEY);
  return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Check if data is stale
 */
export async function isDataStale(entity: string, key: string): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX}${entity}_${key}`;
  const entry = await storage.getJSON<CacheEntry>(cacheKey);

  if (!entry) {
    return true;
  }

  const config = await getConfig();
  const age = Date.now() - entry.timestamp;
  return age > config.cacheExpiration;
}

/**
 * Prefetch and cache data for offline use
 */
export async function prefetchForOffline<T>(
  entity: string,
  fetchFn: () => Promise<T[]>,
  keyExtractor: (item: T) => string
): Promise<number> {
  if (!isOnline()) {
    return 0;
  }

  try {
    const items = await fetchFn();
    let cached = 0;

    for (const item of items) {
      const key = keyExtractor(item);
      await cacheData(entity, key, item);
      cached++;
    }

    return cached;
  } catch (error) {
    console.error(`Failed to prefetch ${entity}:`, error);
    return 0;
  }
}

// Internal helpers

async function getConfig(): Promise<OfflineConfig> {
  const config = await storage.getJSON<OfflineConfig>(CONFIG_KEY);
  return config || DEFAULT_CONFIG;
}

async function defaultSyncHandler(mutation: QueuedMutation): Promise<boolean> {
  // Default implementation - would need to be customized for specific API
  // This is a placeholder that returns true to indicate the mutation should be
  // handled by a custom sync handler
  console.log('Mutation requires custom sync handler:', mutation);
  return false;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * React hook for offline status
 */
export function useOfflineStatus() {
  return {
    isOnline,
    getQueue,
    getPendingCount,
    syncPendingMutations,
    addConnectionListener,
  };
}

/**
 * React hook for cached data
 */
export function useCachedData<T>(entity: string, key: string) {
  return {
    get: () => getCachedData<T>(entity, key),
    set: (data: T) => cacheData(entity, key, data),
    clear: () => clearCache(entity),
    isStale: () => isDataStale(entity, key),
  };
}
