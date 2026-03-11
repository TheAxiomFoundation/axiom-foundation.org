import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbs,
  isUUID,
  getJurisdiction,
  getJurisdictionBySlug,
  resolveAtlasPath,
  hasEncodedDescendant,
  JURISDICTIONS,
} from "./tree-data";

describe("JURISDICTIONS", () => {
  it("contains US Federal, Ohio, UK, and Canada", () => {
    const slugs = JURISDICTIONS.map((j) => j.slug);
    expect(slugs).toContain("us");
    expect(slugs).toContain("us-oh");
    expect(slugs).toContain("uk");
    expect(slugs).toContain("canada");
  });

  it("US Federal uses citation paths", () => {
    const us = JURISDICTIONS.find((j) => j.slug === "us");
    expect(us).toBeDefined();
    expect(us!.hasCitationPaths).toBe(true);
  });

  it("UK does not use citation paths", () => {
    const uk = JURISDICTIONS.find((j) => j.slug === "uk");
    expect(uk).toBeDefined();
    expect(uk!.hasCitationPaths).toBe(false);
  });
});

describe("getJurisdictionBySlug", () => {
  it("returns config for known jurisdiction", () => {
    const us = getJurisdictionBySlug("us");
    expect(us).toBeDefined();
    expect(us!.label).toBe("US Federal");
  });

  it("returns undefined for unknown jurisdiction", () => {
    expect(getJurisdictionBySlug("mars")).toBeUndefined();
  });
});

describe("getJurisdiction (backward compat)", () => {
  it("returns config for known jurisdiction", () => {
    const us = getJurisdiction("us");
    expect(us).toEqual({
      id: "us",
      label: "US Federal",
      hasCitationPaths: true,
    });
  });

  it("returns config for state jurisdiction", () => {
    const oh = getJurisdiction("us-oh");
    expect(oh).toEqual({
      id: "us-oh",
      label: "Ohio",
      hasCitationPaths: true,
    });
  });

  it("returns undefined for unknown jurisdiction", () => {
    expect(getJurisdiction("mars")).toBeUndefined();
  });

  it("marks US and Ohio as having citation paths", () => {
    expect(getJurisdiction("us")?.hasCitationPaths).toBe(true);
    expect(getJurisdiction("us-oh")?.hasCitationPaths).toBe(true);
  });

  it("marks UK and Canada as not having citation paths", () => {
    expect(getJurisdiction("uk")?.hasCitationPaths).toBe(false);
    expect(getJurisdiction("canada")?.hasCitationPaths).toBe(false);
  });
});

