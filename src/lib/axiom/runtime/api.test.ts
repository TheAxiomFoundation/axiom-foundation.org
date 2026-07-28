import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isRuntimeApiConfigured,
  listRuntimePackages,
  getProgramGraph,
} from "./api";

function okEnvelope(data: unknown) {
  return {
    ok: true,
    json: async () => ({ status: "ok", data }),
  };
}

describe("runtime api client", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is unconfigured without a key or base override and makes no requests", async () => {
    vi.stubEnv("AXIOM_RUNTIME_API_KEY", "");
    vi.stubEnv("AXIOM_RUNTIME_API_BASE", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(isRuntimeApiConfigured()).toBe(false);
    expect(await listRuntimePackages()).toEqual([]);
    expect(await getProgramGraph("us-co", "co-snap")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a keyless base override (local axiom-api) as configured and omits the auth header", async () => {
    vi.stubEnv("AXIOM_RUNTIME_API_KEY", "");
    vi.stubEnv("AXIOM_RUNTIME_API_BASE", "http://localhost:8787/v1");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okEnvelope({ packages: [] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(isRuntimeApiConfigured()).toBe(true);
    await listRuntimePackages();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/runtime/packages");
    expect(init.headers).toBeUndefined();
  });

  it("lists packages, unwrapping the success envelope", async () => {
    vi.stubEnv("AXIOM_RUNTIME_API_KEY", "test-key");
    const packages = [
      {
        program_id: "co-snap",
        jurisdiction: "us-co",
        runtime_id: "r1",
        mode: "compiled",
        status: "ready",
        default_outputs: ["snap_allotment"],
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(okEnvelope({ packages }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await listRuntimePackages()).toEqual(packages);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/runtime/packages");
    expect(init.headers["x-api-key"]).toBe("test-key");
  });

  it("respects AXIOM_RUNTIME_API_BASE and encodes path params", async () => {
    vi.stubEnv("AXIOM_RUNTIME_API_KEY", "test-key");
    vi.stubEnv("AXIOM_RUNTIME_API_BASE", "https://example.test/v1/");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okEnvelope({ graph: { rules: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await getProgramGraph("us-co", "co snap");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://example.test/v1/runtime/packages/us-co/co%20snap/graph"
    );
  });

  it("returns empty results on HTTP errors", async () => {
    vi.stubEnv("AXIOM_RUNTIME_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );
    expect(await listRuntimePackages()).toEqual([]);
    expect(await getProgramGraph("us", "eitc")).toBeNull();
  });

  it("returns empty results on transport failure or bad envelope", async () => {
    vi.stubEnv("AXIOM_RUNTIME_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await listRuntimePackages()).toEqual([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "error" }),
      })
    );
    expect(await getProgramGraph("us", "eitc")).toBeNull();
  });
});
