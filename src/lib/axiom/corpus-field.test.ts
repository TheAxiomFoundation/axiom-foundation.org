import { describe, it, expect } from "vitest";
import {
  buildFieldLayout,
  bucketColor,
  BUCKET_COLORS,
  clampFieldTransform,
  computeFieldHighlights,
  corpusFieldStats,
  dotRadius,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  fieldComposeHref,
  fieldStatLine,
  fieldToView,
  highlightScore,
  HIGHLIGHT_COUNT,
  HIGHLIGHT_MAX_PER_JURISDICTION,
  hitTestDot,
  IDENTITY_TRANSFORM,
  interpolateTransform,
  MAX_FIELD_ZOOM,
  panField,
  viewToField,
  zoomFieldAt,
  zoomTransformForDot,
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

  it("marks the provided highlight targets with their labels and a floor size", () => {
    const labels = new Map(
      computeFieldHighlights(corpusSubtrees.modules).map((m) => [
        m.target,
        `door:${m.target}`,
      ]),
    );
    const layout = buildFieldLayout(corpusSubtrees.modules, labels);
    const highlighted = layout.dots.filter((dot) => dot.highlightLabel);
    expect(highlighted).toHaveLength(labels.size);
    for (const [target, label] of labels) {
      const dot = layout.dots.find((d) => d.target === target)!;
      expect(dot.highlightLabel).toBe(label);
      expect(dot.r).toBeGreaterThanOrEqual(5);
    }
  });

  it("marks nothing when no highlight map is given", () => {
    const layout = buildFieldLayout(corpusSubtrees.modules.slice(0, 50));
    expect(layout.dots.every((dot) => dot.highlightLabel === null)).toBe(
      true,
    );
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

describe("computeFieldHighlights", () => {
  it("scores rules + 2×imports", () => {
    expect(
      highlightScore(module({ ruleCount: 10, importCount: 4 })),
    ).toBe(18);
  });

  it("picks the top scorers from the real census, in score order", () => {
    const picked = computeFieldHighlights(corpusSubtrees.modules);
    expect(picked).toHaveLength(HIGHLIGHT_COUNT);
    for (let i = 1; i < picked.length; i += 1) {
      // Later doors never outscore earlier ones (per-jurisdiction
      // dedupe may skip, never reorder).
      expect(highlightScore(picked[i]!)).toBeLessThanOrEqual(
        highlightScore(picked[i - 1]!),
      );
    }
    // The overall top scorer is always a door.
    const best = [...corpusSubtrees.modules].sort(
      (a, b) => highlightScore(b) - highlightScore(a),
    )[0]!;
    expect(picked.map((m) => m.target)).toContain(best.target);
  });

  it("caps doors per jurisdiction so one corpus can't monopolize", () => {
    const picked = computeFieldHighlights(corpusSubtrees.modules);
    const perJurisdiction = new Map<string, number>();
    for (const m of picked) {
      perJurisdiction.set(
        m.jurisdiction,
        (perJurisdiction.get(m.jurisdiction) ?? 0) + 1,
      );
    }
    for (const count of perJurisdiction.values()) {
      expect(count).toBeLessThanOrEqual(HIGHLIGHT_MAX_PER_JURISDICTION);
    }
    // The cap actually bites: an uncapped pick differs.
    const uncapped = computeFieldHighlights(
      corpusSubtrees.modules,
      HIGHLIGHT_COUNT,
      Infinity,
    );
    expect(uncapped.map((m) => m.target)).not.toEqual(
      picked.map((m) => m.target),
    );
  });

  it("is deterministic and never returns more than asked", () => {
    const a = computeFieldHighlights(corpusSubtrees.modules, 5, 2);
    const b = computeFieldHighlights(corpusSubtrees.modules, 5, 2);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });
});

describe("field transform math", () => {
  it("round-trips field ↔ view coordinates", () => {
    const t = { k: 3, tx: -420, ty: -120 };
    const view = fieldToView(t, 250, 100);
    const back = viewToField(t, view.x, view.y);
    expect(back.x).toBeCloseTo(250);
    expect(back.y).toBeCloseTo(100);
  });

  it("clamps zoom into [1, MAX] and keeps the field covering the window", () => {
    expect(clampFieldTransform({ k: 0.2, tx: 50, ty: 50 })).toEqual(
      IDENTITY_TRANSFORM,
    );
    const clamped = clampFieldTransform({ k: 99, tx: 5, ty: -1e9 });
    expect(clamped.k).toBe(MAX_FIELD_ZOOM);
    // tx ≤ 0 (no bare paper on the left), and the field's right edge
    // still reaches the window's right edge.
    expect(clamped.tx).toBeLessThanOrEqual(0);
    expect(clamped.tx).toBeGreaterThanOrEqual(FIELD_WIDTH * (1 - clamped.k));
    expect(clamped.ty).toBe(FIELD_HEIGHT * (1 - clamped.k));
  });

  it("zoomFieldAt keeps the anchor point stationary", () => {
    const t = { k: 2, tx: -300, ty: -80 };
    const anchorView = { x: 400, y: 200 };
    const before = viewToField(t, anchorView.x, anchorView.y);
    const zoomed = zoomFieldAt(t, 1.7, anchorView.x, anchorView.y);
    const after = viewToField(zoomed, anchorView.x, anchorView.y);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomed.k).toBeCloseTo(3.4);
  });

  it("zooming out from the overview is a no-op", () => {
    const zoomed = zoomFieldAt(IDENTITY_TRANSFORM, 0.5, 500, 220);
    expect(zoomed).toEqual(IDENTITY_TRANSFORM);
  });

  it("panField translates and clamps at the world edge", () => {
    const t = { k: 2, tx: -500, ty: -200 };
    const panned = panField(t, 60, -30);
    expect(panned).toEqual({ k: 2, tx: -440, ty: -230 });
    // Cannot pan past the left edge of the world.
    const pinned = panField(t, 1e6, 0);
    expect(pinned.tx).toBe(0);
  });

  it("zoomTransformForDot centers the dot and frames its cluster", () => {
    const layout = buildFieldLayout(corpusSubtrees.modules);
    const dot = layout.dots.find((d) => d.jurisdiction === "us-ny")!;
    const t = zoomTransformForDot(layout, dot);
    const view = fieldToView(t, dot.x, dot.y);
    // Centered (up to the covering clamp near world edges).
    expect(Math.abs(view.x - FIELD_WIDTH / 2)).toBeLessThanOrEqual(
      FIELD_WIDTH / 2,
    );
    expect(t.k).toBeGreaterThanOrEqual(2.5);
    expect(t.k).toBeLessThanOrEqual(MAX_FIELD_ZOOM);
    // The cluster roughly fills the window: its diameter at this zoom
    // is within the window height's magnitude.
    const cluster = layout.clusters.find(
      (c) => c.jurisdiction === "us-ny",
    )!;
    expect(cluster.r * 2 * t.k).toBeLessThanOrEqual(FIELD_HEIGHT * 1.2);
  });

  it("interpolateTransform hits its endpoints and stays clamped between", () => {
    const from = IDENTITY_TRANSFORM;
    const to = { k: 8, tx: -3000, ty: -1400 };
    expect(interpolateTransform(from, to, 0)).toEqual(from);
    expect(interpolateTransform(from, to, 1)).toEqual(to);
    const mid = interpolateTransform(from, to, 0.5);
    expect(mid.k).toBeGreaterThan(1);
    expect(mid.k).toBeLessThan(8);
    expect(mid.tx).toBeLessThanOrEqual(0);
    expect(mid.tx).toBeGreaterThanOrEqual(FIELD_WIDTH * (1 - mid.k));
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
