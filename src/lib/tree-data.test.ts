import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildBreadcrumbs,
  isUUID,
  getJurisdiction,
  getJurisdictionBySlug,
  resolveAtlasPath,
  hasEncodedDescendant,
  resolveDisplayContext,
  JURISDICTIONS,
} from "./tree-data";
import type { Rule } from "@/lib/supabase";
import { supabaseAkn } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabaseAkn: { from: vi.fn() },
  supabase: { from: vi.fn() },
}));

describe("JURISDICTIONS", () => {
  it("contains US Federal, Colorado, Ohio, UK, and Canada", () => {
    const slugs = JURISDICTIONS.map((j) => j.slug);
    expect(slugs).toContain("us");
    expect(slugs).toContain("us-co");
    expect(slugs).toContain("us-oh");
    expect(slugs).toContain("uk");
    expect(slugs).toContain("canada");
  });

  it("US Federal uses citation paths", () => {
    const us = JURISDICTIONS.find((j) => j.slug === "us");
    expect(us).toBeDefined();
    expect(us!.hasCitationPaths).toBe(true);
  });

  it("UK uses citation paths", () => {
    const uk = JURISDICTIONS.find((j) => j.slug === "uk");
    expect(uk).toBeDefined();
    expect(uk!.hasCitationPaths).toBe(true);
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

  it("marks UK as having citation paths and Canada as not", () => {
    expect(getJurisdiction("uk")?.hasCitationPaths).toBe(true);
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

  it("returns rule phase for Colorado", () => {
    const result = resolveAtlasPath(["us-co", "regulation"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("us-co");
    expect(result.ruleSegments).toEqual(["regulation"]);
  });

  it("returns rule phase for UK", () => {
    const result = resolveAtlasPath(["uk"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("uk");
    expect(result.ruleSegments).toEqual([]);
  });

  it("returns rule phase for UK with rule segments", () => {
    const result = resolveAtlasPath(["uk", "legislation"]);
    expect(result.phase).toBe("rule");
    expect(result.jurisdiction?.slug).toBe("uk");
    expect(result.ruleSegments).toEqual(["legislation"]);
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

  it("formats nested statute breadcrumbs with parenthetical subsections", () => {
    const crumbs = buildBreadcrumbs(["us", "statute", "26", "24", "d", "1", "A"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "US Federal", href: "/atlas/us" },
      { label: "Statutes", href: "/atlas/us/statute" },
      { label: "Title 26", href: "/atlas/us/statute/26" },
      { label: "§ 24", href: "/atlas/us/statute/26/24" },
      { label: "(d)", href: "/atlas/us/statute/26/24/d" },
      { label: "(1)", href: "/atlas/us/statute/26/24/d/1" },
      { label: "(A)", href: "/atlas/us/statute/26/24/d/1/A" },
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
    const crumbs = buildBreadcrumbs(["uk", "legislation", "uksi", "2013", "376"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United Kingdom", href: "/atlas/uk" },
      { label: "Legislation", href: "/atlas/uk/legislation" },
      { label: "UK Statutory Instruments", href: "/atlas/uk/legislation/uksi" },
      { label: "2013", href: "/atlas/uk/legislation/uksi/2013" },
      { label: "376", href: "/atlas/uk/legislation/uksi/2013/376" },
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

  it("builds breadcrumb for Colorado regulation path", () => {
    const crumbs = buildBreadcrumbs(["us-co", "regulation", "9-CCR-2503-6", "3.606.1", "I"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "Colorado", href: "/atlas/us-co" },
      { label: "Regulations", href: "/atlas/us-co/regulation" },
      { label: "9 CCR 2503-6", href: "/atlas/us-co/regulation/9-CCR-2503-6" },
      { label: "§ 3.606.1", href: "/atlas/us-co/regulation/9-CCR-2503-6/3.606.1" },
      { label: "(I)", href: "/atlas/us-co/regulation/9-CCR-2503-6/3.606.1/I" },
    ]);
  });

  it("builds breadcrumb for Colorado statute path", () => {
    const crumbs = buildBreadcrumbs(["us-co", "statute", "crs", "26-2-703", "2.5"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "Colorado", href: "/atlas/us-co" },
      { label: "Statutes", href: "/atlas/us-co/statute" },
      { label: "Colorado Revised Statutes", href: "/atlas/us-co/statute/crs" },
      { label: "§ 26-2-703", href: "/atlas/us-co/statute/crs/26-2-703" },
      { label: "(2.5)", href: "/atlas/us-co/statute/crs/26-2-703/2.5" },
    ]);
  });

  it("returns only Atlas for unknown jurisdiction", () => {
    const crumbs = buildBreadcrumbs(["mars"]);
    expect(crumbs).toEqual([{ label: "Atlas", href: "/atlas" }]);
  });

  it("uses raw segment for unknown doc_type", () => {
    const crumbs = buildBreadcrumbs(["uk", "regulation"]);
    expect(crumbs[2].label).toBe("Regulation");
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

const mockRule = (overrides: Partial<Rule> = {}): Rule => ({
  id: "test-id",
  jurisdiction: "us",
  doc_type: "statute",
  parent_id: null,
  level: 0,
  ordinal: null,
  heading: null,
  body: null,
  effective_date: null,
  repeal_date: null,
  source_url: null,
  source_path: null,
  citation_path: null,
  rac_path: null,
  has_rac: false,
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("resolveDisplayContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns self as displayRoot with empty children for root-level node", async () => {
    const rule = mockRule({ id: "root-1", parent_id: null });

    const result = await resolveDisplayContext(rule);

    expect(result.rule).toEqual(rule);
    expect(result.parentBody).toBeNull();
    expect(result.siblings).toEqual([rule]);
    expect(result.targetIndex).toBe(0);
  });

  it("fetches parent and siblings for leaf with parent", async () => {
    const parentRule = mockRule({ id: "parent-1", heading: "Parent" });
    const sibling1 = mockRule({ id: "sib-1", parent_id: "parent-1", ordinal: 1 });
    const sibling2 = mockRule({ id: "sib-2", parent_id: "parent-1", ordinal: 2 });
    const leaf = mockRule({ id: "leaf-1", parent_id: "parent-1", ordinal: 3 });

    const mockSingle = vi.fn().mockResolvedValue({ data: parentRule, error: null });
    const mockEqParent = vi.fn().mockReturnValue({ single: mockSingle });
    const mockOrder = vi.fn().mockResolvedValue({
      data: [sibling1, sibling2, leaf],
      error: null,
    });
    const mockEqSiblings = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn((col: string, val: string) => {
        if (col === "id") return mockEqParent(col, val);
        if (col === "parent_id") return mockEqSiblings(col, val);
        return { single: mockSingle };
      }),
    });
    vi.mocked(supabaseAkn.from).mockReturnValue({ select: mockSelect } as any);

    const result = await resolveDisplayContext(leaf);

    expect(result.rule).toEqual(leaf);
    expect(result.parentBody).toBeNull(); // parentRule has no body
    expect(result.siblings).toEqual([sibling1, sibling2, leaf]);
    expect(result.targetIndex).toBe(2);
  });

  it("falls back to self when parent fetch fails", async () => {
    const leaf = mockRule({ id: "leaf-1", parent_id: "parent-1" });

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } });
    const mockEqParent = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ single: mockSingle }),
    });
    vi.mocked(supabaseAkn.from).mockReturnValue({ select: mockSelect } as any);

    const result = await resolveDisplayContext(leaf);

    expect(result.rule).toEqual(leaf);
    expect(result.parentBody).toBeNull();
    expect(result.siblings).toEqual([leaf]);
    expect(result.targetIndex).toBe(0);
  });

  it("returns children ordered by ordinal for multiple siblings", async () => {
    const parentRule = mockRule({ id: "parent-1" });
    const child1 = mockRule({ id: "c1", parent_id: "parent-1", ordinal: 1 });
    const child3 = mockRule({ id: "c3", parent_id: "parent-1", ordinal: 3 });
    const child2 = mockRule({ id: "c2", parent_id: "parent-1", ordinal: 2 });
    const leaf = mockRule({ id: "c2", parent_id: "parent-1", ordinal: 2 });

    const mockSingle = vi.fn().mockResolvedValue({ data: parentRule, error: null });
    const mockOrder = vi.fn().mockResolvedValue({
      data: [child1, child2, child3],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn((col: string) => {
        if (col === "id") return { single: mockSingle };
        if (col === "parent_id") return { order: mockOrder };
        return { single: mockSingle };
      }),
    });
    vi.mocked(supabaseAkn.from).mockReturnValue({ select: mockSelect } as any);

    const result = await resolveDisplayContext(leaf);

    expect(result.siblings).toEqual([child1, child2, child3]);
    expect(result.siblings[0].ordinal).toBe(1);
    expect(result.siblings[1].ordinal).toBe(2);
    expect(result.siblings[2].ordinal).toBe(3);
  });

  it("falls back to empty siblings when siblings query returns null data", async () => {
    const parentRule = mockRule({ id: "parent-1", body: "intro text" });
    const leaf = mockRule({ id: "leaf-1", parent_id: "parent-1" });

    const mockSingle = vi.fn().mockResolvedValue({ data: parentRule, error: null });
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn((col: string) => {
        if (col === "id") return { single: mockSingle };
        if (col === "parent_id") return { order: mockOrder };
        return { single: mockSingle };
      }),
    });
    vi.mocked(supabaseAkn.from).mockReturnValue({ select: mockSelect } as any);

    const result = await resolveDisplayContext(leaf);

    expect(result.siblings).toEqual([]);
    expect(result.targetIndex).toBe(0);
    expect(result.parentBody).toBe("intro text");
  });

  it("defaults targetIndex to 0 when leaf not found in siblings", async () => {
    const parentRule = mockRule({ id: "parent-1" });
    const otherChild = mockRule({ id: "other-1", parent_id: "parent-1", ordinal: 1 });
    const leaf = mockRule({ id: "leaf-missing", parent_id: "parent-1" });

    const mockSingle = vi.fn().mockResolvedValue({ data: parentRule, error: null });
    const mockOrder = vi.fn().mockResolvedValue({ data: [otherChild], error: null });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn((col: string) => {
        if (col === "id") return { single: mockSingle };
        if (col === "parent_id") return { order: mockOrder };
        return { single: mockSingle };
      }),
    });
    vi.mocked(supabaseAkn.from).mockReturnValue({ select: mockSelect } as any);

    const result = await resolveDisplayContext(leaf);

    expect(result.targetIndex).toBe(0);
    expect(result.siblings).toEqual([otherChild]);
  });
});
