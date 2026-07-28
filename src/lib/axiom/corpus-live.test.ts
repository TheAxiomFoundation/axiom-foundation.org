import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadCorpusModules } from "./corpus-live";
import { DEFAULT_LIVE_RULE_COUNT } from "./corpus-field";
import corpusSubtrees from "./corpus-subtrees.json";

function okResponse(data: unknown) {
  return {
    ok: true,
    json: async () => ({ status: "ok", data }),
  };
}

describe("loadCorpusModules", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges the live mirror over the snapshot, US-only, and reports source live", async () => {
    const known = corpusSubtrees.modules[0]!;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          count: 4,
          subtrees: [
            {
              target: known.target,
              jurisdiction: known.jurisdiction,
              bucket: known.bucket,
            },
            {
              target: "us-pr:statutes/13/30171",
              jurisdiction: "us-pr",
              bucket: "statutes",
            },
            // Non-US mirror entries exist upstream but never reach a
            // view surface.
            {
              target: "be:policies/euromod_benefit_income_list",
              jurisdiction: "be",
              bucket: "policies",
            },
            {
              target: "uk:statutes/universal-credit/1",
              jurisdiction: "uk",
              bucket: "statutes",
            },
          ],
        })
      )
    );
    const { modules, source } = await loadCorpusModules();
    expect(source).toBe("live");
    expect(modules).toHaveLength(2);
    // Known target keeps its snapshot size; a new US target gets the
    // default dot.
    expect(modules[0]!.ruleCount).toBe(known.ruleCount);
    expect(modules[1]!).toMatchObject({
      jurisdiction: "us-pr",
      ruleCount: DEFAULT_LIVE_RULE_COUNT,
    });
    expect(
      modules.every((m) => m.jurisdiction.startsWith("us"))
    ).toBe(true);
  });

  it("falls back to the whole snapshot on HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    );
    const { modules, source } = await loadCorpusModules();
    expect(source).toBe("snapshot");
    expect(modules).toHaveLength(corpusSubtrees.modules.length);
  });

  it("falls back on transport failure and on malformed payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect((await loadCorpusModules()).source).toBe("snapshot");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse({ subtrees: "not-a-list" }))
    );
    expect((await loadCorpusModules()).source).toBe("snapshot");

    // An empty live list is not a corpus — keep the snapshot.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse({ count: 0, subtrees: [] }))
    );
    const empty = await loadCorpusModules();
    expect(empty.source).toBe("snapshot");
    expect(empty.modules.length).toBeGreaterThan(4000);
  });
});
