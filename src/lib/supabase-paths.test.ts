import { describe, it, expect } from "vitest";
import { candidatePaths, toRepoBucketPath } from "./supabase";

describe("toRepoBucketPath", () => {
  it("renames the leading singular bucket to plural for known doc types", () => {
    expect(toRepoBucketPath("statute/26/3101/a.yaml")).toBe(
      "statutes/26/3101/a.yaml"
    );
    expect(toRepoBucketPath("regulation/7/273/2/a.yaml")).toBe(
      "regulations/7/273/2/a.yaml"
    );
    expect(toRepoBucketPath("policy/usda/snap/foo.yaml")).toBe(
      "policies/usda/snap/foo.yaml"
    );
  });

  it("leaves unknown leading segments alone", () => {
    expect(toRepoBucketPath("legislation/uksi/2002/1792.yaml")).toBe(
      "legislation/uksi/2002/1792.yaml"
    );
    expect(toRepoBucketPath("custom/path.yaml")).toBe("custom/path.yaml");
  });

  it("returns the path unchanged when there is no slash", () => {
    expect(toRepoBucketPath("statute")).toBe("statute");
    expect(toRepoBucketPath("")).toBe("");
  });
});

describe("candidatePaths", () => {
  it("produces a plural-bucket walking-up sequence for a deep statute path", () => {
    expect(candidatePaths("statute/26/3101/a", null)).toEqual([
      "statutes/26/3101/a.yaml",
      "statutes/26/3101.yaml",
      "statutes/26.yaml",
    ]);
  });

  it("respects an explicit rulespec_path verbatim and lists it first", () => {
    const out = candidatePaths(
      "statute/26/3101/a",
      "statutes/26/3101/a.yaml"
    );
    expect(out[0]).toBe("statutes/26/3101/a.yaml");
    // The basePath-derived expansion still follows so we can fall
    // back to a less-specific encoding if the explicit one is gone.
    expect(out).toContain("statutes/26/3101.yaml");
  });

  it("appends .yaml to a rulespec_path that lacks it", () => {
    const out = candidatePaths(null, "statutes/26/3101/a");
    expect(out).toContain("statutes/26/3101/a.yaml");
  });

  it("translates the explicit rulespec_path's leading bucket too", () => {
    const out = candidatePaths(null, "statute/26/3101/a.yaml");
    expect(out).toContain("statutes/26/3101/a.yaml");
  });

  it("emits the duplicate-terminal-section path for the rare 3-segment statute case", () => {
    const out = candidatePaths("statute/26/1401", null);
    // A 3-part path also gets a `<section>/<section>.yaml` candidate
    // for repos that nest single-section acts under a directory.
    expect(out).toContain("statutes/26/1401/1401.yaml");
    expect(out).toContain("statutes/26/1401.yaml");
  });

  it("does not produce the duplicate-terminal path for regulations or deep statutes", () => {
    expect(candidatePaths("regulation/7/273", null)).not.toContain(
      "regulations/7/273/273.yaml"
    );
    expect(candidatePaths("statute/26/3101/a", null)).not.toContain(
      "statutes/26/3101/a/a.yaml"
    );
  });

  it("de-duplicates identical paths produced by overlapping inputs", () => {
    const out = candidatePaths(
      "statute/26/3101/a",
      "statute/26/3101/a.yaml"
    );
    const seen = new Set(out);
    expect(seen.size).toBe(out.length);
  });

  it("returns an empty list when both inputs are null", () => {
    expect(candidatePaths(null, null)).toEqual([]);
  });
});
