import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbs,
  isUUID,
  getJurisdiction,
  getCountry,
  getSubJurisdiction,
  resolveAtlasPath,
  hasEncodedDescendant,
  COUNTRIES,
} from "./tree-data";

describe("COUNTRIES", () => {
  it("contains US, UK, and Canada", () => {
    const slugs = COUNTRIES.map((c) => c.slug);
    expect(slugs).toContain("us");
    expect(slugs).toContain("uk");
    expect(slugs).toContain("canada");
  });

  it("US has Federal and Ohio sub-jurisdictions", () => {
    const us = COUNTRIES.find((c) => c.slug === "us");
    expect(us).toBeDefined();
    expect(us!.children).toHaveLength(2);
    expect(us!.children[0].slug).toBe("federal");
    expect(us!.children[0].dbJurisdictionId).toBe("us");
    expect(us!.children[1].slug).toBe("oh");
    expect(us!.children[1].dbJurisdictionId).toBe("us-oh");
  });

  it("UK has a single child (auto-skip)", () => {
    const uk = COUNTRIES.find((c) => c.slug === "uk");
    expect(uk).toBeDefined();
    expect(uk!.children).toHaveLength(1);
    expect(uk!.children[0].dbJurisdictionId).toBe("uk");
  });

  it("Canada has a single child (auto-skip)", () => {
    const ca = COUNTRIES.find((c) => c.slug === "canada");
    expect(ca).toBeDefined();
    expect(ca!.children).toHaveLength(1);
    expect(ca!.children[0].dbJurisdictionId).toBe("canada");
  });
});

describe("getCountry", () => {
  it("returns config for known country", () => {
    const us = getCountry("us");
    expect(us).toBeDefined();
    expect(us!.label).toBe("United States");
  });

  it("returns undefined for unknown country", () => {
    expect(getCountry("mars")).toBeUndefined();
  });
});

describe("getSubJurisdiction", () => {
  it("returns sub-jurisdiction for known slug", () => {
    const us = getCountry("us")!;
    const federal = getSubJurisdiction(us, "federal");
    expect(federal).toBeDefined();
    expect(federal!.dbJurisdictionId).toBe("us");
  });

  it("returns undefined for unknown slug", () => {
    const us = getCountry("us")!;
    expect(getSubJurisdiction(us, "nonexistent")).toBeUndefined();
  });
});

describe("getJurisdiction (backward compat)", () => {
  it("returns config for known jurisdiction", () => {
    const us = getJurisdiction("us");
    expect(us).toEqual({
      id: "us",
      label: "Federal",
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
  it("returns country-picker for empty segments", () => {
    const result = resolveAtlasPath([]);
    expect(result.phase).toBe("country-picker");
    expect(result.ruleSegments).toEqual([]);
  });

  it("returns country-picker for unknown country", () => {
    const result = resolveAtlasPath(["mars"]);
    expect(result.phase).toBe("country-picker");
  });

  it("returns sub-jurisdiction-picker for US (multi-child)", () => {
    const result = resolveAtlasPath(["us"]);
    expect(result.phase).toBe("sub-jurisdiction-picker");
    expect(result.country?.slug).toBe("us");
    expect(result.subJurisdiction).toBeUndefined();
  });

  it("returns rule phase for US/federal", () => {
    const result = resolveAtlasPath(["us", "federal"]);
    expect(result.phase).toBe("rule");
    expect(result.country?.slug).toBe("us");
    expect(result.subJurisdiction?.dbJurisdictionId).toBe("us");
    expect(result.ruleSegments).toEqual([]);
  });

  it("returns rule phase for US/federal with rule segments", () => {
    const result = resolveAtlasPath(["us", "federal", "statute", "26"]);
    expect(result.phase).toBe("rule");
    expect(result.subJurisdiction?.dbJurisdictionId).toBe("us");
    expect(result.ruleSegments).toEqual(["statute", "26"]);
  });

  it("returns rule phase for US/oh", () => {
    const result = resolveAtlasPath(["us", "oh", "statute"]);
    expect(result.phase).toBe("rule");
    expect(result.subJurisdiction?.dbJurisdictionId).toBe("us-oh");
    expect(result.ruleSegments).toEqual(["statute"]);
  });

  it("auto-skips UK (single child) to rule phase", () => {
    const result = resolveAtlasPath(["uk"]);
    expect(result.phase).toBe("rule");
    expect(result.country?.slug).toBe("uk");
    expect(result.subJurisdiction?.dbJurisdictionId).toBe("uk");
    expect(result.ruleSegments).toEqual([]);
  });

  it("auto-skips UK with rule segments", () => {
    const result = resolveAtlasPath(["uk", "statute"]);
    expect(result.phase).toBe("rule");
    expect(result.subJurisdiction?.dbJurisdictionId).toBe("uk");
    expect(result.ruleSegments).toEqual(["statute"]);
  });

  it("auto-skips Canada (single child) to rule phase", () => {
    const result = resolveAtlasPath(["canada"]);
    expect(result.phase).toBe("rule");
    expect(result.subJurisdiction?.dbJurisdictionId).toBe("canada");
    expect(result.ruleSegments).toEqual([]);
  });

  it("falls back to sub-jurisdiction-picker for unknown sub-jurisdiction", () => {
    const result = resolveAtlasPath(["us", "nonexistent"]);
    expect(result.phase).toBe("sub-jurisdiction-picker");
    expect(result.country?.slug).toBe("us");
  });
});

describe("buildBreadcrumbs", () => {
  it("returns only Atlas for empty segments", () => {
    const crumbs = buildBreadcrumbs([]);
    expect(crumbs).toEqual([{ label: "Atlas", href: "/atlas" }]);
  });

  it("builds country breadcrumb for multi-child country", () => {
    const crumbs = buildBreadcrumbs(["us"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United States", href: "/atlas/us" },
    ]);
  });

  it("builds country + sub-jurisdiction breadcrumb", () => {
    const crumbs = buildBreadcrumbs(["us", "federal"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United States", href: "/atlas/us" },
      { label: "Federal", href: "/atlas/us/federal" },
    ]);
  });

  it("builds full path for US/federal/statute/26/1", () => {
    const crumbs = buildBreadcrumbs([
      "us",
      "federal",
      "statute",
      "26",
      "1",
    ]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United States", href: "/atlas/us" },
      { label: "Federal", href: "/atlas/us/federal" },
      { label: "Statutes", href: "/atlas/us/federal/statute" },
      { label: "Title 26", href: "/atlas/us/federal/statute/26" },
      { label: "§ 1", href: "/atlas/us/federal/statute/26/1" },
    ]);
  });

  it("builds breadcrumb for single-child country (UK)", () => {
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
    const crumbs = buildBreadcrumbs(["us", "oh", "statute", "26"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United States", href: "/atlas/us" },
      { label: "Ohio", href: "/atlas/us/oh" },
      { label: "Statutes", href: "/atlas/us/oh/statute" },
      { label: "Title 26", href: "/atlas/us/oh/statute/26" },
    ]);
  });

  it("returns only Atlas for unknown country", () => {
    const crumbs = buildBreadcrumbs(["mars"]);
    expect(crumbs).toEqual([{ label: "Atlas", href: "/atlas" }]);
  });

  it("returns Atlas + country for unknown sub-jurisdiction in multi-child country", () => {
    const crumbs = buildBreadcrumbs(["us", "nonexistent"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United States", href: "/atlas/us" },
    ]);
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
