/**
 * Best-effort abuse protection for the public run endpoint: every
 * miss triggers an uncached hosted calculation. Per-instance state
 * (Fluid Compute reuses instances), not a distributed limiter — the
 * goal is blunting accidental loops and casual abuse, not surviving
 * a determined attack. Lives outside route.ts because Next route
 * modules only permit handler/config exports.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateBuckets = new Map<string, number[]>();

/** Canonical sample runs are deterministic per package — coalesce
 *  repeat executions for a short window. */
const RUN_CACHE_TTL_MS = 60_000;
const RUN_CACHE_MAX_ENTRIES = 64;
const runCache = new Map<string, { at: number; body: unknown }>();

/** Test hook: module-level state must reset between tests. */
export function _resetRunRouteState() {
  rateBuckets.clear();
  runCache.clear();
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(key) ?? []).filter(
    (at) => now - at < RATE_LIMIT_WINDOW_MS
  );
  if (rateBuckets.size > 1024) rateBuckets.clear();
  if (bucket.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateBuckets.set(key, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
  return false;
}

export function getCachedRun(key: string): unknown | null {
  const cached = runCache.get(key);
  if (!cached || Date.now() - cached.at >= RUN_CACHE_TTL_MS) return null;
  return cached.body;
}

export function setCachedRun(key: string, body: unknown) {
  if (runCache.size >= RUN_CACHE_MAX_ENTRIES) {
    const oldest = runCache.keys().next().value;
    if (oldest !== undefined) runCache.delete(oldest);
  }
  runCache.set(key, { at: Date.now(), body });
}
