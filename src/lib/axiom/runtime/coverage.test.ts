import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockList, mockGraph, mockConfigured } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGraph: vi.fn(),
  mockConfigured: vi.fn(),
}));

vi.mock("@/lib/axiom/runtime/api", () => ({
  listRuntimePackages: mockList,
  getProgramGraph: mockGraph,
  isRuntimeApiConfigured: mockConfigured,
}));

import { matchLegalId, getProvisionCoverage } from "./coverage";

function ruleNode(fileLegalId: string, name = "rule") {
  return {
    legalId: `${fileLegalId}#${name}`,
    name,
    fileLegalId,
    kind: "derived" as const,
    source: null,
    sourceUrl: null,
    ruleDeps: [],
    inputDeps: [],
  };
}

describe("matchLegalId", () => {
  it("matches a node inside the section and extracts the anchor", () => {
    expect(matchLegalId("us:statutes/7/2017/a", "us/statute/7/2017")).toEqual({
      anchor: "a",
    });
  });

  it("matches the section root with a null anchor", () => {
    expect(matchLegalId("us:statutes/26/32", "us/statute/26/32")).toEqual({
      anchor: null,
    });
  });

  it("tolerates singular/plural doc types both ways", () => {
    expect(
      matchLegalId("us-co:regulations/10-ccr-2506-1/4.207.3",
        "us-co/regulation/10-ccr-2506-1/4.207.3")
    ).toEqual({ anchor: null });
    expect(matchLegalId("us:statute/26/32/b", "us/statute/26/32")).toEqual({
      anchor: "b",
    });
  });

  it("rejects jurisdiction mismatches", () => {
    expect(matchLegalId("us-co:statutes/26/32", "us/statute/26/32")).toBeNull();
  });

  it("rejects other sections and shallower paths", () => {
    expect(matchLegalId("us:statutes/26/21", "us/statute/26/32")).toBeNull();
    expect(matchLegalId("us:statutes/26", "us/statute/26/32")).toBeNull();
    expect(matchLegalId("us:policies/usda/snap/x", "us/statute/7/2017")).toBeNull();
  });

  it("does not treat deeper numeric segments as anchors", () => {
    expect(matchLegalId("us:statutes/26/32/1", "us/statute/26/32")).toEqual({
      anchor: null,
    });
  });

  it("rejects malformed legal ids", () => {
    expect(matchLegalId("no-colon/path", "us/statute/26/32")).toBeNull();
    expect(matchLegalId(":statutes/26/32", "us/statute/26/32")).toBeNull();
  });
});

describe("getProvisionCoverage", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockGraph.mockReset();
    mockConfigured.mockReset();
    mockConfigured.mockReturnValue(true);
  });

  const snapPackage = {
    program_id: "co-snap",
    jurisdiction: "us-co",
    runtime_id: "r1",
    mode: "compiled" as const,
    status: "ready" as const,
    default_outputs: ["snap_allotment"],
  };

  it("returns [] without touching the API when unconfigured", async () => {
    mockConfigured.mockReturnValue(false);
    expect(await getProvisionCoverage("us/statute/7/2017")).toEqual([]);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("collects matching programs with anchors and rule names", async () => {
    mockList.mockResolvedValue([snapPackage]);
    mockGraph.mockResolvedValue({
      rules: [
        ruleNode("us:statutes/7/2017/a", "snap_allotment"),
        ruleNode("us:statutes/7/2017/e", "snap_net_income"),
        ruleNode("us:statutes/7/2014/a", "other_section_rule"),
        ruleNode("us:policies/usda/snap/fy-2026-cola/maximum-allotments", "param"),
      ],
      ownOutputs: [],
      terminalOutputs: [],
    });

    const coverage = await getProvisionCoverage("us/statute/7/2017");
    expect(coverage).toEqual([
      {
        jurisdiction: "us-co",
        programId: "co-snap",
        mode: "compiled",
        status: "ready",
        ruleCount: 2,
        anchors: ["a", "e"],
        ruleNames: ["snap_allotment", "snap_net_income"],
      },
    ]);
  });

  it("drops programs with no matching rules and sorts by rule count", async () => {
    const eitcPackage = { ...snapPackage, program_id: "us-eitc", jurisdiction: "us" };
    mockList.mockResolvedValue([snapPackage, eitcPackage]);
    mockGraph
      .mockResolvedValueOnce({
        rules: [ruleNode("us:statutes/26/32/a", "one")],
        ownOutputs: [],
        terminalOutputs: [],
      })
      .mockResolvedValueOnce({
        rules: [
          ruleNode("us:statutes/26/32/a", "eitc_a"),
          ruleNode("us:statutes/26/32/b", "eitc_b"),
        ],
        ownOutputs: [],
        terminalOutputs: [],
      });

    const coverage = await getProvisionCoverage("us/statute/26/32");
    expect(coverage.map((entry) => entry.programId)).toEqual([
      "us-eitc",
      "co-snap",
    ]);
  });

  it("survives graph fetch failures for individual packages", async () => {
    mockList.mockResolvedValue([snapPackage]);
    mockGraph.mockRejectedValue(new Error("boom"));
    expect(await getProvisionCoverage("us/statute/7/2017")).toEqual([]);
  });
});
