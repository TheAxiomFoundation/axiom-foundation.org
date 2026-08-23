import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getRuleEncodingMock,
  findEncodedDescendantsMock,
  fetchEncodedFileMock,
  mirrorFromMock,
} = vi.hoisted(() => ({
  getRuleEncodingMock: vi.fn(),
  findEncodedDescendantsMock: vi.fn(),
  fetchEncodedFileMock: vi.fn(),
  mirrorFromMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getRuleEncoding: getRuleEncodingMock,
  supabaseEncodings: { from: mirrorFromMock },
}));
vi.mock("@/lib/axiom/rulespec/repo-listing", () => ({
  findEncodedDescendants: findEncodedDescendantsMock,
  fetchEncodedFile: fetchEncodedFileMock,
}));

import { getSectionEncoding } from "./section-encoding";
import { parseRuleSpec } from "@/lib/axiom/rulespec/doc";

function ruleYaml(name: string, source: string): string {
  return [
    "format: rulespec/v1",
    "rules:",
    `  - name: ${name}`,
    "    kind: derived",
    `    source: ${source}`,
    "    versions:",
    "      - effective_from: '2026-01-01'",
    "        formula: 'x'",
  ].join("\n");
}

function encodingRow(filePath: string, content: string) {
  return {
    encoding_run_id: "run-1",
    citation: "26 USC 32",
    session_id: null,
    file_path: filePath,
    rulespec_content: content,
    final_scores: null,
    iterations: null,
    total_duration_ms: null,
    agent_type: "encoder",
    agent_model: null,
    data_source: null,
    has_issues: null,
    note: null,
    timestamp: null,
    encoder_version: null,
  };
}

const SECTION = "us/statute/26/32";

type MirrorResult = { data: unknown; error: unknown };
type MirrorQueryKind = "path" | "citedBy" | "ancestor";

const mirrorQueryCalls: Array<{
  kind: MirrorQueryKind;
  method: string;
  args: unknown[];
}> = [];

/** Chainable PostgREST stub that routes results by the query filter.
 *  This prevents path rows from accidentally being returned by the
 *  independent cited-by lookup. */
function mirrorChain(results: Record<MirrorQueryKind, MirrorResult>) {
  let kind: MirrorQueryKind = "path";
  const self: Record<string, unknown> = {};
  self.select = () => self;
  self.or = (...args: unknown[]) => {
    kind = "path";
    mirrorQueryCalls.push({ kind, method: "or", args });
    return self;
  };
  self.contains = (...args: unknown[]) => {
    kind = "citedBy";
    mirrorQueryCalls.push({ kind, method: "contains", args });
    return self;
  };
  self.in = (...args: unknown[]) => {
    kind = "ancestor";
    mirrorQueryCalls.push({ kind, method: "in", args });
    return self;
  };
  for (const method of ["order", "limit"]) {
    self[method] = (...args: unknown[]) => {
      mirrorQueryCalls.push({ kind, method, args });
      return self;
    };
  }
  self.then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise.resolve(results[kind]).then(resolve, reject);
  return self;
}

function configureMirror({
  path = { data: [], error: null },
  citedBy = { data: [], error: null },
  ancestor = { data: [], error: null },
}: Partial<Record<MirrorQueryKind, MirrorResult>> = {}) {
  const results = { path, citedBy, ancestor };
  mirrorFromMock.mockImplementation(() => mirrorChain(results));
}

function mirrorRows(
  rows: Array<{ citation_path: string; file_path: string; raw_yaml: string }>
) {
  configureMirror({ path: { data: rows, error: null } });
}

