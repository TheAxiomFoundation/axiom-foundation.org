import { describe, expect, it } from "vitest";
import type { Rule } from "@/lib/supabase";
import type { RuleReference } from "@/lib/supabase";
import {
  buildSectionToc,
  compareCitationPaths,
  mapRulesToSubsections,
  refsForChunk,
  relativeDesignator,
  splitBodyIntoSubsections,
  subtreeAnchor,
  type SectionProvision,
} from "./section-page";

const ROOT = "us/statute/26/32";

function provision(
  subPath: string,
  heading: string | null = null
): SectionProvision {
  const citationPath = `${ROOT}/${subPath}`;
  return {
    rule: { heading, citation_path: citationPath } as Rule,
    anchor: subtreeAnchor(ROOT, citationPath),
    designator: relativeDesignator(ROOT, citationPath),
    relativeDepth: subPath.split("/").length,
  };
}

describe("compareCitationPaths", () => {
  it("orders numeric segments numerically, not lexicographically", () => {
    expect(compareCitationPaths(`${ROOT}/a/2`, `${ROOT}/a/10`)).toBeLessThan(0);
    expect(compareCitationPaths(`${ROOT}/a/10`, `${ROOT}/a/2`)).toBeGreaterThan(
      0
    );
  });

  it("sorts parents before their descendants", () => {
    expect(compareCitationPaths(`${ROOT}/a`, `${ROOT}/a/1`)).toBeLessThan(0);
  });

  it("orders letter designators alphabetically", () => {
    const paths = [`${ROOT}/c`, `${ROOT}/a`, `${ROOT}/b`];
    expect(paths.sort(compareCitationPaths)).toEqual([
      `${ROOT}/a`,
      `${ROOT}/b`,
      `${ROOT}/c`,
    ]);
  });

  it("sorts USC-style lettered titles after their base number", () => {
    expect(
      compareCitationPaths("us/statute/25", "us/statute/25A")
    ).toBeLessThan(0);
  });
});

describe("subtreeAnchor", () => {
  it("joins the relative path with dashes", () => {
    expect(subtreeAnchor(ROOT, `${ROOT}/a/1/B`)).toBe("a-1-B");
  });

  it("returns empty string for paths outside the root", () => {
    expect(subtreeAnchor(ROOT, "us/statute/26/33/a")).toBe("");
    expect(subtreeAnchor(ROOT, ROOT)).toBe("");
  });
});

describe("relativeDesignator", () => {
  it("wraps each relative segment in parens", () => {
    expect(relativeDesignator(ROOT, `${ROOT}/a/1/B`)).toBe("(a)(1)(B)");
  });
});

describe("buildSectionToc", () => {
  it("nests entries under their parent anchors", () => {
    const toc = buildSectionToc([
      provision("a", "In general"),
      provision("a/1"),
      provision("a/2"),
      provision("b", "Percentages"),
    ]);
    expect(toc).toHaveLength(2);
    expect(toc[0].label).toBe("(a) In general");
    expect(toc[0].children.map((child) => child.anchor)).toEqual([
      "a-1",
      "a-2",
    ]);
    expect(toc[1].label).toBe("(b) Percentages");
  });

  it("cuts off below maxDepth", () => {
    const toc = buildSectionToc([
      provision("a"),
      provision("a/1"),
      provision("a/1/B"),
    ]);
    expect(toc[0].children).toHaveLength(1);
    expect(toc[0].children[0].children).toHaveLength(0);
  });

  it("promotes orphans whose parent is not in the TOC", () => {
    const toc = buildSectionToc([provision("a/1")]);
    expect(toc).toHaveLength(1);
    expect(toc[0].anchor).toBe("a-1");
  });

  it("labels heading-less entries with the designator alone", () => {
    const toc = buildSectionToc([provision("c")]);
    expect(toc[0].label).toBe("(c)");
  });
});

// Mirrors the corpus shape: each subsection is one flattened line
// with nested (1)/(A)/(i) markers inline, blank lines between
// subsections.
const SECTION_BODY = [
  "(a) Allowance of credit (1) In general In the case of an eligible individual, there shall be allowed a credit. (2) Limitation The amount shall not exceed the phaseout.",
  "",
  "(b) Percentages The credit percentage is determined under this table.",
  "",
  "(c) Definitions and special rules For purposes of this section— (1) Eligible individual (A) In general The term means any individual. (i) a reserved clause, and",
  "",
  "(d) Coordination with other credits",
].join("\n");

