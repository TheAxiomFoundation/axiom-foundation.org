/**
 * The corpus field: layout + sizing for the landing screen's visual
 * census of the encoded corpus — every clean provision-rooted subtree
 * as one dot, clustered by jurisdiction, colored by bucket.
 *
 * Pure module (no DOM): the canvas renderer consumes the layout it
 * produces, and tests exercise the geometry directly. Everything is
 * deterministic — same census in, same field out.
 */

export interface CorpusModule {
  target: string;
  jurisdiction: string;
  bucket: string;
  ruleCount: number;
  importCount: number;
}

export interface CorpusSubtreesFile {
  generated_from?: string;
  clean_subtrees: number;
  modules: CorpusModule[];
}

/** Abstract field coordinates; the renderer scales to its pixels. */
export const FIELD_WIDTH = 1000;
export const FIELD_HEIGHT = 440;
const FIELD_MARGIN = 26;

/** Bucket palette — pulled from the graph viewer's warm-paper family
 *  (amber statutes, the viewer's green, stone policies). */
export const BUCKET_COLORS: Record<string, string> = {
  statutes: "#b45309",
  regulations: "#166534",
  policies: "#78716c",
};
const FALLBACK_BUCKET_COLOR = "#a8a29e";

export function bucketColor(bucket: string): string {
  return BUCKET_COLORS[bucket] ?? FALLBACK_BUCKET_COLOR;
}

/** Draw order inside a cluster: statutes core, regulations around
 *  them, policies at the rim, anything unknown last. */
const BUCKET_ORDER: Record<string, number> = {
  statutes: 0,
  regulations: 1,
  policies: 2,
};

function bucketRank(bucket: string): number {
  return BUCKET_ORDER[bucket] ?? 3;
}

/**
 * Dot radius in abstract units: area tracks rule count (sqrt scaling)
 * so a 60-rule subtree reads bigger without drowning the field, and a
 * 0-rule module stays visible.
 */
export function dotRadius(ruleCount: number): number {
  return Math.min(6.5, 1.15 + Math.sqrt(Math.max(ruleCount, 0)) * 0.5);
}

/** The always-visible doors into the field: real, runnable law. */
export const FIELD_HIGHLIGHTS: ReadonlyArray<{
  target: string;
  label: string;
}> = [
  {
    target: "us:regulations/7-cfr/273/10",
    label: "SNAP allotment machinery",
  },
  {
    target: "us:statutes/7/2014/e/6/A",
    label: "Net income · 7 USC 2014(e)(6)",
  },
  {
    target: "us:policies/usda/snap/fy-2026-cola/maximum-allotments",
    label: "FY-2026 maximum allotments",
  },
  { target: "us:regulations/7-cfr/273/8", label: "Resources test" },
  { target: "us:regulations/7-cfr/273/24", label: "Work requirement" },
  {
    target: "us-ny:regulations/18-nycrr/387/14/a/5",
    label: "NY categorical eligibility",
  },
];

export interface FieldDot {
  target: string;
  jurisdiction: string;
  bucket: string;
  ruleCount: number;
  x: number;
  y: number;
  r: number;
  color: string;
  highlightLabel: string | null;
}

export interface FieldCluster {
  jurisdiction: string;
  x: number;
  y: number;
  r: number;
  moduleCount: number;
  ruleCount: number;
}

export interface FieldLayout {
  width: number;
  height: number;
  dots: FieldDot[];
  clusters: FieldCluster[];
}

/** Clusters with at least this many modules earn a text label —
 *  labelling all 52 jurisdictions would wallpaper the field. */
export const CLUSTER_LABEL_MIN_MODULES = 20;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface PackedCluster {
  jurisdiction: string;
  modules: CorpusModule[];
  clusterR: number;
  x: number;
  y: number;
}

/**
 * Phyllotaxis positions for one cluster's dots, bucket-sorted so each
 * bucket forms a contiguous ring band (statutes core → policies rim).
 * Returns offsets relative to the cluster center plus the packed
 * radius actually used.
 */
