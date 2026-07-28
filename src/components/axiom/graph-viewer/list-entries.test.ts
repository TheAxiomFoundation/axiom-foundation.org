import { describe, it, expect } from "vitest";
import {
  buildListEntries,
  filterListEntries,
  LIST_SLAB_SIZE,
} from "./list-entries";
import { filterViewModules, type CorpusModule } from "@/lib/axiom/corpus-field";
import corpusSubtreesJson from "@/lib/axiom/corpus-subtrees.json";

// JSON widens the census's `[number, number]` tuples to number[] —
// the committed data is well-formed; narrow it once here.
const corpusSubtrees = corpusSubtreesJson as unknown as {
  modules: CorpusModule[];
};

function module(overrides: Partial<CorpusModule>): CorpusModule {
  return {
    target: "us:statutes/7/2014",
    jurisdiction: "us",
    bucket: "statutes",
    ruleCount: 5,
    linkedRuleCount: 5,
    importCount: 0,
    imports: [],
    ...overrides,
  };
}

describe("buildListEntries", () => {
  it("titles with the humanized headline, citation demoted to subtitle", () => {
    const [entry] = buildListEntries([
      module({
        target: "us:statutes/26/32",
        ruleCount: 24,
        headlineRule: "eitc",
      }),
    ]);
    expect(entry).toMatchObject({
      target: "us:statutes/26/32",
      title: "EITC",
      subtitle: "26 USC § 32",
      meta: "24 rules · statutes",
    });
  });

  it("citation-titled rows never repeat themselves as a subtitle", () => {
    const [entry] = buildListEntries([
      module({ target: "us:regulations/7-cfr/273/10", bucket: "regulations" }),
    ]);
    expect(entry!.title).toBe("7 CFR § 273.10");
    expect(entry!.subtitle).toBeNull();
    expect(entry!.meta).toBe("5 rules · regulations");
  });

  it("singular rule count reads as prose", () => {
    const [entry] = buildListEntries([module({ ruleCount: 1 })]);
    expect(entry!.meta).toBe("1 rule · statutes");
  });

  it("sorts biggest subtrees first, deterministically", () => {
    const entries = buildListEntries([
      module({ target: "b", ruleCount: 3 }),
      module({ target: "a", ruleCount: 3 }),
      module({ target: "c", ruleCount: 9 }),
    ]);
    expect(entries.map((e) => e.target)).toEqual(["c", "a", "b"]);
    expect(
      buildListEntries([
        module({ target: "c", ruleCount: 9 }),
        module({ target: "a", ruleCount: 3 }),
        module({ target: "b", ruleCount: 3 }),
      ]),
    ).toEqual(entries);
  });

  it("covers the whole view census with NO raw slugs in a title", () => {
    const view = filterViewModules(corpusSubtrees.modules);
    const entries = buildListEntries(view);
    expect(entries).toHaveLength(view.length);
    expect(entries.length).toBeGreaterThan(1000);
    for (const entry of entries) {
      // Raw targets carry "bucket/segment" slashes; humanized
      // citations never do ("7 CFR § 273.10", "MO DSS SNAP Manual …").
      expect(entry.title).not.toMatch(/\//);
      expect(entry.title).not.toMatch(/^us(-[a-z]{2})?:/);
    }
    // Well beyond one slab: the list must window its rendering.
    expect(entries.length).toBeGreaterThan(LIST_SLAB_SIZE);
  });
});

describe("filterListEntries", () => {
  const entries = buildListEntries([
    module({ target: "us:regulations/7-cfr/273/10", bucket: "regulations" }),
    module({
      target: "us:statutes/26/32",
      headlineRule: "eitc",
      ruleCount: 24,
    }),
  ]);

  it("empty query returns everything", () => {
    expect(filterListEntries(entries, "")).toEqual(entries);
    expect(filterListEntries(entries, "   ")).toEqual(entries);
  });

  it("every token must match, any order, over title + citation + target", () => {
    expect(
      filterListEntries(entries, "273.10").map((e) => e.target),
    ).toEqual(["us:regulations/7-cfr/273/10"]);
    expect(
      filterListEntries(entries, "eitc 26").map((e) => e.target),
    ).toEqual(["us:statutes/26/32"]);
    expect(filterListEntries(entries, "eitc 273")).toEqual([]);
  });
});
