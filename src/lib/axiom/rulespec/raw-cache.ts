/**
 * Tiny module-level cache for raw GitHub YAML fetches. Three call
 * sites can ask for the same file inside a single page render —
 * ``synthesiseRuleFromCitationPath`` (tree), ``fetchRuleSpecFromGitHub``
 * (encoding panel), and the sibling ``.test.yaml`` fetcher — so
 * deduping cuts visible "loading…" time on every navigation.
 *
 * Server-side ``next: { revalidate }`` already covers the SSR path;
 * this layer is for the browser, where revalidate is a no-op.
 */

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  status: number;
  body: string;
  storedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

export interface CachedFetchResult {
  ok: boolean;
  status: number;
  body: string;
}

export async function cachedRawFetch(
  url: string,
  init?: RequestInit
): Promise<CachedFetchResult> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.storedAt < TTL_MS) {
    return { ok: hit.status >= 200 && hit.status < 300, status: hit.status, body: hit.body };
  }

  const pending = inflight.get(url);
  if (pending) {
    const entry = await pending;
    return { ok: entry.status >= 200 && entry.status < 300, status: entry.status, body: entry.body };
  }

  const promise = (async (): Promise<CacheEntry> => {
    try {
      const res = await fetch(url, init);
      const body = res.ok ? await res.text() : "";
      // Some test mocks omit ``status`` — treat ``ok`` as authoritative.
      const status = res.status || (res.ok ? 200 : 0);
      const entry: CacheEntry = { status, body, storedAt: Date.now() };
      cache.set(url, entry);
      return entry;
    } catch {
      // Bubble up as a cacheable miss so concurrent callers don't
      // each retry the same dead URL within the TTL.
      const entry: CacheEntry = { status: 0, body: "", storedAt: Date.now() };
      cache.set(url, entry);
      return entry;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  const entry = await promise;
  return { ok: entry.status >= 200 && entry.status < 300, status: entry.status, body: entry.body };
}

/** Test helper — flushes the cache so unit tests don't share state. */
export function _resetRawFetchCache(): void {
  cache.clear();
  inflight.clear();
}
