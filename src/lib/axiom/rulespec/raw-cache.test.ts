import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cachedRawFetch, _resetRawFetchCache } from "./raw-cache";

describe("cachedRawFetch", () => {
  beforeEach(() => {
    _resetRawFetchCache();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the body on success and caches it for the next caller", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "hello",
    });
    vi.stubGlobal("fetch", fetchMock);

    const a = await cachedRawFetch("https://example.com/x");
    const b = await cachedRawFetch("https://example.com/x");
    expect(a).toEqual({ ok: true, status: 200, body: "hello" });
    expect(b).toEqual({ ok: true, status: 200, body: "hello" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent in-flight requests for the same URL", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((r) => {
      resolveFetch = r;
    });
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal("fetch", fetchMock);

    const p1 = cachedRawFetch("https://example.com/y");
    const p2 = cachedRawFetch("https://example.com/y");
    // Resolve the underlying fetch only after both callers have registered.
    resolveFetch!({
      ok: true,
      status: 200,
      text: async () => "body",
    } as Response);
    const [a, b] = await Promise.all([p1, p2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.body).toBe("body");
    expect(b.body).toBe("body");
  });

  it("caches non-ok responses too so we don't pound a dead URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const a = await cachedRawFetch("https://example.com/missing");
    const b = await cachedRawFetch("https://example.com/missing");
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches network errors as a miss so concurrent callers don't all retry", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const a = await cachedRawFetch("https://example.com/dead");
    const b = await cachedRawFetch("https://example.com/dead");
    expect(a).toEqual({ ok: false, status: 0, body: "" });
    expect(b).toEqual({ ok: false, status: 0, body: "" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
