import { describe, it, expect } from "vitest";
import { getRuleSpecRepoForJurisdiction } from "./repo-map";

describe("getRuleSpecRepoForJurisdiction", () => {
  it("maps every supported jurisdiction to its rulespec-* repo", () => {
    const expected: Record<string, string> = {
      us: "rulespec-us",
      uk: "rulespec-uk",
      canada: "rulespec-ca",
      "us-al": "rulespec-us-al",
      "us-ar": "rulespec-us-ar",
      "us-ca": "rulespec-us-ca",
      "us-co": "rulespec-us-co",
      "us-fl": "rulespec-us-fl",
      "us-ga": "rulespec-us-ga",
      "us-md": "rulespec-us-md",
      "us-nc": "rulespec-us-nc",
      "us-ny": "rulespec-us-ny",
      "us-sc": "rulespec-us-sc",
      "us-tn": "rulespec-us-tn",
      "us-tx": "rulespec-us-tx",
    };
    for (const [slug, repo] of Object.entries(expected)) {
      expect(getRuleSpecRepoForJurisdiction(slug)).toBe(repo);
    }
  });

  it("returns null for jurisdictions without a published rulespec-* repo", () => {
    expect(getRuleSpecRepoForJurisdiction("us-oh")).toBeNull();
    expect(getRuleSpecRepoForJurisdiction("nope")).toBeNull();
  });
});
