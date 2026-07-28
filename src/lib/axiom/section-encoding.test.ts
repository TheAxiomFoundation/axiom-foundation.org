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

/** Chainable PostgREST stub: builder methods return the chain, the
 *  chain is thenable with the given result. */
function mirrorChain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};
  for (const method of ["select", "or", "limit"]) {
    self[method] = () => self;
  }
  self.then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return self;
}

function mirrorRows(
  rows: Array<{ citation_path: string; file_path: string; raw_yaml: string }>
) {
  mirrorFromMock.mockReturnValue(mirrorChain({ data: rows, error: null }));
}

describe("getSectionEncoding", () => {
  beforeEach(() => {
    getRuleEncodingMock.mockReset();
    findEncodedDescendantsMock.mockReset();
    fetchEncodedFileMock.mockReset();
    mirrorFromMock.mockReset();
    // Default: mirror is empty → the legacy path drives the test.
    mirrorRows([]);
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