describe("getSectionEncoding", () => {
  beforeEach(() => {
    getRuleEncodingMock.mockReset();
    findEncodedDescendantsMock.mockReset();
    fetchEncodedFileMock.mockReset();
    mirrorFromMock.mockReset();
    mirrorQueryCalls.length = 0;
    // Default: mirror is empty → the legacy path drives the test.
    configureMirror();
  });

  it("passes the primary encoding through when there are no descendant files", async () => {
    const primary = encodingRow(
      "statutes/26/32.yaml",
      ruleYaml("eitc_amount", "26 USC 32(a)")
    );
    getRuleEncodingMock.mockResolvedValue(primary);
    findEncodedDescendantsMock.mockResolvedValue([]);

    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.encoding).toBe(primary);
    expect(result.fileAnchors).toEqual({});
    expect(result.citedByFiles).toEqual([]);
    expect(fetchEncodedFileMock).not.toHaveBeenCalled();
  });

  it("serves a lone descendant file directly when there is no primary (7/2017 layout)", async () => {
    getRuleEncodingMock.mockResolvedValue(null);
    findEncodedDescendantsMock.mockResolvedValue([
      {
        filePath: "statutes/7/2017/a.yaml",
        citationPath: "us/statute/7/2017/a",
        bucket: "statutes",
      },
    ]);
    fetchEncodedFileMock.mockResolvedValue({
      filePath: "statutes/7/2017/a.yaml",
      content: ruleYaml("snap_allotment", "7 USC 2017(a)"),
    });

    const result = await getSectionEncoding("rule-1", "us/statute/7/2017");
    expect(result.encoding?.file_path).toBe("statutes/7/2017/a.yaml");
    expect(result.encoding?.encoding_run_id).toBe(
      "github:statutes/7/2017/a.yaml"
    );
    expect(result.encoding?.rulespec_content).toContain("snap_allotment");
    expect(result.fileAnchors).toEqual({ snap_allotment: ["a"] });
  });

  it("merges primary and descendant rules into one parseable doc (26/32 layout)", async () => {
    getRuleEncodingMock.mockResolvedValue(
      encodingRow("statutes/26/32.yaml", ruleYaml("eitc_amount", "26 USC 32(a)"))
    );
    findEncodedDescendantsMock.mockResolvedValue([
      {
        filePath: "statutes/26/32/c/2.yaml",
        citationPath: "us/statute/26/32/c/2",
        bucket: "statutes",
      },
    ]);
    fetchEncodedFileMock.mockResolvedValue({
      filePath: "statutes/26/32/c/2.yaml",
      content: ruleYaml("earned_income", "26 USC 32(c)(2)"),
    });

    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.encoding?.encoding_run_id).toBe(
      `github:merged:${SECTION}`
    );
    expect(result.encoding?.file_path).toBe("statutes/26/32");
    const doc = parseRuleSpec(result.encoding!.rulespec_content!);
    expect(doc.parseErrors).toEqual([]);
    expect(doc.rules.map((rule) => rule.name)).toEqual([
      "eitc_amount",
      "earned_income",
    ]);
    expect(result.fileAnchors).toEqual({ earned_income: ["c"] });
    // Primary run metadata survives the merge.
    expect(result.encoding?.agent_type).toBe("encoder");
  });

  it("dedupes rules present in both primary and descendant files", async () => {
    getRuleEncodingMock.mockResolvedValue(
      encodingRow("statutes/26/32.yaml", ruleYaml("eitc_amount", "26 USC 32(a)"))
    );
    findEncodedDescendantsMock.mockResolvedValue([
      {
        filePath: "statutes/26/32/a.yaml",
        citationPath: "us/statute/26/32/a",
        bucket: "statutes",
      },
    ]);
    fetchEncodedFileMock.mockResolvedValue({
      filePath: "statutes/26/32/a.yaml",
      content: ruleYaml("eitc_amount", "26 USC 32(a)"),
    });

    const result = await getSectionEncoding("rule-1", SECTION);
    // Duplicate name adds no new rules → primary passes through.
    expect(result.encoding?.encoding_run_id).toBe("run-1");
    expect(result.fileAnchors).toEqual({ eitc_amount: ["a"] });
  });

  it("keeps the primary when every descendant fetch fails", async () => {
    const primary = encodingRow(
      "statutes/26/32.yaml",
      ruleYaml("eitc_amount", "26 USC 32(a)")
    );
    getRuleEncodingMock.mockResolvedValue(primary);
    findEncodedDescendantsMock.mockResolvedValue([
      {
        filePath: "statutes/26/32/c/2.yaml",
        citationPath: "us/statute/26/32/c/2",
        bucket: "statutes",
      },
    ]);
    fetchEncodedFileMock.mockRejectedValue(new Error("rate limited"));

    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.encoding).toBe(primary);
  });

  it("returns null encoding when nothing exists anywhere", async () => {
    getRuleEncodingMock.mockResolvedValue(null);
    findEncodedDescendantsMock.mockResolvedValue([]);
    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.encoding).toBeNull();
  });

  it("serves the mirror without touching legacy sources when synced", async () => {
    mirrorRows([
      {
        citation_path: SECTION,
        file_path: "statutes/26/32.yaml",
        raw_yaml: ruleYaml("eitc_amount", "26 USC 32(a)"),
      },
      {
        citation_path: `${SECTION}/c/2`,
        file_path: "statutes/26/32/c/2.yaml",
        raw_yaml: ruleYaml("earned_income", "26 USC 32(c)(2)"),
      },
    ]);

    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.encoding?.encoding_run_id).toBe(
      `github:merged:${SECTION}`
    );
    const doc = parseRuleSpec(result.encoding!.rulespec_content!);
    expect(doc.rules.map((rule) => rule.name)).toEqual([
      "eitc_amount",
      "earned_income",
    ]);
    expect(result.fileAnchors).toEqual({ earned_income: ["c"] });
    // Each rule's home file survives the merge.
    expect(result.ruleFiles).toEqual({
      eitc_amount: "statutes/26/32.yaml",
      earned_income: "statutes/26/32/c/2.yaml",
    });
    // Mirror hit → no telemetry lookup, no GitHub reads.
    expect(getRuleEncodingMock).not.toHaveBeenCalled();
    expect(findEncodedDescendantsMock).not.toHaveBeenCalled();
    expect(fetchEncodedFileMock).not.toHaveBeenCalled();
  });

  it("serves a lone mirror file directly with its real path", async () => {
    mirrorRows([
      {
        citation_path: "us/statute/7/2017/a",
        file_path: "statutes/7/2017/a.yaml",
        raw_yaml: ruleYaml("snap_allotment", "7 USC 2017(a)"),
      },
    ]);
    const result = await getSectionEncoding("rule-1", "us/statute/7/2017");
    expect(result.encoding?.file_path).toBe("statutes/7/2017/a.yaml");
    expect(result.encoding?.encoding_run_id).toBe(
      "github:statutes/7/2017/a.yaml"
    );
    expect(result.fileAnchors).toEqual({ snap_allotment: ["a"] });
    expect(result.ruleFiles).toEqual({
      snap_allotment: "statutes/7/2017/a.yaml",
    });
    expect(result.citedByFiles).toEqual([]);
  });

  it("merges cited-by rules with path-matched rules and marks their module", async () => {
    const policyCitation =
      "us/policy/usitc/us-tariff-duty/lines/generated/ch22";
    const policyFile =
      "policies/usitc/us-tariff-duty/lines/generated/ch22.yaml";
    configureMirror({
      path: {
        data: [
          {
            citation_path: SECTION,
            file_path: "statutes/26/32.yaml",
            raw_yaml: ruleYaml("eitc_amount", "26 USC 32(a)"),
          },
        ],
        error: null,
      },
      citedBy: {
        data: [
          {
            citation_path: policyCitation,
            file_path: policyFile,
            raw_yaml: ruleYaml("ch22_general_rate", "HTS 2203.00.00"),
          },
        ],
        error: null,
      },
    });

    const result = await getSectionEncoding("rule-1", SECTION);
    const doc = parseRuleSpec(result.encoding!.rulespec_content!);
    expect(doc.rules.map((rule) => rule.name)).toEqual([
      "eitc_amount",
      "ch22_general_rate",
    ]);
    expect(result.ruleFiles).toEqual({
      eitc_amount: "statutes/26/32.yaml",
      ch22_general_rate: policyFile,
    });
    expect(result.citedByFiles).toEqual([
      {
        citationPath: policyCitation,
        filePath: policyFile,
        ruleNames: ["ch22_general_rate"],
      },
    ]);
    expect(
      mirrorQueryCalls.filter((call) => call.kind === "citedBy")
    ).toEqual([
      {
        kind: "citedBy",
        method: "contains",
        args: ["source_citation_paths", [SECTION]],
      },
      {
        kind: "citedBy",
        method: "order",
        args: ["citation_path", { ascending: true }],
      },
      { kind: "citedBy", method: "limit", args: [60] },
    ]);
  });

  it("serves cited-by modules when the path range is empty", async () => {
    const tariffPath = "us/statute/hts/2203.00.00";
    const policyCitation =
      "us/policy/usitc/us-tariff-duty/lines/generated/ch22";
    const policyFile =
      "policies/usitc/us-tariff-duty/lines/generated/ch22.yaml";
    configureMirror({
      citedBy: {
        data: [
          {
            citation_path: policyCitation,
            file_path: policyFile,
            raw_yaml: ruleYaml("ch22_general_rate", "HTS 2203.00.00"),
          },
        ],
        error: null,
      },
    });

    const result = await getSectionEncoding("rule-1", tariffPath);
    expect(result.encodingRootPath).toBe(tariffPath);
    expect(
      parseRuleSpec(result.encoding!.rulespec_content!).rules.map(
        (rule) => rule.name
      )
    ).toEqual(["ch22_general_rate"]);
    expect(result.ruleFiles).toEqual({ ch22_general_rate: policyFile });
    expect(result.citedByFiles[0]).toEqual({
      citationPath: policyCitation,
      filePath: policyFile,
      ruleNames: ["ch22_general_rate"],
    });
    expect(getRuleEncodingMock).not.toHaveBeenCalled();
    expect(findEncodedDescendantsMock).not.toHaveBeenCalled();
  });

  it("dedupes files returned by both path and cited-by queries", async () => {
    const row = {
      citation_path: SECTION,
      file_path: "statutes/26/32.yaml",
      raw_yaml: ruleYaml("eitc_amount", "26 USC 32(a)"),
    };
    configureMirror({
      path: { data: [row], error: null },
      citedBy: { data: [row], error: null },
    });

    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.citedByFiles).toEqual([]);
    expect(result.encoding?.file_path).toBe("statutes/26/32.yaml");
    expect(
      parseRuleSpec(result.encoding!.rulespec_content!).rules.map(
        (rule) => rule.name
      )
    ).toEqual(["eitc_amount"]);
  });

  it("keeps the path-matched result when the cited-by query fails", async () => {
    const content = ruleYaml("eitc_amount", "26 USC 32(a)");
    configureMirror({
      path: {
        data: [
          {
            citation_path: SECTION,
            file_path: "statutes/26/32.yaml",
            raw_yaml: content,
          },
        ],
        error: null,
      },
      citedBy: { data: null, error: { message: "column unavailable" } },
    });

    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.encoding?.rulespec_content).toBe(content);
    expect(result.citedByFiles).toEqual([]);
    expect(result.ruleFiles).toEqual({
      eitc_amount: "statutes/26/32.yaml",
    });
    expect(getRuleEncodingMock).not.toHaveBeenCalled();
  });

  it("falls back to the legacy path when the mirror query fails", async () => {
    mirrorFromMock.mockImplementation(() => {
      throw new Error("schema missing");
    });
    const primary = encodingRow(
      "statutes/26/32.yaml",
      ruleYaml("eitc_amount", "26 USC 32(a)")
    );
    getRuleEncodingMock.mockResolvedValue(primary);
    findEncodedDescendantsMock.mockResolvedValue([]);
    const result = await getSectionEncoding("rule-1", SECTION);
    expect(result.encoding).toBe(primary);
  });
});


