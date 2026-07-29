import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CertificationSnapshot } from "@/lib/axiom/certification";

const { readCertifiedNodesMock } = vi.hoisted(() => ({
  readCertifiedNodesMock: vi.fn(),
}));

vi.mock("@/lib/axiom/certification", () => ({
  readCertifiedNodes: readCertifiedNodesMock,
}));

import { GET } from "./route";

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
    kind: "parse",
    message: "Certification status warning: the mirror is malformed.",
  },
};

describe("GET /api/axiom/certified", () => {
  beforeEach(() => {
    readCertifiedNodesMock.mockReset();
  });

  it("returns the generated mirror snapshot with a short public cache", async () => {
    readCertifiedNodesMock.mockResolvedValue(READY);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await response.json()).toEqual(READY);
  });

  it("returns an operational failure without caching it", async () => {
    readCertifiedNodesMock.mockResolvedValue(UNAVAILABLE);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(UNAVAILABLE);
  });
});
