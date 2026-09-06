import { describe, it, expect, afterEach } from "vitest";
import {
  getRuleSpecRepoForJurisdiction,
  getRuleSpecRepoLocation,
  gitHubApiHeaders,
  ruleSpecRawFileUrl,
  ruleSpecBlobUrl,
  ruleSpecRepoTreeUrl,
  ruleSpecRepoSubtreeApiUrl,
  ruleSpecRepoRootTreeApiUrl,
  RULESPEC_REPOS,
  RULESPEC_COUNTRY_SLUGS,
} from "./repo-map";
import { JURISDICTIONS_SEED } from "./jurisdictions-seed";

/**
 * Drift guard: adding a repo family is a three-part change (repo map,
 * seed label, and the family entry itself). These assertions fail the
 * PR when one part is missing — the gap that left New Zealand's 36
 * encodings invisible to the app.
 */
describe("RULESPEC_COUNTRY_SLUGS", () => {
  it("derives one country slug per published repo", () => {
    expect(RULESPEC_COUNTRY_SLUGS).toEqual(["us", "uk", "be", "ca", "nz"]);
    expect(RULESPEC_COUNTRY_SLUGS).toHaveLength(RULESPEC_REPOS.length);
  });

  it("maps every country slug back to its repo", () => {
    for (const [i, slug] of RULESPEC_COUNTRY_SLUGS.entries()) {
      expect(getRuleSpecRepoForJurisdiction(slug)).toBe(RULESPEC_REPOS[i]);
    }
  });

  it("has a jurisdictions-seed label for every country slug", () => {
    const seedSlugs = new Set(JURISDICTIONS_SEED.map((j) => j.slug));
    for (const slug of RULESPEC_COUNTRY_SLUGS) {
      expect(seedSlugs, `add "${slug}" to jurisdictions-seed.ts`).toContain(
        slug
      );
    }
  });

  it("leaves the gated Israel pilot repo out of the read list", () => {
    // rulespec-il resolves as a family (landing tile, drift-check
    // placement) while the pilot is gated app_visibility =
    // "experimental". discoverRoots() skips gated repos, so a
    // RULESPEC_REPOS entry would fail scripts/check-rulespec-drift.mjs
    // ("listed in RULESPEC_REPOS but discovery found no encodings").
    // Promote it here only once rulespec-il is public and populated.
    expect(RULESPEC_REPOS).not.toContain("rulespec-il");
    expect(RULESPEC_COUNTRY_SLUGS).not.toContain("il");
    expect(getRuleSpecRepoForJurisdiction("il")).toBe("rulespec-il");
  });
});

describe("getRuleSpecRepoForJurisdiction", () => {
  it("maps every jurisdiction family to its shared monorepo", () => {
    const expected: Record<string, string> = {
      us: "rulespec-us",
      "us-al": "rulespec-us",
      "us-ca": "rulespec-us",
      // States added to the monorepo with no prior per-state repo still
      // resolve — the prefix logic is open, not a hand-maintained list.
      "us-az": "rulespec-us",
      "us-nh": "rulespec-us",
      "us-oh": "rulespec-us",
      uk: "rulespec-uk",
      "uk-kingston-upon-thames": "rulespec-uk",
      be: "rulespec-be",
      "be-bru": "rulespec-be",
      "be-vlg": "rulespec-be",
      "be-wal": "rulespec-be",
      "be-dg": "rulespec-be",
      ca: "rulespec-ca",
      nz: "rulespec-nz",
      il: "rulespec-il",
    };
    for (const [slug, repo] of Object.entries(expected)) {
      expect(getRuleSpecRepoForJurisdiction(slug)).toBe(repo);
    }
  });

  it("keeps Israel (il) and Illinois (us-il) on separate families", () => {
    // ``il`` is ISO 3166-1 Israel; Illinois is the ``us-il`` state slug.
    // A prefix mix-up here would route Illinois encodings at rulespec-il.
    expect(getRuleSpecRepoForJurisdiction("il")).toBe("rulespec-il");
    expect(getRuleSpecRepoForJurisdiction("us-il")).toBe("rulespec-us");
    expect(getRuleSpecRepoLocation("us-il")).toEqual({
      repo: "rulespec-us",
      prefix: "us-il",
    });
  });

  it("returns null for jurisdictions outside a published repo family", () => {
    expect(getRuleSpecRepoForJurisdiction("fr")).toBeNull();
    expect(getRuleSpecRepoForJurisdiction("nope")).toBeNull();
    expect(getRuleSpecRepoForJurisdiction("")).toBeNull();
  });
});

