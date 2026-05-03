import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  parseTreeEntries,
  citationPathToFilePath,
  listEncodedFiles,
  fetchEncodedFile,
} from "./repo-listing";

describe("parseTreeEntries", () => {
  const TREE = {
    tree: [
      { path: "README.md", type: "blob" },
      { path: "statutes/26/3101/a.yaml", type: "blob" },
      { path: "statutes/26/3101/a.test.yaml", type: "blob" },
      { path: "statutes/26/3101/b/1.yaml", type: "blob" },
      { path: "regulations/7/273/9.yaml", type: "blob" },
      { path: "policies/usda/snap/fy-2026-cola/deductions.yaml", type: "blob" },
      {
        path: "sources/slices/cdss/calfresh/foo.meta.yaml",
        type: "blob",
      },
      { path: "statutes/26", type: "tree" },
    ],
  };

  it("returns one record per encoding YAML, ignoring tests/meta/markdown/non-blobs", () => {
    const out = parseTreeEntries(TREE, "us");
    expect(out.map((f) => f.filePath)).toEqual([
      "policies/usda/snap/fy-2026-cola/deductions.yaml",
      "regulations/7/273/9.yaml",
      "statutes/26/3101/a.yaml",
      "statutes/26/3101/b/1.yaml",
    ]);
  });

  it("renames repo buckets back to the citation_path dialect", () => {
    const out = parseTreeEntries(TREE, "us");
    expect(out.find((f) => f.filePath.startsWith("statutes/"))?.citationPath)
      .toBe("us/statute/26/3101/a");
    expect(out.find((f) => f.filePath.startsWith("regulations/"))?.citationPath)
      .toBe("us/regulation/7/273/9");
    expect(out.find((f) => f.filePath.startsWith("policies/"))?.citationPath)
      .toBe("us/policy/usda/snap/fy-2026-cola/deductions");
  });

  it("preserves the bucket label so the UI can group / badge entries", () => {
    const out = parseTreeEntries(TREE, "us");
    const buckets = new Set(out.map((f) => f.bucket));
    expect(buckets).toEqual(new Set(["statutes", "regulations", "policies"]));
  });

  it("returns an empty list when the body is missing or invalid", () => {
    expect(parseTreeEntries(null, "us")).toEqual([]);
    expect(parseTreeEntries({}, "us")).toEqual([]);
    expect(parseTreeEntries({ tree: "no" } as never, "us")).toEqual([]);
  });

  it("leaves the bucket alone for unknown top-level dirs (e.g. UK legislation/)", () => {
    const out = parseTreeEntries(
      {
        tree: [
          {
            path: "legislation/uksi/2002/1792/regulation/4A/2.yaml",
            type: "blob",
          },
        ],
      },
      "uk"
    );
    expect(out[0].citationPath).toBe(
      "uk/legislation/uksi/2002/1792/regulation/4A/2"
    );
    expect(out[0].bucket).toBe("legislation");
  });
});

describe("citationPathToFilePath", () => {
  it("translates the doc-type segment back to the repo bucket", () => {
    expect(citationPathToFilePath("us/statute/26/3101/a")).toBe(
      "statutes/26/3101/a.yaml"
    );
    expect(citationPathToFilePath("us-co/regulation/10-CCR-2506-1/4.401")).toBe(
      "regulations/10-CCR-2506-1/4.401.yaml"
    );
    expect(citationPathToFilePath("us/policy/usda/snap/x")).toBe(
      "policies/usda/snap/x.yaml"
    );
  });

  it("leaves unknown buckets alone", () => {
    expect(citationPathToFilePath("uk/legislation/uksi/2002/1792")).toBe(
      "legislation/uksi/2002/1792.yaml"
    );
  });

  it("returns null when the citation path lacks a bucket segment", () => {
    expect(citationPathToFilePath("us")).toBeNull();
  });
});

describe("listEncodedFiles", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty list for a jurisdiction without a published repo", async () => {
    expect(await listEncodedFiles("us-ny")).toEqual([]);
  });

  it("returns an empty list when the GitHub API responds non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );
    expect(await listEncodedFiles("us")).toEqual([]);
  });

  it("returns an empty list when the fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    expect(await listEncodedFiles("us")).toEqual([]);
  });

  it("parses the tree and includes only encoding YAMLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tree: [
            { path: "statutes/26/3101/a.yaml", type: "blob" },
            { path: "statutes/26/3101/a.test.yaml", type: "blob" },
            { path: "README.md", type: "blob" },
          ],
        }),
      })
    );
    const out = await listEncodedFiles("us");
    expect(out).toHaveLength(1);
    expect(out[0].citationPath).toBe("us/statute/26/3101/a");
  });
});

describe("fetchEncodedFile", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when the jurisdiction has no published repo", async () => {
    expect(await fetchEncodedFile("us-ny/statute/foo/bar")).toBeNull();
  });

  it("returns null when the citation path can't be mapped to a file", async () => {
    expect(await fetchEncodedFile("us")).toBeNull();
  });

  it("returns null for a 404 from raw.githubusercontent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await fetchEncodedFile("us/statute/26/9999/z")).toBeNull();
  });

  it("returns the file path + content on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "format: rulespec/v1\n",
      })
    );
    const out = await fetchEncodedFile("us/statute/26/3101/a");
    expect(out).toEqual({
      filePath: "statutes/26/3101/a.yaml",
      content: "format: rulespec/v1\n",
    });
  });

  it("returns null when the fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("dns"))
    );
    expect(await fetchEncodedFile("us/statute/26/3101/a")).toBeNull();
  });
});