describe("ancestor walk-up (request deeper than the encoded file)", () => {
  it("serves the nearest ancestor module and reports its root path", async () => {
    // First query (at-or-below the deep path): nothing. Second query
    // (ancestor chain): the section-level 273/10 module.
    const sectionYaml = ruleYaml(
      "snap_calculated_monthly_allotment_before_minimums",
      "7 CFR 273.10(e)(2)(ii)(A)"
    );
    configureMirror({
      ancestor: {
        data: [
          {
            citation_path: "us/regulation/7/273/10",
            file_path: "regulations/7-cfr/273/10.yaml",
            raw_yaml: sectionYaml,
          },
        ],
        error: null,
      },
    });

    const result = await getSectionEncoding(
      "rule-1",
      "us/regulation/7/273/10/e/2/ii/A"
    );
    expect(result.encodingRootPath).toBe("us/regulation/7/273/10");
    expect(result.encoding?.file_path).toBe("regulations/7-cfr/273/10.yaml");
    expect(result.encoding?.rulespec_content).toContain(
      "snap_calculated_monthly_allotment_before_minimums"
    );
  });

  it("merges ancestor rules citing a deep path with the files below it", async () => {
    // /us/statute/26/32/c: earned_income lives in 32/c/2.yaml below the
    // path, eitc_qualifying_child cites 32(c)(3) from the section file
    // above it. Both must reach the rail, each with the right anchor.
    configureMirror({
      path: {
        data: [
          {
            citation_path: `${SECTION}/c/2`,
            file_path: "statutes/26/32/c/2.yaml",
            raw_yaml: ruleYaml("earned_income", "26 USC 32(c)(2)(A)"),
          },
        ],
        error: null,
      },
      ancestor: {
        data: [
          {
            citation_path: SECTION,
            file_path: "statutes/26/32.yaml",
            raw_yaml: [
              ruleYaml("eitc_qualifying_child", "26 USC 32(c)(3)"),
              "  - name: eitc_amount",
              "    kind: derived",
              "    source: 26 USC 32(a)",
              "    versions:",
              "      - effective_from: '2026-01-01'",
              "        formula: 'x'",
            ].join("\n"),
          },
        ],
        error: null,
      },
    });

    const result = await getSectionEncoding("rule-1", `${SECTION}/c`);
    const doc = parseRuleSpec(result.encoding!.rulespec_content!);
    expect(doc.rules.map((rule) => rule.name)).toEqual([
      "earned_income",
      "eitc_qualifying_child",
    ]);
    expect(result.fileAnchors).toEqual({
      earned_income: ["2"],
      eitc_qualifying_child: ["3"],
    });
    expect(result.ruleFiles).toEqual({
      earned_income: "statutes/26/32/c/2.yaml",
      eitc_qualifying_child: "statutes/26/32.yaml",
    });
    // The rules join at the requested path, not the ancestor's.
    expect(result.encodingRootPath).toBe(`${SECTION}/c`);
  });

  it("merges dotted CFR ancestor citations with deep descendant files", async () => {
    const regulation = "us/regulation/7/273/9";
    configureMirror({
      path: {
        data: [
          {
            citation_path: `${regulation}/d/6/iii`,
            file_path: "regulations/7-cfr/273/9/d/6/iii.yaml",
            raw_yaml: ruleYaml("homeless_shelter", "7 CFR 273.9(d)(6)(iii)"),
          },
        ],
        error: null,
      },
      ancestor: {
        data: [
          {
            citation_path: regulation,
            file_path: "regulations/7-cfr/273/9.yaml",
            raw_yaml: ruleYaml("standard_deduction", "7 CFR 273.9(d)(1)"),
          },
        ],
        error: null,
      },
    });

    const result = await getSectionEncoding("rule-1", `${regulation}/d`);
    const doc = parseRuleSpec(result.encoding!.rulespec_content!);
    expect(doc.rules.map((rule) => rule.name)).toEqual([
      "homeless_shelter",
      "standard_deduction",
    ]);
    expect(result.fileAnchors).toEqual({
      homeless_shelter: ["6"],
      standard_deduction: ["1"],
    });
  });

  it("keeps serving a lone descendant directly when the ancestor has no citing rules", async () => {
    configureMirror({
      path: {
        data: [
          {
            citation_path: `${SECTION}/c/2`,
            file_path: "statutes/26/32/c/2.yaml",
            raw_yaml: ruleYaml("earned_income", "26 USC 32(c)(2)(A)"),
          },
        ],
        error: null,
      },
      ancestor: {
        data: [
          {
            citation_path: SECTION,
            file_path: "statutes/26/32.yaml",
            raw_yaml: ruleYaml("eitc_amount", "26 USC 32(a)"),
          },
        ],
        error: null,
      },
    });

    const result = await getSectionEncoding("rule-1", `${SECTION}/c`);
    expect(result.encoding?.encoding_run_id).toBe(
      "github:statutes/26/32/c/2.yaml"
    );
    expect(result.fileAnchors).toEqual({ earned_income: ["2"] });
  });

  it("falls through to the legacy path when no ancestor file exists", async () => {
    configureMirror();
    getRuleEncodingMock.mockResolvedValue(null);
    findEncodedDescendantsMock.mockResolvedValue([]);
    const result = await getSectionEncoding("rule-1", "us/statute/26/32/a");
    expect(result.encoding).toBeNull();
    expect(result.encodingRootPath).toBeNull();
  });
});