describe("getRuleSpecRepoLocation", () => {
  it("returns the repo and the jurisdiction-dir prefix", () => {
    expect(getRuleSpecRepoLocation("us")).toEqual({
      repo: "rulespec-us",
      prefix: "us",
    });
    expect(getRuleSpecRepoLocation("us-ca")).toEqual({
      repo: "rulespec-us",
      prefix: "us-ca",
    });
    expect(getRuleSpecRepoLocation("uk")).toEqual({
      repo: "rulespec-uk",
      prefix: "uk",
    });
    expect(getRuleSpecRepoLocation("be-bru")).toEqual({
      repo: "rulespec-be",
      prefix: "be-bru",
    });
  });

  it("gives Israel the jurisdiction-dir prefix its monorepo uses", () => {
    // rulespec-il is scaffolded like rulespec-nz: buckets under ``il/``.
    expect(getRuleSpecRepoLocation("il")).toEqual({
      repo: "rulespec-il",
      prefix: "il",
    });
    expect(ruleSpecRepoTreeUrl("il")).toBe(
      "https://github.com/TheAxiomFoundation/rulespec-il/tree/main/il"
    );
    expect(
      ruleSpecRawFileUrl("il", "statutes/income-tax-ordinance/section-121.yaml")
    ).toBe(
      "https://raw.githubusercontent.com/TheAxiomFoundation/rulespec-il/main/il/statutes/income-tax-ordinance/section-121.yaml"
    );
  });

  it("returns an empty prefix for root-layout single-jurisdiction repos", () => {
    // rulespec-ca keeps its buckets at the repo root (no canada/ dir).
    expect(getRuleSpecRepoLocation("ca")).toEqual({
      repo: "rulespec-ca",
      prefix: "",
    });
  });

  it("returns null for unsupported jurisdictions", () => {
    expect(getRuleSpecRepoLocation("fr")).toBeNull();
  });
});

describe("URL builders inject the monorepo jurisdiction-dir prefix", () => {
  it("builds raw file URLs for federal and state bucket-rooted paths", () => {
    expect(ruleSpecRawFileUrl("us", "statutes/26/32.yaml")).toBe(
      "https://raw.githubusercontent.com/TheAxiomFoundation/rulespec-us/main/us/statutes/26/32.yaml"
    );
    expect(
      ruleSpecRawFileUrl("us-ca", "regulations/mpp/63-300/1.yaml")
    ).toBe(
      "https://raw.githubusercontent.com/TheAxiomFoundation/rulespec-us/main/us-ca/regulations/mpp/63-300/1.yaml"
    );
  });

  it("builds blob URLs for the human-facing View on GitHub link", () => {
    expect(ruleSpecBlobUrl("us", "statutes/26/32.yaml")).toBe(
      "https://github.com/TheAxiomFoundation/rulespec-us/blob/main/us/statutes/26/32.yaml"
    );
  });

  it("builds prefix-free URLs for root-layout repos", () => {
    expect(ruleSpecRawFileUrl("ca", "policies/cra/t4127-2026/claim-codes.yaml")).toBe(
      "https://raw.githubusercontent.com/TheAxiomFoundation/rulespec-ca/main/policies/cra/t4127-2026/claim-codes.yaml"
    );
    expect(ruleSpecBlobUrl("ca", "policies/cra/t4127-2026/claim-codes.yaml")).toBe(
      "https://github.com/TheAxiomFoundation/rulespec-ca/blob/main/policies/cra/t4127-2026/claim-codes.yaml"
    );
    expect(ruleSpecRepoTreeUrl("ca")).toBe(
      "https://github.com/TheAxiomFoundation/rulespec-ca/tree/main"
    );
  });

  it("builds a tree URL pointing at the jurisdiction directory", () => {
    expect(ruleSpecRepoTreeUrl("us-ny")).toBe(
      "https://github.com/TheAxiomFoundation/rulespec-us/tree/main/us-ny"
    );
  });

  it("builds the recursive subtree git-trees API URL for a jurisdiction", () => {
    expect(ruleSpecRepoSubtreeApiUrl("rulespec-us", "us")).toBe(
      "https://api.github.com/repos/TheAxiomFoundation/rulespec-us/git/trees/main:us?recursive=1"
    );
    expect(ruleSpecRepoSubtreeApiUrl("rulespec-us", "us-ca")).toBe(
      "https://api.github.com/repos/TheAxiomFoundation/rulespec-us/git/trees/main:us-ca?recursive=1"
    );
    // Root-layout repos list the whole (single-jurisdiction) repo tree.
    expect(ruleSpecRepoSubtreeApiUrl("rulespec-ca", "")).toBe(
      "https://api.github.com/repos/TheAxiomFoundation/rulespec-ca/git/trees/main?recursive=1"
    );
  });

  it("builds the top-level (non-recursive) git-trees API URL for a repo", () => {
    expect(ruleSpecRepoRootTreeApiUrl("rulespec-uk")).toBe(
      "https://api.github.com/repos/TheAxiomFoundation/rulespec-uk/git/trees/main"
    );
  });

  it("returns null from the file/blob/tree builders for unsupported jurisdictions", () => {
    expect(ruleSpecRawFileUrl("fr", "statutes/1.yaml")).toBeNull();
    expect(ruleSpecBlobUrl("fr", "statutes/1.yaml")).toBeNull();
    expect(ruleSpecRepoTreeUrl("fr")).toBeNull();
  });
});

describe("gitHubApiHeaders", () => {
  const original = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GH_TOKEN: process.env.GH_TOKEN,
  };
  afterEach(() => {
    process.env.GITHUB_TOKEN = original.GITHUB_TOKEN;
    process.env.GH_TOKEN = original.GH_TOKEN;
  });

  it("sends only the Accept header when no token is configured", () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    expect(gitHubApiHeaders()).toEqual({
      Accept: "application/vnd.github+json",
    });
  });

  it("authenticates when a token is configured", () => {
    delete process.env.GH_TOKEN;
    process.env.GITHUB_TOKEN = "secret-token";
    expect(gitHubApiHeaders()).toEqual({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer secret-token",
    });
  });
});