function placeClusterDots(
  modules: CorpusModule[],
): { offsets: Array<{ dx: number; dy: number }>; radius: number } {
  const sorted = [...modules].sort(
    (a, b) =>
      bucketRank(a.bucket) - bucketRank(b.bucket) ||
      b.ruleCount - a.ruleCount ||
      a.target.localeCompare(b.target),
  );
  const meanR =
    sorted.reduce((sum, m) => sum + dotRadius(m.ruleCount), 0) /
    Math.max(sorted.length, 1);
  const spacing = meanR * 2.05;
  const offsets: Array<{ dx: number; dy: number }> = [];
  let radius = 0;
  sorted.forEach((_, index) => {
    const r = spacing * Math.sqrt(index + 0.4);
    const theta = index * GOLDEN_ANGLE;
    offsets.push({ dx: Math.cos(theta) * r, dy: Math.sin(theta) * r });
    radius = Math.max(radius, r);
  });
  return { offsets, radius: radius + meanR * 1.6, };
}

/**
 * Greedy circle packing: biggest cluster first at the field center,
 * every next cluster walks an outward spiral until it fits without
 * overlapping anything already placed. Deterministic; the x-axis is
 * stretched to fill the field's landscape aspect.
 */
function packClusters(
  clusters: Array<{ jurisdiction: string; modules: CorpusModule[]; clusterR: number }>,
): PackedCluster[] {
  const aspect = FIELD_WIDTH / FIELD_HEIGHT;
  const placed: PackedCluster[] = [];
  const ordered = [...clusters].sort(
    (a, b) =>
      b.clusterR - a.clusterR || a.jurisdiction.localeCompare(b.jurisdiction),
  );
  for (const cluster of ordered) {
    if (placed.length === 0) {
      placed.push({ ...cluster, x: 0, y: 0 });
      continue;
    }
    let t = 0;
    // Spiral search: angle advances by the golden angle, radius grows
    // slowly; the first collision-free spot wins.
    for (let step = 0; step < 20000; step += 1) {
      t += 0.6;
      const angle = step * GOLDEN_ANGLE;
      const x = Math.cos(angle) * t * aspect * 0.55;
      const y = Math.sin(angle) * t * 0.55;
      const pad = 6;
      const collides = placed.some(
        (other) =>
          Math.hypot(other.x - x, other.y - y) <
          other.clusterR + cluster.clusterR + pad,
      );
      if (!collides) {
        placed.push({ ...cluster, x, y });
        break;
      }
    }
    if (placed[placed.length - 1]?.jurisdiction !== cluster.jurisdiction) {
      // Spiral exhausted (cannot happen with sane data) — stack at
      // the rim rather than dropping a jurisdiction silently.
      placed.push({ ...cluster, x: 0, y: 0 });
    }
  }
  return placed;
}

/**
 * Build the whole field: cluster per jurisdiction, dot per module,
 * everything fit-transformed into FIELD_WIDTH × FIELD_HEIGHT.
 */
