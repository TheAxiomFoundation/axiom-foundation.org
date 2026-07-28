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
  /** Rules referenced by / referencing anything corpus-wide. Zero =
   *  an all-standalone module (glossary definitions): field dust. */
  linkedRuleCount: number;
  importCount: number;
  /** Intra-corpus module targets this module imports (≤20). */
  imports?: string[];
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
 * Dot radius in abstract units: area tracks the LINKED rule count
 * (rules that actually participate in the corpus graph — sqrt
 * scaling) so an intricate subtree reads bigger without drowning the
 * field. All-standalone modules don't come through here: they render
 * as dust (see DUST_RADIUS).
 */
export function dotRadius(linkedRuleCount: number): number {
  return Math.min(6.5, 1.15 + Math.sqrt(Math.max(linkedRuleCount, 0)) * 0.5);
}

/** All-standalone modules (linkedRuleCount 0 — glossary-definition
 *  pages) render as minimal faint dust: visible, never highlighted. */
export const DUST_RADIUS = 0.7;

export function isDustModule(module: CorpusModule): boolean {
  return module.linkedRuleCount <= 0;
}

/** ── Computed doors ──
 * The always-visible entry points are the corpus's own largest /
 * most intricate subtrees, computed from the census — never a
 * hand-picked list. Score counts LINKED rules (glossary pages full
 * of unreferenced definitions don't get doors) with imports weighing
 * double; a per-jurisdiction cap keeps one giant corpus from
 * monopolizing every door. */
export const HIGHLIGHT_COUNT = 14;
export const HIGHLIGHT_MAX_PER_JURISDICTION = 3;

/** Roots known not to compile to an executable program (versioned
 *  formulas — engine#133). They stay on the field; they make poor
 *  doors. */
export const NON_COMPILING_ROOTS: ReadonlySet<string> = new Set([
  "us:statutes/42/1396a/a/10",
  "us:statutes/42/415/a",
  "us:statutes/42/415/b",
  "us:statutes/42/415/i",
]);

export function highlightScore(module: CorpusModule): number {
  return module.linkedRuleCount + 2 * module.importCount;
}

export function computeFieldHighlights(
  modules: CorpusModule[],
  count = HIGHLIGHT_COUNT,
  maxPerJurisdiction = HIGHLIGHT_MAX_PER_JURISDICTION,
): CorpusModule[] {
  const ranked = [...modules].sort(
    (a, b) =>
      highlightScore(b) - highlightScore(a) ||
      a.target.localeCompare(b.target),
  );
  const perJurisdiction = new Map<string, number>();
  const picked: CorpusModule[] = [];
  for (const module of ranked) {
    if (picked.length >= count) break;
    // Dust never gets a door, and neither do roots we know can't
    // execute. (Callers pass the mirror-authoritative module list, so
    // targets absent from the live mirror are already gone.)
    if (isDustModule(module)) continue;
    if (NON_COMPILING_ROOTS.has(module.target)) continue;
    const used = perJurisdiction.get(module.jurisdiction) ?? 0;
    if (used >= maxPerJurisdiction) continue;
    perJurisdiction.set(module.jurisdiction, used + 1);
    picked.push(module);
  }
  return picked;
}

export interface FieldDot {
  target: string;
  jurisdiction: string;
  bucket: string;
  ruleCount: number;
  linkedRuleCount: number;
  importCount: number;
  /** All-standalone module — rendered as faint dust. */
  dust: boolean;
  x: number;
  y: number;
  r: number;
  color: string;
  highlightLabel: string | null;
}

/** An import relation between two laid-out dots (indices into
 *  layout.dots). weight 2 = mutual import. */
