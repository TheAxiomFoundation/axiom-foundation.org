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

  it("merges the live mirror over the snapshot and reports source live", async () => {
    const known = corpusSubtrees.modules[0]!;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          count: 2,
          subtrees: [
            {
              target: known.target,
              jurisdiction: known.jurisdiction,
              bucket: known.bucket,
            },
            {
              target: "be:policies/euromod_benefit_income_list",
              jurisdiction: "be",
              bucket: "policies",
            },
          ],
        })
      )
    );
    const { modules, source } = await loadCorpusModules();
    expect(source).toBe("live");
    expect(modules).toHaveLength(2);
    // Known target keeps its snapshot size; new target gets the default.
    expect(modules[0]!.ruleCount).toBe(known.ruleCount);
    expect(modules[1]!).toMatchObject({
      jurisdiction: "be",
      ruleCount: DEFAULT_LIVE_RULE_COUNT,
    });
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