export function buildFieldLayout(modules: CorpusModule[]): FieldLayout {
  const byJurisdiction = new Map<string, CorpusModule[]>();
  for (const module of modules) {
    const list = byJurisdiction.get(module.jurisdiction);
    if (list) list.push(module);
    else byJurisdiction.set(module.jurisdiction, [module]);
  }

  const packedInput = [...byJurisdiction.entries()].map(
    ([jurisdiction, members]) => {
      const { radius } = placeClusterDots(members);
      return { jurisdiction, modules: members, clusterR: radius };
    },
  );
  const packed = packClusters(packedInput);

  // Fit everything into the field rectangle with a margin.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const cluster of packed) {
    minX = Math.min(minX, cluster.x - cluster.clusterR);
    maxX = Math.max(maxX, cluster.x + cluster.clusterR);
    minY = Math.min(minY, cluster.y - cluster.clusterR);
    maxY = Math.max(maxY, cluster.y + cluster.clusterR);
  }
  if (packed.length === 0) {
    return { width: FIELD_WIDTH, height: FIELD_HEIGHT, dots: [], clusters: [] };
  }
  const scale = Math.min(
    (FIELD_WIDTH - FIELD_MARGIN * 2) / Math.max(maxX - minX, 1),
    (FIELD_HEIGHT - FIELD_MARGIN * 2) / Math.max(maxY - minY, 1),
  );
  const offsetX =
    FIELD_WIDTH / 2 - ((minX + maxX) / 2) * scale;
  const offsetY =
    FIELD_HEIGHT / 2 - ((minY + maxY) / 2) * scale;

  const highlightByTarget = new Map(
    FIELD_HIGHLIGHTS.map((entry) => [entry.target, entry.label]),
  );

  const dots: FieldDot[] = [];
  const clusters: FieldCluster[] = [];
  for (const cluster of packed) {
    const { offsets } = placeClusterDots(cluster.modules);
    const sortedModules = [...cluster.modules].sort(
      (a, b) =>
        bucketRank(a.bucket) - bucketRank(b.bucket) ||
        b.ruleCount - a.ruleCount ||
        a.target.localeCompare(b.target),
    );
    const cx = cluster.x * scale + offsetX;
    const cy = cluster.y * scale + offsetY;
    sortedModules.forEach((module, index) => {
      const offset = offsets[index]!;
      const highlightLabel = highlightByTarget.get(module.target) ?? null;
      const baseR = dotRadius(module.ruleCount) * scale;
      dots.push({
        target: module.target,
        jurisdiction: module.jurisdiction,
        bucket: module.bucket,
        ruleCount: module.ruleCount,
        x: cx + offset.dx * scale,
        y: cy + offset.dy * scale,
        // Every dot survives the fit-shrink; highlighted doors get a
        // guaranteed presence even inside a dense cluster.
        r: Math.max(baseR, highlightLabel ? 5 : 0.8),
        color: bucketColor(module.bucket),
        highlightLabel,
      });
    });
    clusters.push({
      jurisdiction: cluster.jurisdiction,
      x: cx,
      y: cy,
      r: cluster.clusterR * scale,
      moduleCount: cluster.modules.length,
      ruleCount: cluster.modules.reduce((sum, m) => sum + m.ruleCount, 0),
    });
  }

  return { width: FIELD_WIDTH, height: FIELD_HEIGHT, dots, clusters };
}

/**
 * Nearest dot under the pointer, in field coordinates. `slack` widens
 * every dot's ring so 1-unit dots are actually hoverable; among
 * candidates the closest center wins, ties to the smaller dot so a
 * giant neighbour can't swallow a small one.
 */
export function hitTestDot(
  dots: FieldDot[],
  x: number,
  y: number,
  slack = 3,
): FieldDot | null {
  let best: FieldDot | null = null;
  let bestDist = Infinity;
  for (const dot of dots) {
    const dist = Math.hypot(dot.x - x, dot.y - y);
    if (dist > dot.r + slack) continue;
    if (dist < bestDist || (dist === bestDist && best && dot.r < best.r)) {
      best = dot;
      bestDist = dist;
    }
  }
  return best;
}

export interface CorpusFieldStats {
  subtrees: number;
  rules: number;
}

export function corpusFieldStats(modules: CorpusModule[]): CorpusFieldStats {
  return {
    subtrees: modules.length,
    rules: modules.reduce((sum, m) => sum + m.ruleCount, 0),
  };
}

/**
 * The one honest sentence under the field. Counts come from the
 * census file, never hardcoded; rules round to the nearest hundred
 * because the census moves faster than the copy.
 */
export function fieldStatLine(stats: CorpusFieldStats): string {
  const subtrees = stats.subtrees.toLocaleString("en-US");
  const rules = (Math.round(stats.rules / 100) * 100).toLocaleString("en-US");
  return `${subtrees} provision-rooted subtrees · ~${rules} encoded rules · every node cites its law`;
}

/** The in-app compose viewer link for one subtree. */
export function fieldComposeHref(target: string): string {
  return `/axiom/graph?compose=${encodeURIComponent(target)}`;
}
