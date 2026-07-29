import { afterEach, describe, expect, it, vi } from "vitest";
import type { CertificationSnapshot } from "@/lib/axiom/certification";
import { fetchCertificationSnapshot } from "./certification-client";

const READY: CertificationSnapshot = {
  state: "ready",
  ledger: {
    schema: "axiom.certified_nodes.v1",
    generated: true,
    as_of: "2026-07-27",
    nodes: [],
  },
  warning: null,
};

const UNAVAILABLE: CertificationSnapshot = {
  state: "unavailable",
  ledger: null,
  warning: {
    kind: "missing",
    message: "The certification ledger mirror is unavailable.",
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchCertificationSnapshot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts an exact ready snapshot from the local endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(READY));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCertificationSnapshot()).resolves.toEqual(READY);
    expect(fetchMock).toHaveBeenCalledWith("/api/axiom/certified", {
      headers: { accept: "application/json" },
    });
  });

  it("preserves a valid operational warning from a 503 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(UNAVAILABLE, 503))
    );

    await expect(fetchCertificationSnapshot()).resolves.toEqual(UNAVAILABLE);
  });

  it("fails closed when the request cannot be completed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const snapshot = await fetchCertificationSnapshot();

    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.ledger).toBeNull();
    expect(snapshot.warning?.kind).toBe("missing");
    expect(snapshot.warning?.message).toContain("fail-closed");
  });

  it("fails closed when the response is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 200 }))
    );

    const snapshot = await fetchCertificationSnapshot();

    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.warning?.kind).toBe("parse");
  });

  it("never promotes malformed ready data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...READY,
          ledger: {
            ...READY.ledger,
            nodes: [
              {
                node: "us:test#amount",
                label: "Amount",
                provision: "us:test",
                corpus_citation_path: "test.md",
                certified_at: "2026-07-27T00:00:00Z",
                harness: { run: "run", certify_check: "check" },
                pinned: {
                  rulespec_us: "a",
                  corpus: "b",
                  engine: "c",
                  artifact: "d",
                },
                criteria: {
                  provision_rooted: { holds: true, evidence: "a" },
                  conformant: { holds: true, evidence: "b" },
                  exercised: { holds: true, evidence: "c" },
                  closed: { holds: false, evidence: "d" },
                  executable: { holds: true, evidence: "e" },
                },
              },
            ],
          },
        })
      )
    );

    const snapshot = await fetchCertificationSnapshot();

    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.warning?.kind).toBe("schema");
  });

  it("does not accept a ready snapshot delivered with a failure status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(READY, 503))
    );

    const snapshot = await fetchCertificationSnapshot();

    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.warning?.kind).toBe("schema");
  });
});
