import { describe, it, expect } from "vitest";
import {
  buildFieldLayout,
  bucketColor,
  BUCKET_COLORS,
  corpusFieldStats,
  dotRadius,
  FIELD_HEIGHT,
  FIELD_HIGHLIGHTS,
  FIELD_WIDTH,
  fieldComposeHref,
  fieldStatLine,
  hitTestDot,
  type CorpusModule,
} from "./corpus-field";
import corpusSubtrees from "./corpus-subtrees.json";

function module(overrides: Partial<CorpusModule> = {}): CorpusModule {
  return {
    target: "us:statutes/7/2014",
    jurisdiction: "us",
    bucket: "statutes",
    ruleCount: 4,
    importCount: 0,
    ...overrides,
  };
}

describe("dotRadius", () => {
  it("grows with rule count but sublinearly", () => {
    expect(dotRadius(0)).toBeGreaterThan(0);
    expect(dotRadius(9)).toBeGreaterThan(dotRadius(1));
    // sqrt scaling: 16x the rules is only ~4x the radius growth.
    expect(dotRadius(16) - dotRadius(0)).toBeLessThan(
      (dotRadius(1) - dotRadius(0)) * 5,
    );
  });

  it("caps giant subtrees so one module can't drown the field", () => {
    expect(dotRadius(10_000)).toBe(6.5);
  });
});

describe("bucketColor", () => {
  it("maps the three corpus buckets and falls back for strays", () => {
    expect(bucketColor("statutes")).toBe(BUCKET_COLORS.statutes);
    expect(bucketColor("regulations")).toBe(BUCKET_COLORS.regulations);
    expect(bucketColor("policies")).toBe(BUCKET_COLORS.policies);
    // The census carries one "manual" module today — it must still
    // render, in the fallback stone.
    expect(bucketColor("manual")).toMatch(/^#/);
    expect(bucketColor("manual")).not.toBe(BUCKET_COLORS.statutes);
  });
});

describe("buildFieldLayout", () => {
  it("returns an empty layout for an empty census", () => {
    const layout = buildFieldLayout([]);
    expect(layout.dots).toHaveLength(0);
    expect(layout.clusters).toHaveLength(0);
  });

  it("places one dot per module and one cluster per jurisdiction", () => {
    const modules = [
      module({ target: "us:statutes/1" }),
      module({ target: "us:regulations/7-cfr/273/10", bucket: "regulations" }),
      module({ target: "us-ny:statutes/1", jurisdiction: "us-ny" }),
    ];
    const layout = buildFieldLayout(modules);
    expect(layout.dots).toHaveLength(3);
    expect(layout.clusters.map((c) => c.jurisdiction).sort()).toEqual([
      "us",
      "us-ny",
    ]);
  });

  it("keeps every dot inside the field bounds", () => {
    const layout = buildFieldLayout(corpusSubtrees.modules);
    expect(layout.dots).toHaveLength(corpusSubtrees.modules.length);
    for (const dot of layout.dots) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(dot.y).toBeGreaterThanOrEqual(0);
      expect(dot.y).toBeLessThanOrEqual(FIELD_HEIGHT);
      expect(dot.r).toBeGreaterThan(0);
    }
  });

  it("clusters dots around their jurisdiction center", () => {
    const layout = buildFieldLayout(corpusSubtrees.modules);
    const clusterByJurisdiction = new Map(
      layout.clusters.map((c) => [c.jurisdiction, c]),
    );
    for (const dot of layout.dots) {
      const cluster = clusterByJurisdiction.get(dot.jurisdiction)!;
      const dist = Math.hypot(dot.x - cluster.x, dot.y - cluster.y);
      expect(dist).toBeLessThanOrEqual(cluster.r + dot.r + 1);
    }
  });

  it("does not overlap jurisdiction clusters", () => {
    const layout = buildFieldLayout(corpusSubtrees.modules);
    for (let i = 0; i < layout.clusters.length; i += 1) {
      for (let j = i + 1; j < layout.clusters.length; j += 1) {
        const a = layout.clusters[i]!;
        const b = layout.clusters[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(
          (a.r + b.r) * 0.99,
        );
      }
    }
  });

  it("marks every highlighted entry point with its label and a floor size", () => {
    const layout = buildFieldLayout(corpusSubtrees.modules);
    const highlighted = layout.dots.filter((dot) => dot.highlightLabel);
    expect(highlighted).toHaveLength(FIELD_HIGHLIGHTS.length);
    for (const entry of FIELD_HIGHLIGHTS) {
      const dot = layout.dots.find((d) => d.target === entry.target)!;
      expect(dot.highlightLabel).toBe(entry.label);
      expect(dot.r).toBeGreaterThanOrEqual(5);
    }
  });

  it("colors dots by bucket", () => {
    const layout = buildFieldLayout([
      module({ target: "a", bucket: "statutes" }),
      module({ target: "b", bucket: "policies" }),
    ]);
    const byTarget = new Map(layout.dots.map((d) => [d.target, d]));
    expect(byTarget.get("a")!.color).toBe(BUCKET_COLORS.statutes);
    expect(byTarget.get("b")!.color).toBe(BUCKET_COLORS.policies);
  });

  it("is deterministic", () => {
    const a = buildFieldLayout(corpusSubtrees.modules.slice(0, 400));
    const b = buildFieldLayout(corpusSubtrees.modules.slice(0, 400));
    expect(a).toEqual(b);
  });
});

describe("hitTestDot", () => {
  const layout = buildFieldLayout([
    module({ target: "big", ruleCount: 60 }),
    module({ target: "small", ruleCount: 1 }),
  ]);

  it("finds a dot at its own center", () => {
    const big = layout.dots.find((d) => d.target === "big")!;
    expect(hitTestDot(layout.dots, big.x, big.y)?.target).toBe("big");
  });

  it("misses far away from everything", () => {
    expect(hitTestDot(layout.dots, -500, -500)).toBeNull();
  });

  it("prefers the nearest center within slack", () => {
    const small = layout.dots.find((d) => d.target === "small")!;
    expect(hitTestDot(layout.dots, small.x, small.y)?.target).toBe("small");
  });
});

describe("corpusFieldStats + fieldStatLine", () => {
  it("computes counts from the census, never hardcoded", () => {
    const stats = corpusFieldStats([
      module({ ruleCount: 3 }),
      module({ target: "x", ruleCount: 7 }),
    ]);
    expect(stats).toEqual({ subtrees: 2, rules: 10 });
  });

  it("renders the honest stat line for the real census", () => {
    const stats = corpusFieldStats(corpusSubtrees.modules);
    expect(stats.subtrees).toBe(corpusSubtrees.clean_subtrees);
    const line = fieldStatLine(stats);
    expect(line).toContain(stats.subtrees.toLocaleString("en-US"));
    expect(line).toContain("provision-rooted subtrees");
    expect(line).toContain("encoded rules");
    expect(line).toContain("every node cites its law");
    // ~20,100 today: rounded to the nearest hundred with a tilde.
    expect(line).toMatch(/~\d{1,3}(,\d{3})* encoded rules/);
  });
});

describe("fieldComposeHref", () => {
  it("links into the in-app compose viewer with the target encoded", () => {
    expect(fieldComposeHref("us:statutes/7/2014/e/6/A")).toBe(
      "/axiom/graph?compose=us%3Astatutes%2F7%2F2014%2Fe%2F6%2FA",
    );
  });
});
