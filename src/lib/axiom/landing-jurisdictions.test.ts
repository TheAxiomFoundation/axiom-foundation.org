import { describe, expect, it } from "vitest";

import { getLandingJurisdictions } from "./landing-jurisdictions";

describe("getLandingJurisdictions", () => {
  it("includes Belgium regions and communities before corpus navigation ingestion lands", () => {
    const slugs = getLandingJurisdictions().map((jurisdiction) => jurisdiction.slug);

    expect(slugs).toContain("be");
    expect(slugs).toContain("be-bru");
    expect(slugs).toContain("be-vlg");
    expect(slugs).toContain("be-wal");
    expect(slugs).toContain("be-dg");
  });

  it("keeps US territories hidden until stats confirm they exist", () => {
    const uncountedSlugs = getLandingJurisdictions().map(
      (jurisdiction) => jurisdiction.slug
    );
    const countedSlugs = getLandingJurisdictions(new Set(["us-pr"])).map(
      (jurisdiction) => jurisdiction.slug
    );

    expect(uncountedSlugs).not.toContain("us-pr");
    expect(countedSlugs).toContain("us-pr");
  });
});
