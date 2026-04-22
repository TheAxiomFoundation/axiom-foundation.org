import { describe, it, expect } from "vitest";
import { findPrograms, findProgramBySlug, PROGRAM_SEED } from "./index";

describe("program registry seed", () => {
  it("has unique slugs", () => {
    const slugs = PROGRAM_SEED.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every anchor has a non-empty citation_path", () => {
    for (const program of PROGRAM_SEED) {
      for (const anchor of program.anchors) {
        expect(anchor.citationPath.length).toBeGreaterThan(0);
        expect(anchor.citationPath.startsWith(program.jurisdiction)).toBe(
          true
        );
      }
    }
  });

  it("every program has at least one anchor", () => {
    for (const program of PROGRAM_SEED) {
      expect(program.anchors.length).toBeGreaterThan(0);
    }
  });
});

describe("findPrograms", () => {
  it("ranks exact alias match first", () => {
    const hits = findPrograms("snap");
    expect(hits[0]?.slug).toBe("snap");
  });

  it("matches acronyms case-insensitively", () => {
    expect(findPrograms("SNAP")[0]?.slug).toBe("snap");
    expect(findPrograms("EITC")[0]?.slug).toBe("eitc");
  });

  it("finds programs by colloquial alias", () => {
    expect(findPrograms("food stamps")[0]?.slug).toBe("snap");
    expect(findPrograms("obamacare")[0]?.slug).toBe("aca-ptc");
  });

  it("matches by display name prefix", () => {
    const hits = findPrograms("universal");
    expect(hits[0]?.slug).toBe("universal-credit");
  });

  it("matches by display name substring", () => {
    const hits = findPrograms("tax credit");
    const slugs = hits.map((h) => h.slug);
    expect(slugs).toContain("eitc");
    expect(slugs).toContain("ctc");
    expect(slugs).toContain("aca-ptc");
  });

  it("returns empty for empty input", () => {
    expect(findPrograms("")).toEqual([]);
    expect(findPrograms("   ")).toEqual([]);
  });

  it("returns empty for no-match input", () => {
    expect(findPrograms("banana welfare system")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(findPrograms("tax", 2)).toHaveLength(2);
  });
});

describe("findProgramBySlug", () => {
  it("finds known programs", () => {
    expect(findProgramBySlug("snap")?.slug).toBe("snap");
  });

  it("returns null for unknown slug", () => {
    expect(findProgramBySlug("nonexistent")).toBeNull();
  });
});