describe("splitBodyIntoSubsections", () => {
  it("chunks at top-level lowercase markers only", () => {
    const { intro, chunks } = splitBodyIntoSubsections(SECTION_BODY);
    expect(intro).toBeNull();
    expect(chunks.map((chunk) => chunk.anchor)).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps inline nested (1)/(A)/(i) markers inside their parent chunk", () => {
    const { chunks } = splitBodyIntoSubsections(SECTION_BODY);
    const c = chunks.find((chunk) => chunk.anchor === "c");
    expect(c?.text).toContain("(A) In general");
    expect(c?.text).toContain("(i) a reserved clause");
  });

  it("rejects markers that do not increase alphabetically", () => {
    const body = [
      "(a) First subsection text here.",
      "(c) Third subsection text here.",
      "(b) an out-of-order nested fragment at line start,",
      "(d) Fourth subsection text here.",
    ].join("\n");
    const { chunks } = splitBodyIntoSubsections(body);
    expect(chunks.map((chunk) => chunk.anchor)).toEqual(["a", "c", "d"]);
  });

  it("tolerates repealed-subsection gaps (§ 32 skips g and h)", () => {
    const body = ["a", "b", "c", "d", "e", "f", "i", "j"]
      .map((letter) => `(${letter}) Subsection ${letter} text.`)
      .join("\n");
    const { chunks } = splitBodyIntoSubsections(body);
    expect(chunks.map((chunk) => chunk.anchor)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "i",
      "j",
    ]);
  });

  it("cuts the label at the first nested marker on flattened lines", () => {
    const body = [
      "(a) Allowance of credit (1) In general In the case of an eligible individual…",
      "(b) Percentages (1) Percentages The credit percentage is…",
    ].join("\n");
    const { chunks } = splitBodyIntoSubsections(body);
    expect(chunks[0].label).toBe("(a) Allowance of credit");
    expect(chunks[1].label).toBe("(b) Percentages");
  });

  it("captures chapeau text before (a) as intro", () => {
    const body = `General rule for this section.\n(a) First one text.\n(b) Second one text.`;
    const { intro, chunks } = splitBodyIntoSubsections(body);
    expect(intro).toBe("General rule for this section.");
    expect(chunks).toHaveLength(2);
  });

  it("returns no chunks when only one marker matches", () => {
    const body = "(a) Lone subsection body text.";
    expect(splitBodyIntoSubsections(body).chunks).toHaveLength(0);
  });

  it("builds a truncated preview label", () => {
    const { chunks } = splitBodyIntoSubsections(SECTION_BODY);
    expect(chunks[0].label).toBe("(a) Allowance of credit");
    expect(chunks[1].label).toMatch(/^\(b\) Percentages The credit/);
  });

  it("continues past z with doubled letters", () => {
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    const body = [...letters, "aa"]
      .map((letter) => `(${letter}) Subsection ${letter} text.`)
      .join("\n");
    const { chunks } = splitBodyIntoSubsections(body);
    expect(chunks.at(-1)?.anchor).toBe("aa");
  });
});

describe("mapRulesToSubsections", () => {
  const yaml = [
    "format: rulespec/v1",
    "module:",
    "  name: eitc",
    "rules:",
    "  - name: eitc_phase_in_rates",
    "    kind: parameter",
    "    source: 26 USC 32(b)(1)",
    "    versions:",
    "      - effective_from: '2026-01-01'",
    "        values: {0: 0.0765}",
    "  - name: eitc_eligible",
    "    kind: formula",
    "    source: 26 USC 32(c)(1)(A)",
    "    versions:",
    "      - effective_from: '2026-01-01'",
    "        formula: 'age >= 19'",
    "  - name: dependent_rule",
    "    kind: formula",
    "    source: 26 USC 152(c)",
    "    versions:",
    "      - effective_from: '2026-01-01'",
    "        formula: 'x'",
  ].join("\n");

  it("maps rules to their top-level subsection anchors", () => {
    const links = mapRulesToSubsections("us/statute/26/32", yaml);
    expect(links.find((l) => l.name === "eitc_phase_in_rates")?.anchor).toBe(
      "b"
    );
    expect(links.find((l) => l.name === "eitc_eligible")?.anchor).toBe("c");
  });

  it("leaves rules citing other sections unanchored", () => {
    const links = mapRulesToSubsections("us/statute/26/32", yaml);
    expect(links.find((l) => l.name === "dependent_rule")?.anchor).toBeNull();
  });

  it("returns empty for null or unparseable content", () => {
    expect(mapRulesToSubsections("us/statute/26/32", null)).toEqual([]);
    expect(mapRulesToSubsections("us/statute/26/32", "not: yaml: [")).toEqual(
      []
    );
  });
});

describe("refsForChunk", () => {
  const ref = (citation_text: string, direction = "outgoing"): RuleReference =>
    ({
      direction,
      citation_text,
      pattern_kind: "test",
      confidence: 1,
      start_offset: 0,
      end_offset: citation_text.length,
      other_citation_path: "us/statute/26/1",
      other_provision_id: null,
      other_heading: null,
      target_resolved: true,
    }) as RuleReference;

  it("keeps outgoing refs whose text appears in the chunk", () => {
    const refs = [ref("section 1"), ref("section 2")];
    expect(refsForChunk(refs, "see section 1 for rates")).toEqual([
      refs[0],
    ]);
  });

  it("drops incoming refs", () => {
    expect(
      refsForChunk([ref("section 1", "incoming")], "see section 1")
    ).toEqual([]);
  });
});
