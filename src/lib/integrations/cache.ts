// ─── Sync Cache Helpers ─────────────────────────────────────────────────────
// Read/write from the sync_cache table with TTL support.

import { db } from "@/lib/db";
import { syncCache, syncLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type CacheSource = "clickup" | "sharepoint" | "evoliz";

/**
 * Read from cache if the entry exists and is not expired.
 * Returns null if cache miss or expired.
 */
export async function readCache<T>(key: string): Promise<{
  data: T;
  fetchedAt: Date;
  stale: boolean;
} | null> {
  const [entry] = await db
    .select()
    .from(syncCache)
    .where(eq(syncCache.key, key))
    .limit(1);

  if (!entry) return null;

  const ageMs = Date.now() - entry.fetchedAt.getTime();
  const ttlMs = entry.ttlSeconds * 1000;
  const stale = ageMs > ttlMs;

  return {
    data: entry.data as T,
    fetchedAt: entry.fetchedAt,
    stale,
  };
}

/**
 * Write data to the cache, upserting by key.
 */
export async function writeCache(
  key: string,
  source: CacheSource,
  data: unknown,
  ttlSeconds: number
): Promise<void> {
  await db
    .insert(syncCache)
    .values({
      key,
      source,
      data,
      fetchedAt: new Date(),
      ttlSeconds,
    })
    .onConflictDoUpdate({
      target: syncCache.key,
      set: {
        data,
        fetchedAt: new Date(),
        ttlSeconds,
        source,
      },
    });
}

/**
 * Invalidate (delete) a cache entry.
 */
export async function invalidateCache(key: string): Promise<void> {
  await db.delete(syncCache).where(eq(syncCache.key, key));
}

/**
 * Log a sync operation to the audit trail.
 */
export async function logSync(params: {
  source: CacheSource;
  action: string;
  entityId?: string;
  payload?: unknown;
  status?: "success" | "error" | "retrying";
  error?: string;
}): Promise<void> {
  await db.insert(syncLogs).values({
    source: params.source,
    action: params.action,
    entityId: params.entityId ?? null,
    payload: params.payload ?? null,
    status: params.status ?? "success",
    error: params.error ?? null,
  });
}

/**
 * Fetch data with cache-through pattern.
 * 1. Check cache — return if fresh
 * 2. If stale or miss — fetch from source
 * 3. On success — update cache, return fresh data
 * 4. On failure — return stale cache if available, otherwise throw
 */
export async function fetchWithCache<T>(params: {
  cacheKey: string;
  source: CacheSource;
  ttlSeconds: number;
  fetcher: () => Promise<T>;
}): Promise<{
  data: T;
  cached: boolean;
  stale: boolean;
  fetchedAt: Date;
}> {
  // 1. Check cache
  const cached = await readCache<T>(params.cacheKey);

  if (cached && !cached.stale) {
    return {
      data: cached.data,
      cached: true,
      stale: false,
      fetchedAt: cached.fetchedAt,
    };
  }

  // 2. Try live fetch
  try {
    const data = await params.fetcher();

    // 3. Update cache
    await writeCache(params.cacheKey, params.source, data, params.ttlSeconds);

    return {
      data,
      cached: false,
      stale: false,
      fetchedAt: new Date(),
    };
  } catch (error) {
    // 4. On failure — return stale cache if available
    if (cached) {
      await logSync({
        source: params.source,
        action: "fetch_fallback_to_cache",
        entityId: params.cacheKey,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        data: cached.data,
        cached: true,
        stale: true,
        fetchedAt: cached.fetchedAt,
      };
    }

    // No cache available — propagate the error
    throw error;
  }
}
