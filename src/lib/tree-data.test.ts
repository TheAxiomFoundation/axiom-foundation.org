import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbs,
  isUUID,
  getJurisdiction,
  JURISDICTIONS,
} from "./tree-data";

describe("JURISDICTIONS", () => {
  it("contains US, UK, Canada, and Ohio", () => {
    const ids = JURISDICTIONS.map((j) => j.id);
    expect(ids).toContain("us");
    expect(ids).toContain("uk");
    expect(ids).toContain("canada");
    expect(ids).toContain("us-oh");
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

describe("getJurisdiction", () => {
  it("returns config for known jurisdiction", () => {
    const us = getJurisdiction("us");
    expect(us).toEqual({
      id: "us",
      label: "United States",
      hasCitationPaths: true,
    });
  });

  it("returns undefined for unknown jurisdiction", () => {
    expect(getJurisdiction("mars")).toBeUndefined();
  });
});

describe("buildBreadcrumbs", () => {
  it("returns only Atlas for empty segments", () => {
    const crumbs = buildBreadcrumbs([]);
    expect(crumbs).toEqual([{ label: "Atlas", href: "/atlas" }]);
  });

  it("builds jurisdiction breadcrumb", () => {
    const crumbs = buildBreadcrumbs(["us"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United States", href: "/atlas/us" },
    ]);
  });

  it("builds full path breadcrumb", () => {
    const crumbs = buildBreadcrumbs(["us", "statute", "26", "1"]);
    expect(crumbs).toEqual([
      { label: "Atlas", href: "/atlas" },
      { label: "United States", href: "/atlas/us" },
      { label: "Statutes", href: "/atlas/us/statute" },
      { label: "Title 26", href: "/atlas/us/statute/26" },
      { label: "§ 1", href: "/atlas/us/statute/26/1" },
    ]);
  });

  it("uses raw segment for unknown jurisdiction", () => {
    const crumbs = buildBreadcrumbs(["mars"]);
    expect(crumbs[1].label).toBe("mars");
  });

  it("uses raw segment for unknown doc_type", () => {
    const crumbs = buildBreadcrumbs(["us", "regulation"]);
    expect(crumbs[2].label).toBe("regulation");
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