export interface FieldLink {
  a: number;
  b: number;
  weight: number;
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
  /** Import filaments, drawn at mid zoom. */
  links: FieldLink[];
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
/** A module's abstract dot radius: linked-rule sized, or dust. */
function moduleRadius(module: CorpusModule): number {
  return isDustModule(module)
    ? DUST_RADIUS
    : dotRadius(module.linkedRuleCount);
}

/** One sort for offsets AND dot emission — they must stay aligned. */
function clusterSort(a: CorpusModule, b: CorpusModule): number {
  return (
    bucketRank(a.bucket) - bucketRank(b.bucket) ||
    b.linkedRuleCount - a.linkedRuleCount ||
    b.ruleCount - a.ruleCount ||
    a.target.localeCompare(b.target)
  );
}

function placeClusterDots(
  modules: CorpusModule[],
): { offsets: Array<{ dx: number; dy: number }>; radius: number } {
  const sorted = [...modules].sort(clusterSort);
  const meanR =
    sorted.reduce((sum, m) => sum + moduleRadius(m), 0) /
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
export function buildFieldLayout(
  modules: CorpusModule[],
  highlightLabels?: ReadonlyMap<string, string>,
): FieldLayout {
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
    return {
      width: FIELD_WIDTH,
      height: FIELD_HEIGHT,
      dots: [],
      clusters: [],
      links: [],
    };
  }
  const scale = Math.min(
    (FIELD_WIDTH - FIELD_MARGIN * 2) / Math.max(maxX - minX, 1),
    (FIELD_HEIGHT - FIELD_MARGIN * 2) / Math.max(maxY - minY, 1),
  );
  const offsetX =
    FIELD_WIDTH / 2 - ((minX + maxX) / 2) * scale;
  const offsetY =
    FIELD_HEIGHT / 2 - ((minY + maxY) / 2) * scale;

  const highlightByTarget =
    highlightLabels ?? new Map<string, string>();

  const dots: FieldDot[] = [];
  const clusters: FieldCluster[] = [];
  const moduleByDotIndex: CorpusModule[] = [];
  for (const cluster of packed) {
    const { offsets } = placeClusterDots(cluster.modules);
    const sortedModules = [...cluster.modules].sort(clusterSort);
    const cx = cluster.x * scale + offsetX;
    const cy = cluster.y * scale + offsetY;
    sortedModules.forEach((module, index) => {
      const offset = offsets[index]!;
      const highlightLabel = highlightByTarget.get(module.target) ?? null;
      const dust = isDustModule(module);
      const baseR = moduleRadius(module) * scale;
      moduleByDotIndex.push(module);
      dots.push({
        target: module.target,
        jurisdiction: module.jurisdiction,
        bucket: module.bucket,
        ruleCount: module.ruleCount,
        linkedRuleCount: module.linkedRuleCount,
        importCount: module.importCount,
        dust,
        x: cx + offset.dx * scale,
        y: cy + offset.dy * scale,
        // Every dot survives the fit-shrink; highlighted doors get a
        // guaranteed presence even inside a dense cluster. Dust stays
        // minimal by design.
        r: Math.max(baseR, highlightLabel ? 5 : dust ? 0.5 : 0.8),
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

  const links = buildFieldLinks(dots, moduleByDotIndex);
  applyImportAttraction(dots, clusters, links);

  return { width: FIELD_WIDTH, height: FIELD_HEIGHT, dots, clusters, links };
}

/** Import edges between laid-out dots, deduped; a mutual import
 *  carries weight 2. Deterministic: ordered by (a, b) dot index. */
function buildFieldLinks(
  dots: FieldDot[],
  modules: CorpusModule[],
): FieldLink[] {
  const indexByTarget = new Map(dots.map((dot, index) => [dot.target, index]));
  const weights = new Map<string, FieldLink>();
  modules.forEach((module, from) => {
    for (const imported of module.imports ?? []) {
      const to = indexByTarget.get(imported);
      if (to === undefined || to === from) continue;
      const a = Math.min(from, to);
      const b = Math.max(from, to);
      const key = `${a}:${b}`;
      const existing = weights.get(key);
      if (existing) existing.weight += 1;
      else weights.set(key, { a, b, weight: 1 });
    }
  });
  return [...weights.values()].sort((x, y) => x.a - y.a || x.b - y.b);
}

/* Import gravity: a light deterministic attraction pass — modules
 * that import each other drift toward one another (across clusters
 * they meet at the facing rims), then every dot is clamped back
 * inside its jurisdiction's territory so the document grouping
 * stays absolute. */
const ATTRACTION_PASSES = 12;
const ATTRACTION_STRENGTH = 0.055;

function applyImportAttraction(
  dots: FieldDot[],
  clusters: FieldCluster[],
  links: FieldLink[],
): void {
  if (links.length === 0) return;
  const clusterByJurisdiction = new Map(
    clusters.map((cluster) => [cluster.jurisdiction, cluster]),
  );
  for (let pass = 0; pass < ATTRACTION_PASSES; pass += 1) {
    for (const link of links) {
      const a = dots[link.a]!;
      const b = dots[link.b]!;
      const pull = ATTRACTION_STRENGTH * Math.min(link.weight, 2);
      const dx = (b.x - a.x) * pull;
      const dy = (b.y - a.y) * pull;
      a.x += dx;
      a.y += dy;
      b.x -= dx;
      b.y -= dy;
    }
    // Containment: the grouping is non-negotiable — pull any escapee
    // back to its cluster's rim.
    for (const link of links) {
      for (const index of [link.a, link.b]) {
        const dot = dots[index]!;
        const cluster = clusterByJurisdiction.get(dot.jurisdiction);
        if (!cluster) continue;
        const limit = Math.max(cluster.r - dot.r, cluster.r * 0.35);
        const dx = dot.x - cluster.x;
        const dy = dot.y - cluster.y;
        const dist = Math.hypot(dx, dy);
        if (dist > limit && dist > 0) {
          dot.x = cluster.x + (dx / dist) * limit;
          dot.y = cluster.y + (dy / dist) * limit;
        }
      }
    }
  }
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

/* ── LOD: from dots to a plane of graphs ──
 * Far out the field stays dots; past FILAMENT_ZOOM the import
 * filaments fade in; past MOTIF_ZOOM each subtree renders as a small
 * schematic node-and-edge motif derived from its census counts.
 * (The REAL graph still loads only on entry.) */
export const FILAMENT_ZOOM = 1.5;
export const MOTIF_ZOOM = 3.2;

export interface MotifNode {
  dx: number;
  dy: number;
  r: number;
}

/** Small deterministic hash for stable per-module motif rotation. */
function targetHash(target: string): number {
  let hash = 0;
  for (let i = 0; i < target.length; i += 1) {
    hash = (hash * 31 + target.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * The schematic mini-graph for one subtree: a hub plus satellites —
 * count scaled by linked rules, one extra marked satellite per
 * import (capped) — all inside the dot's own radius. Deterministic
 * per target (rotation from a target hash); dust gets no motif.
 */
export function motifSpec(dot: FieldDot): MotifNode[] {
  if (dot.dust) return [];
  const satellites = Math.min(
    8,
    2 +
      Math.round(Math.sqrt(Math.max(dot.linkedRuleCount, 1))) +
      Math.min(dot.importCount, 2),
  );
  const rotation =
    ((targetHash(dot.target) % 360) / 360) * Math.PI * 2;
  const orbit = dot.r * 0.62;
  const nodes: MotifNode[] = [];
  for (let i = 0; i < satellites; i += 1) {
    const angle = rotation + (i / satellites) * Math.PI * 2;
    nodes.push({
      dx: Math.cos(angle) * orbit,
      dy: Math.sin(angle) * orbit,
      r: Math.max(dot.r * 0.14, 0.35),
    });
  }
  return nodes;
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

/** Where the field's subtree list came from: the live rulespec
 *  mirror, or the committed census snapshot (fallback). */
export type CorpusSource = "live" | "snapshot";

/**
 * The one honest sentence under the field. Counts come from the data
 * actually shown, never hardcoded — and the line names its source:
 * the live mirror, or the committed snapshot when the mirror is
 * unreachable. Rule totals only appear for the snapshot (the live
 * list carries no per-subtree rule counts; merged sizes are partly
 * defaults, so quoting a total would be dishonest).
 */
export function fieldStatLine(
  stats: CorpusFieldStats,
  source: CorpusSource = "snapshot",
): string {
  const subtrees = stats.subtrees.toLocaleString("en-US");
  if (source === "live") {
    return `${subtrees} provision-rooted subtrees · live mirror · every node cites its law`;
  }
  const rules = (Math.round(stats.rules / 100) * 100).toLocaleString("en-US");
  return `${subtrees} provision-rooted subtrees · ~${rules} encoded rules · census snapshot`;
}

/* ── Live mirror merge ──
 * GET /v1/corpus/subtrees serves the live list (target, jurisdiction,
 * bucket — no sizes). The committed snapshot supplies ruleCount /
 * importCount for targets it knows; new targets get a modest default
 * dot so fresh law appears immediately without pretending to a size
 * we don't know. */

export interface LiveSubtree {
  target: string;
  jurisdiction: string;
  bucket: string;
}

export const DEFAULT_LIVE_RULE_COUNT = 3;
/** New law is presumed modest-but-linked: a small visible dot, not
 *  dust, until the next census sizes it honestly. */
export const DEFAULT_LIVE_LINKED_COUNT = 2;

export function mergeLiveSubtrees(
  snapshot: CorpusModule[],
  live: LiveSubtree[],
): CorpusModule[] {
  const byTarget = new Map(snapshot.map((module) => [module.target, module]));
  return live.map(
    (subtree) =>
      byTarget.get(subtree.target) ?? {
        target: subtree.target,
        jurisdiction: subtree.jurisdiction,
        bucket: subtree.bucket,
        ruleCount: DEFAULT_LIVE_RULE_COUNT,
        linkedRuleCount: DEFAULT_LIVE_LINKED_COUNT,
        importCount: 0,
        imports: [],
      },
  );
}

/** The in-app compose viewer link for one subtree. */
export function fieldComposeHref(target: string): string {
  return `/axiom/graph?compose=${encodeURIComponent(target)}`;
}

/* ── The open-world viewport ──
 * The field pans and zooms. A transform maps field coordinates to
 * "view" coordinates (same units as the field: the visible window is
 * always FIELD_WIDTH × FIELD_HEIGHT of view space, whatever the CSS
 * size): view = field · k + t. All math is pure and clamped so the
 * field always covers the whole window — no bare paper at the edges,
 * no zooming out past the overview. */

export interface FieldTransform {
  k: number;
  tx: number;
  ty: number;
}

export const IDENTITY_TRANSFORM: FieldTransform = { k: 1, tx: 0, ty: 0 };
export const MIN_FIELD_ZOOM = 1;
export const MAX_FIELD_ZOOM = 16;

function clampNumber(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Zoom clamped to [1, 16]; pan clamped so the (scaled) field always
 *  covers the viewport rectangle. */
export function clampFieldTransform(t: FieldTransform): FieldTransform {
  const k = clampNumber(t.k, MIN_FIELD_ZOOM, MAX_FIELD_ZOOM);
  return {
    k,
    tx: clampNumber(t.tx, FIELD_WIDTH * (1 - k), 0),
    ty: clampNumber(t.ty, FIELD_HEIGHT * (1 - k), 0),
  };
}

export function fieldToView(
  t: FieldTransform,
  x: number,
  y: number,
): { x: number; y: number } {
  return { x: x * t.k + t.tx, y: y * t.k + t.ty };
}

export function viewToField(
  t: FieldTransform,
  x: number,
  y: number,
): { x: number; y: number } {
  return { x: (x - t.tx) / t.k, y: (y - t.ty) / t.k };
}

/** Multiply zoom by `factor`, keeping the field point under the view
 *  point (vx, vy) stationary — the wheel/pinch anchor. */
export function zoomFieldAt(
  t: FieldTransform,
  factor: number,
  vx: number,
  vy: number,
): FieldTransform {
  const k = clampNumber(t.k * factor, MIN_FIELD_ZOOM, MAX_FIELD_ZOOM);
  const anchor = viewToField(t, vx, vy);
  return clampFieldTransform({
    k,
    tx: vx - anchor.x * k,
    ty: vy - anchor.y * k,
  });
}

/** Pan by a view-space delta (what the pointer dragged), clamped. */
export function panField(
  t: FieldTransform,
  dx: number,
  dy: number,
): FieldTransform {
  return clampFieldTransform({ k: t.k, tx: t.tx + dx, ty: t.ty + dy });
}

/**
 * The click-to-enter viewport for a dot: centered on the dot, zoomed
 * so its jurisdiction cluster roughly fills the window — "step into
 * this territory", not "microscope on one pixel".
 */
export function zoomTransformForDot(
  layout: FieldLayout,
  dot: FieldDot,
): FieldTransform {
  const cluster = layout.clusters.find(
    (item) => item.jurisdiction === dot.jurisdiction,
  );
  const clusterR = Math.max(cluster?.r ?? 60, 24);
  const k = clampNumber(
    (FIELD_HEIGHT * 0.85) / (clusterR * 2),
    2.5,
    MAX_FIELD_ZOOM,
  );
  return clampFieldTransform({
    k,
    tx: FIELD_WIDTH / 2 - dot.x * k,
    ty: FIELD_HEIGHT / 2 - dot.y * k,
  });
}

/**
 * Camera-path interpolation for the zoom animations: the scale moves
 * geometrically (equal zoom feel per frame) while the viewport-center
 * field point moves linearly. p ∈ [0, 1].
 */
export function interpolateTransform(
  from: FieldTransform,
  to: FieldTransform,
  p: number,
): FieldTransform {
  if (p <= 0) return from;
  if (p >= 1) return to;
  const k = from.k * Math.pow(to.k / from.k, p);
  const centerFrom = viewToField(from, FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
  const centerTo = viewToField(to, FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
  const cx = centerFrom.x + (centerTo.x - centerFrom.x) * p;
  const cy = centerFrom.y + (centerTo.y - centerFrom.y) * p;
  return clampFieldTransform({
    k,
    tx: FIELD_WIDTH / 2 - cx * k,
    ty: FIELD_HEIGHT / 2 - cy * k,
  });
}
