import { describe, it, expect } from "vitest";
import {
  ALL_STATES,
  buildListEntries,
  filterListEntries,
  filterModulesByScope,
  JURISDICTION_SCOPES,
  LIST_SLAB_SIZE,
  matchesScope,
  statesInModules,
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

describe("jurisdiction scope (All · Nationwide · States)", () => {
  it("offers exactly the three scopes, All first", () => {
    expect(JURISDICTION_SCOPES.map((s) => s.id)).toEqual([
      "all",
      "nationwide",
      "states",
    ]);
    expect(JURISDICTION_SCOPES.map((s) => s.label)).toEqual([
      "All",
      "Nationwide",
      "States",
    ]);
  });

  it("Nationwide is the federal corpus, States is every us-XX", () => {
    expect(matchesScope("us", "nationwide")).toBe(true);
    expect(matchesScope("us-co", "nationwide")).toBe(false);
    expect(matchesScope("us", "states")).toBe(false);
    expect(matchesScope("us-co", "states")).toBe(true);
    expect(matchesScope("us-ny", "states")).toBe(true);
    expect(matchesScope("us", "all")).toBe(true);
    expect(matchesScope("us-co", "all")).toBe(true);
  });

  it("filterModulesByScope cuts modules for the doors band", () => {
    const modules = [
      module({ target: "us:statutes/7/2014", jurisdiction: "us" }),
      module({ target: "us-co:statutes/1", jurisdiction: "us-co" }),
      module({ target: "us-ny:statutes/1", jurisdiction: "us-ny" }),
    ];
    expect(filterModulesByScope(modules, "all")).toEqual(modules);
    expect(
      filterModulesByScope(modules, "nationwide").map((m) => m.jurisdiction),
    ).toEqual(["us"]);
    expect(
      filterModulesByScope(modules, "states").map((m) => m.jurisdiction),
    ).toEqual(["us-co", "us-ny"]);
  });

  it("the scope COMPOSES with the text search over the same list", () => {
    const entries = buildListEntries([
      module({ target: "us:statutes/26/32", headlineRule: "eitc" }),
      module({
        target: "us-co:policies/income_tax/eitc_rate",
        jurisdiction: "us-co",
        bucket: "policies",
        headlineRule: "co_eitc",
      }),
      module({ target: "us-co:statutes/1", jurisdiction: "us-co" }),
    ]);
    // Text alone: both EITC entries.
    expect(filterListEntries(entries, "eitc")).toHaveLength(2);
    // Text × scope: one each side.
    expect(
      filterListEntries(entries, "eitc", "nationwide").map((e) => e.target),
    ).toEqual(["us:statutes/26/32"]);
    expect(
      filterListEntries(entries, "eitc", "states").map((e) => e.target),
    ).toEqual(["us-co:policies/income_tax/eitc_rate"]);
    // Scope alone: empty query keeps everything in scope.
    expect(filterListEntries(entries, "", "states")).toHaveLength(2);
    // Every entry carries its jurisdiction for the row attribute.
    expect(entries.every((e) => e.jurisdiction.startsWith("us"))).toBe(true);
  });
});

describe("state picker (one us-XX under the States scope)", () => {
  const modules = [
    module({ target: "us:statutes/26/32", jurisdiction: "us" }),
    module({
      target: "us-ia:statutes/422/12C",
      jurisdiction: "us-ia",
      headlineRule: "iowa_credit",
    }),
    module({
      target: "us-mo:manual/dss/snap/1115",
      jurisdiction: "us-mo",
      bucket: "manual",
    }),
    module({ target: "us-ia:statutes/422/9", jurisdiction: "us-ia" }),
  ];

  it("matchesScope narrows to exactly one state — never under other scopes", () => {
    expect(matchesScope("us-ia", "states", "us-ia")).toBe(true);
    expect(matchesScope("us-mo", "states", "us-ia")).toBe(false);
    expect(matchesScope("us", "states", "us-ia")).toBe(false);
    expect(matchesScope("us-ia", "states", ALL_STATES)).toBe(true);
    // The state is a States-scope refinement only.
    expect(matchesScope("us-mo", "all", "us-ia")).toBe(true);
    expect(matchesScope("us", "nationwide", "us-ia")).toBe(true);
  });

  it("statesInModules lists only present states, real names, sorted", () => {
    const options = statesInModules(modules);
    expect(options).toEqual([
      { id: "us-ia", label: "Iowa" },
      { id: "us-mo", label: "Missouri" },
    ]);
    // Federal never appears; absent states never appear.
    expect(options.some((o) => o.id === "us")).toBe(false);
    expect(options.some((o) => o.id === "us-ny")).toBe(false);
  });

  it("the census offers dozens of states, sorted by name", () => {
    const options = statesInModules(filterViewModules(corpusSubtrees.modules));
    expect(options.length).toBeGreaterThan(20);
    const labels = options.map((o) => o.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(labels).toContain("Iowa");
    expect(labels.some((label) => /^us-/.test(label))).toBe(false);
  });

  it("query × scope × state compose over the same list", () => {
    const entries = buildListEntries(modules);
    expect(
      filterListEntries(entries, "", "states", "us-ia").map((e) => e.target),
    ).toEqual(["us-ia:statutes/422/12C", "us-ia:statutes/422/9"]);
    expect(
      filterListEntries(entries, "422.12", "states", "us-ia").map(
        (e) => e.target,
      ),
    ).toEqual(["us-ia:statutes/422/12C"]);
    expect(filterListEntries(entries, "1115", "states", "us-ia")).toEqual([]);
    // The doors-band cut agrees.
    expect(
      filterModulesByScope(modules, "states", "us-mo").map((m) => m.target),
    ).toEqual(["us-mo:manual/dss/snap/1115"]);
  });
});
