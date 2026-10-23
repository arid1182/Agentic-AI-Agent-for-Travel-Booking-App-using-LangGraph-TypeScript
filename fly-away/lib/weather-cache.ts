/**
 * Simple in-memory cache with TTL for OpenWeather API responses.
 * Reduces unnecessary API requests and helps stay within rate limits.
 *
 * Note: This is a per-server-instance cache. In a multi-instance deployment
 * (e.g., Vercel serverless functions), each instance maintains its own cache.
 * For production with many instances, consider Redis or Upstash.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number; // epoch ms
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_TTL_MS = 60 * 60 * 1000; // 1 hour for rate-limited responses

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function getCacheStats(): { size: number; keys: string[] } {
  return { size: cache.size, keys: Array.from(cache.keys()) };
}

export function buildCacheKey(
  endpoint: string,
  params: Record<string, string | undefined>,
): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${endpoint}?${sorted}`;
}