describe("resolveAtlasPath", () => {
  it("returns jurisdiction-picker for empty segments", () => {
    const result = resolveAtlasPath([]);
    expect(result.phase).toBe("jurisdiction-picker");
    expect(result.ruleSegments).toEqual([]);
  });

  it("returns jurisdiction-picker for unknown jurisdiction", () => {
    const result = resolveAtlasPath(["mars"]);
    expect(result.phase).toBe("jurisdiction-picker");
  });

  it("returns rule phase for US", () => {
    const result = resolveAtlasPath(["us"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("us");
    expect(result.ruleSegments).toEqual([]);
  });

  it("returns rule phase for US with rule segments", () => {
    const result = resolveAtlasPath(["us", "statute", "26"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("us");
    expect(result.ruleSegments).toEqual(["statute", "26"]);
  });

  it("returns rule phase for Ohio", () => {
    const result = resolveAtlasPath(["us-oh", "statute"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("us-oh");
    expect(result.ruleSegments).toEqual(["statute"]);
  });

  it("returns rule phase for UK", () => {
    const result = resolveAtlasPath(["uk"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("uk");
    expect(result.ruleSegments).toEqual([]);
  });

  it("returns rule phase for UK with rule segments", () => {
    const result = resolveAtlasPath(["uk", "statute"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("uk");
    expect(result.ruleSegments).toEqual(["statute"]);
  });

  it("returns rule phase for Canada", () => {
    const result = resolveAtlasPath(["canada"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("canada");
    expect(result.ruleSegments).toEqual([]);
  });
});

describe("buildBreadcrumbs", () => {
  it("returns only Atlas for empty segments", () => {
    const crumbs = buildBreadcrumbs([]);
    expect(crumbs).toEqual([{ label: "Atlas", href: "/atlas" }]);
  });

  it("builds jurisdiction breadcrumb for US", () => {
    const crumbs = buildBreadcrumbs(["us"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "US Federal", href: "/atlas/us" },
    ]);
  });

  it("builds full path for US/statute/26/1", () => {
    const crumbs = buildBreadcrumbs(["us", "statute", "26", "1"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "US Federal", href: "/atlas/us" },
      { label: "Statutes", href: "/atlas/us/statute" },
      { label: "Title 26", href: "/atlas/us/statute/26" },
      { label: "§ 1", href: "/atlas/us/statute/26/1" },
    ]);
  });

  it("builds breadcrumb for UK", () => {
    const crumbs = buildBreadcrumbs(["uk"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United Kingdom", href: "/atlas/uk" },
    ]);
  });

  it("builds breadcrumb for UK with rule segments", () => {
    const crumbs = buildBreadcrumbs(["uk", "statute"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United Kingdom", href: "/atlas/uk" },
      { label: "Statutes", href: "/atlas/uk/statute" },
    ]);
  });

  it("builds breadcrumb for Ohio path", () => {
    const crumbs = buildBreadcrumbs(["us-oh", "statute", "26"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "Ohio", href: "/atlas/us-oh" },
      { label: "Statutes", href: "/atlas/us-oh/statute" },
      { label: "Title 26", href: "/atlas/us-oh/statute/26" },
    ]);
  });

  it("returns only Atlas for unknown jurisdiction", () => {
    const crumbs = buildBreadcrumbs(["mars"]);
    expect(crumbs).toEqual([{ label: "Atlas", href: "/atlas" }]);
  });

  it("uses raw segment for unknown doc_type", () => {
    const crumbs = buildBreadcrumbs(["uk", "regulation"]);
    expect(crumbs[2].label).toBe("regulation");
  });
});

describe("hasEncodedDescendant", () => {
  const paths = new Set(["statute/26/1/j/2", "statute/26/24/a", "statute/5/1"]);

  it("returns true for exact match", () => {
    expect(hasEncodedDescendant(paths, "statute/26/1/j/2")).toBe(true);
  });

  it("returns true for ancestor prefix", () => {
    expect(hasEncodedDescendant(paths, "statute/26")).toBe(true);
    expect(hasEncodedDescendant(paths, "statute/26/1")).toBe(true);
    expect(hasEncodedDescendant(paths, "statute/26/1/j")).toBe(true);
  });

  it("returns false when no encoded descendant exists", () => {
    expect(hasEncodedDescendant(paths, "statute/7")).toBe(false);
    expect(hasEncodedDescendant(paths, "statute/26/2")).toBe(false);
  });

  it("returns false for empty set", () => {
    expect(hasEncodedDescendant(new Set(), "statute/26")).toBe(false);
  });

  it("does not match partial segment names", () => {
    // "statute/26" should not match "statute/260/..."
    const testPaths = new Set(["statute/260/1"]);
    expect(hasEncodedDescendant(testPaths, "statute/26")).toBe(false);
  });
});

describe("isUUID", () => {
  it("detects valid UUIDs", () => {
    expect(isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
  });

  it("rejects non-UUIDs", () => {
    expect(isUUID("us")).toBe(false);
    expect(isUUID("statute")).toBe(false);
    expect(isUUID("26")).toBe(false);
    expect(isUUID("not-a-uuid-at-all")).toBe(false);
    expect(isUUID("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });
});
