import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabaseEncodings: { from: mockFrom },
}));

import { fetchIndexedRuleSpecCandidates } from "./rulespec-index";

interface BuilderResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

/**
 * Chainable stand-in for the PostgREST query builder: every filter
 * method returns the builder, and awaiting it resolves the canned
 * result (the real builder is thenable the same way).
 */
function fakeBuilder(result: BuilderResult) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "textSearch", "limit", "in", "eq"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: BuilderResult) => unknown) =>
    Promise.resolve(result).then(resolve);
  return builder as Record<string, ReturnType<typeof vi.fn>> & {
    then: unknown;
  };
}

const ROW = {
  file_path: "policies/cdhs/snap/fy-2026-benefit-calculation.yaml",
  citation_path: "us-co/policy/cdhs/snap/fy-2026-benefit-calculation",
  bucket: "policies",
  jurisdiction: "us-co",
  raw_yaml: "format: rulespec/v1",
};

describe("fetchIndexedRuleSpecCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns [] without querying when there are no tokens", async () => {
    const result = await fetchIndexedRuleSpecCandidates([], new Set(), null);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("maps matched rows and applies jurisdiction and bucket filters", async () => {
    const builder = fakeBuilder({ data: [ROW], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await fetchIndexedRuleSpecCandidates(
      ["snap", "deduction"],
      new Set(["us-co"]),
      "policies"
    );

    expect(result).toEqual([
      {
        filePath: ROW.file_path,
        citationPath: ROW.citation_path,
        bucket: ROW.bucket,
        jurisdiction: ROW.jurisdiction,
        rawYaml: ROW.raw_yaml,
      },
    ]);
    expect(builder.textSearch).toHaveBeenCalledWith(
      "search_tsv",
      "snap | deduction"
    );
    expect(builder.in).toHaveBeenCalledWith("jurisdiction", ["us-co"]);
    expect(builder.eq).toHaveBeenCalledWith("bucket", "policies");
  });

  it("skips the filters when no jurisdiction hint or bucket is given", async () => {
    const builder = fakeBuilder({ data: [ROW], error: null });
    mockFrom.mockReturnValue(builder);

    await fetchIndexedRuleSpecCandidates(["snap"], new Set(), null);

    expect(builder.in).not.toHaveBeenCalled();
    expect(builder.eq).not.toHaveBeenCalled();
  });

  it("returns null on a query error so the caller falls back to GitHub", async () => {
    mockFrom.mockReturnValue(fakeBuilder({ data: null, error: { message: "boom" } }));

    expect(
      await fetchIndexedRuleSpecCandidates(["snap"], new Set(), null)
    ).toBeNull();
  });

  it("distinguishes an unpopulated index (null) from a true no-match ([])", async () => {
    // No matches, but the table has rows → genuine empty result.
    mockFrom
      .mockReturnValueOnce(fakeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(fakeBuilder({ count: 42, error: null }));
    expect(
      await fetchIndexedRuleSpecCandidates(["zzz"], new Set(), null)
    ).toEqual([]);

    // No matches and the table is empty → index not synced yet.
    mockFrom
      .mockReturnValueOnce(fakeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(fakeBuilder({ count: 0, error: null }));
    expect(
      await fetchIndexedRuleSpecCandidates(["zzz"], new Set(), null)
    ).toBeNull();
  });

  it("returns null when the client throws entirely", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("no client");
    });
    expect(
      await fetchIndexedRuleSpecCandidates(["snap"], new Set(), null)
    ).toBeNull();
  });

  it("normalises a null raw_yaml column", async () => {
    mockFrom.mockReturnValue(
      fakeBuilder({ data: [{ ...ROW, raw_yaml: null }], error: null })
    );
    const result = await fetchIndexedRuleSpecCandidates(
      ["snap"],
      new Set(),
      null
    );
    expect(result?.[0]?.rawYaml).toBeNull();
  });
});
