import { describe, it, expect } from "vitest";
import { getRuleSpecRepoForJurisdiction } from "./repo-map";

describe("getRuleSpecRepoForJurisdiction", () => {
  it("maps every supported jurisdiction to its rules-* repo", () => {
    const expected: Record<string, string> = {
      us: "rules-us",
      uk: "rules-uk",
      canada: "rules-ca",
      "us-al": "rules-us-al",
      "us-ar": "rules-us-ar",
      "us-ca": "rules-us-ca",
      "us-co": "rules-us-co",
      "us-fl": "rules-us-fl",
      "us-ga": "rules-us-ga",
      "us-md": "rules-us-md",
      "us-nc": "rules-us-nc",
      "us-sc": "rules-us-sc",
      "us-tn": "rules-us-tn",
      "us-tx": "rules-us-tx",
    };
    for (const [slug, repo] of Object.entries(expected)) {
      expect(getRuleSpecRepoForJurisdiction(slug)).toBe(repo);
    }
  });

  it("returns null for jurisdictions without a published rules-* repo (e.g. us-ny today)", () => {
    expect(getRuleSpecRepoForJurisdiction("us-ny")).toBeNull();
    expect(getRuleSpecRepoForJurisdiction("us-oh")).toBeNull();
    expect(getRuleSpecRepoForJurisdiction("nope")).toBeNull();
  });
});
