import { describe, expect, it } from "vitest";
import { buildUnifiedResults } from "./unified-results";
import type {
  AxiomSearchResults,
  EncodedSearchResult,
} from "@/lib/axiom/search";
import type { Program } from "@/lib/axiom/programs";
import type { SearchHit } from "@/lib/supabase";

const program: Program = {
  slug: "colorado-snap",
  displayName: "Colorado SNAP",
  aliases: ["co snap"],
  jurisdiction: "us-co",
  summary: "Colorado's state-administered SNAP program.",
  anchors: [],
};

const anchor = {
  role: "benefit_calculation" as const,
  citationPath: "us-co/policy/cdhs/snap/fy-2026-benefit-calculation",
  label: "Benefit calculation",
  displayCitation: "Colorado CDHS SNAP FY 2026",
};

function encodedHit(
  overrides: Partial<EncodedSearchResult> = {}
): EncodedSearchResult {
  return {
    filePath: "policies/cdhs/snap/fy-2026-benefit-calculation.yaml",
    citationPath: "us-co/policy/cdhs/snap/fy-2026-benefit-calculation",
    bucket: "policies",
    label: "CDHS SNAP FY 2026 Benefit Calculation",
    jurisdictionLabel: "Colorado",
    matchKind: "file",
    symbolMatches: [],
    fileSummary: null,
    score: 730,
    ...overrides,
  };
}

function corpusHit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    id: "hit-1",
    jurisdiction: "us",
    doc_type: "regulation",
    citation_path: "us/regulation/7/273/9",
    heading: "Income and deductions",
    snippet: "<mark>SNAP</mark> deductions",
    has_rulespec: false,
    rank: 0.1,
    ...overrides,
  };
}

function results(overrides: Partial<AxiomSearchResults>): AxiomSearchResults {
  return { query: "co snap", programs: [], encoded: [], corpus: [], ...overrides };
}

describe("buildUnifiedResults", () => {
  it("merges program and encoded rows for the same destination and ranks them first", () => {
    const unified = buildUnifiedResults(
      results({
        programs: [{ program, anchors: [anchor] }],
        encoded: [encodedHit()],
        corpus: [corpusHit()],
      })
    );

    expect(unified).toHaveLength(2);
    expect(unified[0]).toMatchObject({
      kind: "encoded",
      href: "/us-co/policy/cdhs/snap/fy-2026-benefit-calculation",
      programContext: { program: { slug: "colorado-snap" } },
    });
    // Fused score exceeds either lane alone.
    expect(unified[0].score).toBeGreaterThan(unified[1].score * 2);
    expect(unified[1].kind).toBe("corpus");
  });

  it("ranks symbol-match encodings above program shortcuts at equal rank", () => {
    const unified = buildUnifiedResults(
      results({
        programs: [
          {
            program,
            anchors: [{ ...anchor, citationPath: "us/regulation/7/273/9" }],
          },
        ],
        encoded: [encodedHit({ matchKind: "symbol" })],
      })
    );

    expect(unified[0].kind).toBe("encoded");
    expect(unified[1].kind).toBe("program");
  });

  it("orders within a lane by the lane's own ranking", () => {
    const unified = buildUnifiedResults(
      results({
        corpus: [
          corpusHit({ id: "a", citation_path: "us/statute/7/2011" }),
          corpusHit({ id: "b", citation_path: "us/statute/7/2014" }),
        ],
      })
    );

    expect(unified.map((row) => row.href)).toEqual([
      "/us/statute/7/2011",
      "/us/statute/7/2014",
    ]);
  });

  it("returns empty for empty results", () => {
    expect(buildUnifiedResults(results({}))).toEqual([]);
  });
});
