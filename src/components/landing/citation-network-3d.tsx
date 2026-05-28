"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* The corpus, rendered as a universe.
 *
 * At scroll 0 the camera sits far back so the whole field reads as a
 * night sky of citations — a torus of statute references near the
 * centre, satellite clusters of related rules scattered in 3D space,
 * and a low-opacity field of background nodes for depth.
 *
 * Scrolling flies the camera along a path of waypoints, zooming into
 * each cluster in turn. Each cluster has its own shape (torus, helix,
 * sphere, lattice) and its own labeled statutes.
 *
 * Drawn on Canvas because ~180 nodes × 60fps × React reconciliation in
 * SVG would stutter on lower-end machines. Hover works via a window
 * mousemove listener that hit-tests against projected positions, so
 * the canvas can stay `pointer-events: none` and never steal clicks
 * from hero buttons / links underneath.
 */

/* Every node label is a real citation — a statute, an enacted bill, or
 * a regulatory / policy section. Drawn from US, UK, and Canadian
 * sources so the universe reads as multi-jurisdictional, matching what
 * Axiom actually indexes. */
const CITATION_LABELS = [
  // US statutes (United States Code)
  "26 USC § 24",
  "26 USC § 32",
  "26 USC § 36B",
  "26 USC § 152",
  "26 USC § 162",
  "26 USC § 219",
  "26 USC § 401(k)",
  "26 USC § 408",
  "26 USC § 6428",
  "26 USC § 7702",
  "26 USC § 117",
  "26 USC § 25A",
  "26 USC § 121",
  "26 USC § 951A",
  "20 USC § 1087",
  "42 USC § 601",
  "42 USC § 1396a",
  "42 USC § 1397",
  "5 USC § 552",
  // US legislation (public laws)
  "Pub. L. 117-2",
  "Pub. L. 116-260",
  "Pub. L. 115-97",
  "Pub. L. 119-21",
  "Pub. L. 111-148",
  // US regulations (CFR)
  "Reg. § 1.151-3",
  "Reg. § 1.401(k)-1",
  "Reg. § 1.32-2",
  "29 CFR § 825",
  "7 CFR § 273",
  // UK statutes
  "ITA 2007 s.118",
  "ITEPA 2003 s.4",
  "TCGA 1992 s.222",
  "FA 2024 s.27",
  // Canadian statutes
  "ITA s.118",
  "ITA s.122.6",
  "EI Act s.7",
  "OAS Act s.3",
];

function labelForDepth(_depth: number, _maxDepth: number, i: number): string {
  return CITATION_LABELS[i % CITATION_LABELS.length];
}

type Vec3 = { x: number; y: number; z: number };
type Node3 = Vec3 & { label: string; cluster: number };
type Edge = { a: number; b: number };

type Cluster = {
  id: number;
  center: Vec3;
  startIdx: number;
  endIdx: number;
};

/* Deterministic PRNG so the universe is identical every render — no
 * hydration mismatch and no jitter between client navigations. */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* Recursive 3D decision-tree builder.
 *
 * Each branch fans out in `branchFactor` children, distributed
 * angularly around vertical with a small random jitter. Spread
 * shrinks with depth so the form looks organic — wider near the root,
 * tighter near the leaves. Vertical step is uniform so the levels
 * stack readably when viewed from any angle.
 */
function buildDecisionTree(
  nodes: Node3[],
  edges: Edge[],
  clusterId: number,
  rng: () => number,
  center: Vec3,
  opts: {
    maxDepth: number;
    branchFactor: number;
    height: number;
    initialSpread: number;
    /** Spread × spreadShrink per level of descent. */
    spreadShrink: number;
    /** Local rotation applied to all children, in radians. */
    rotation?: number;
    /** From this depth onward, each node has this probability of
     * terminating early (becoming a leaf even though deeper levels
     * exist). Lets the tree have mixed-depth leaves, not just a
     * uniform bottom layer. */
    earlyTerminationProb?: number;
    earlyTerminationMinDepth?: number;
  }
): { startIdx: number; endIdx: number } {
  const startIdx = nodes.length;
  const stepY = opts.height / Math.max(1, opts.maxDepth - 1);
  const earlyProb = opts.earlyTerminationProb ?? 0;
  const earlyMinDepth = opts.earlyTerminationMinDepth ?? 2;

  // Root sits at the top of the tree (highest y), branches descend
  const rootIdx = nodes.length;
  nodes.push({
    x: center.x,
    y: center.y + opts.height / 2,
    z: center.z,
    label: labelForDepth(0, opts.maxDepth, 0),
    cluster: clusterId,
  });

  type Pending = { idx: number; depth: number; spread: number; parentAngle: number };
  const stack: Pending[] = [
    { idx: rootIdx, depth: 0, spread: opts.initialSpread, parentAngle: opts.rotation ?? 0 },
  ];
  let leafCount = 0;

  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.depth >= opts.maxDepth - 1) continue;
    // Mid-tree early termination: this node has no children even
    // though deeper levels exist. Allowed all the way down to the
    // parent-of-leaves so the bottom row isn't uniformly dense.
    if (
      cur.depth >= earlyMinDepth &&
      cur.depth < opts.maxDepth - 1 &&
      rng() < earlyProb
    ) {
      continue;
    }
    const parent = nodes[cur.idx];
    for (let b = 0; b < opts.branchFactor; b++) {
      // Even angular distribution around vertical, with parent's rotation
      // inherited and a small jitter so the tree feels grown rather than
      // generated.
      const baseAngle =
        (b / opts.branchFactor) * Math.PI * 2 +
        cur.parentAngle * 0.3 +
        (rng() - 0.5) * 0.55;
      const radius = cur.spread * (0.9 + rng() * 0.2);
      const child: Node3 = {
        x: parent.x + Math.cos(baseAngle) * radius,
        y: parent.y - stepY * (0.9 + rng() * 0.25),
        z: parent.z + Math.sin(baseAngle) * radius,
        label: "",
        cluster: clusterId,
      };
      const childIdx = nodes.length;
      const isLeaf = cur.depth + 1 >= opts.maxDepth - 1;
      child.label = labelForDepth(cur.depth + 1, opts.maxDepth, isLeaf ? leafCount++ : childIdx);
      nodes.push(child);
      edges.push({ a: cur.idx, b: childIdx });
      stack.push({
        idx: childIdx,
        depth: cur.depth + 1,
        spread: cur.spread * opts.spreadShrink,
        parentAngle: baseAngle,
      });
    }
  }

  return { startIdx, endIdx: nodes.length };
}

function makeUniverse(): { nodes: Node3[]; edges: Edge[]; clusters: Cluster[] } {
  const nodes: Node3[] = [];
  const edges: Edge[] = [];
  const clusters: Cluster[] = [];
  const rng = makeRng(20260527);

  /* One 3D decision tree — the corpus, as a single graph. Depth 4 /
   * ternary branching gives 40 nodes (1 + 3 + 9 + 27): every
   * intermediate node has three dependents, so the dive-in moment
   * shows a real fan-out of citations. */
  {
    const center = { x: 0, y: 0, z: 0 };
    const { startIdx, endIdx } = buildDecisionTree(nodes, edges, 0, rng, center, {
      maxDepth: 5,
      branchFactor: 3,
      height: 5.2,
      initialSpread: 2.6,
      spreadShrink: 0.55,
      // ~50% of depth-2 nodes terminate early, so the tree has
      // mid-level leaves alongside the deeper ones
      earlyTerminationProb: 0.5,
      earlyTerminationMinDepth: 2,
    });
    clusters.push({ id: 0, center, startIdx, endIdx });
  }

  /* A sparse field of background stars for depth — kept off the main
   * tree's volume so they don't clutter the zoomed-in views. */
  {
    const main = clusters[0];
    let added = 0;
    let safety = 0;
    while (added < 20 && safety < 2000) {
      safety++;
      const x = (rng() - 0.5) * 50;
      const y = (rng() - 0.5) * 26;
      const z = (rng() - 0.5) * 50 - 4;
      if (Math.hypot(x - main.center.x, y - main.center.y, z - main.center.z) < 10) {
        continue;
      }
      nodes.push({ x, y, z, label: "", cluster: -1 });
      added++;
    }
  }

  return { nodes, edges, clusters };
}

/* Pick a single intermediate node from the tree to focus on in the
 * Gap-section zoom. Deterministic from the build above so the camera
 * always aims at the same node. Returns its position in world space.
 * (We pick a depth-2 node so it has several depth-3 children we can
 * see fanning out around the section copy.) */
function pickFocusNode(nodes: Node3[], clusters: Cluster[]): Vec3 {
  const main = clusters[0];
  // Root is at startIdx. Its children are the first `branchFactor`
  // nodes pushed after the root by the depth-first build. We pick
  // a grandchild to focus on — far enough from the root that the
  // camera move feels like a real dive into the tree.
  const target = nodes[main.startIdx + 3] ?? nodes[main.startIdx + 1] ?? nodes[main.startIdx];
  return { x: target.x, y: target.y, z: target.z };
}

/* ── Camera waypoints ────────────────────────────────────────────
 * Each waypoint is a (camPos, lookAt, focusCluster) at a given scroll
 * fraction. Between adjacent waypoints we smoothstep-interpolate.
 */
type Waypoint = {
  scroll: number;
  camPos: Vec3;
  lookAt: Vec3;
  focusCluster: number;
  /** Horizontal projection centre as a fraction of viewport width.
   * Lets the visual shift between right-anchored (hero) and centred
   * (text-heavy sections) without moving the tree in world space. */
  cxFrac: number;
};

/* Waypoints are filled in at runtime so the Gap-section zoom can use
 * the dynamically picked focus node. See useMemo in the component. */

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function interpolateCamera(
  waypoints: Waypoint[],
  scroll: number
): { camPos: Vec3; lookAt: Vec3; focusCluster: number; cxFrac: number } {
  let i = 0;
  while (i < waypoints.length - 1 && scroll >= waypoints[i + 1].scroll) i++;
  const a = waypoints[i];
  const b = waypoints[Math.min(i + 1, waypoints.length - 1)];
  const span = b.scroll - a.scroll;
  const tRaw = span > 0 ? (scroll - a.scroll) / span : 1;
  const t = smoothstep(Math.max(0, Math.min(1, tRaw)));
  return {
    camPos: {
      x: a.camPos.x + (b.camPos.x - a.camPos.x) * t,
      y: a.camPos.y + (b.camPos.y - a.camPos.y) * t,
      z: a.camPos.z + (b.camPos.z - a.camPos.z) * t,
    },
    lookAt: {
      x: a.lookAt.x + (b.lookAt.x - a.lookAt.x) * t,
      y: a.lookAt.y + (b.lookAt.y - a.lookAt.y) * t,
      z: a.lookAt.z + (b.lookAt.z - a.lookAt.z) * t,
    },
    focusCluster: t > 0.5 ? b.focusCluster : a.focusCluster,
    cxFrac: a.cxFrac + (b.cxFrac - a.cxFrac) * t,
  };
}

function computeViewBasis(camPos: Vec3, lookAt: Vec3) {
  let fx = lookAt.x - camPos.x;
  let fy = lookAt.y - camPos.y;
  let fz = lookAt.z - camPos.z;
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;
  // right = normalize(cross(forward, worldUp)) with worldUp = (0,1,0)
  let rx = fy * 0 - fz * 1;
  let ry = fz * 0 - fx * 0;
  let rz = fx * 1 - fy * 0;
  const rLen = Math.hypot(rx, ry, rz) || 1;
  rx /= rLen;
  ry /= rLen;
  rz /= rLen;
  // up = cross(right, forward)
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;
  return { fx, fy, fz, rx, ry, rz, ux, uy, uz };
}

export function CitationNetwork3D() {
  const { nodes, edges, clusters } = useMemo(() => makeUniverse(), []);
  /* Parent map: for each node, the index of its parent in the
   * decision tree (or -1 if it's a root / background star). Used to
   * trace the upstream path for the "firing" animation. */
  const parents = useMemo(() => {
    const p: number[] = new Array(nodes.length).fill(-1);
    for (const e of edges) {
      if (nodes[e.a].cluster < 0 || nodes[e.b].cluster < 0) continue;
      // buildDecisionTree pushes child edges as { a: parent, b: child }
      p[e.b] = e.a;
    }
    return p;
  }, [nodes, edges]);
  /* Spawn-eligible nodes — anything that has a parent (i.e. not the
   * root or a stray background star). */
  const spawnable = useMemo(() => {
    const s: number[] = [];
    for (let i = 0; i < parents.length; i++) {
      if (parents[i] >= 0) s.push(i);
    }
    return s;
  }, [parents]);
  /* Build the waypoint list from the actual tree — the Gap-section
   * zoom centres on a specific intermediate node so its dependents
   * fan out around the section text. */
  const waypoints: Waypoint[] = useMemo(() => {
    const focus = pickFocusNode(nodes, clusters);
    return [
      // Hero: tree floating to the right of the headline, full
      // structure visible
      {
        scroll: 0.00,
        camPos: { x: 0, y: 0, z: 8.5 },
        lookAt: { x: 0, y: 0, z: 0 },
        focusCluster: 0,
        cxFrac: 0.72,
      },
      // Gap section: dive into the focus node, projection centred so
      // its dependents wrap around the centred section text
      {
        scroll: 0.18,
        camPos: { x: focus.x * 0.4, y: focus.y * 0.6, z: focus.z + 5 },
        lookAt: focus,
        focusCluster: 0,
        cxFrac: 0.5,
      },
      // Orbit right — camera stays in front of the tree (positive z),
      // tree appears slightly tilted as the viewing angle shifts
      {
        scroll: 0.42,
        camPos: { x: 5, y: -1.5, z: 6 },
        lookAt: { x: 0, y: 0, z: 0 },
        focusCluster: 0,
        cxFrac: 0.5,
      },
      // Orbit left — symmetric pass on the other side
      {
        scroll: 0.65,
        camPos: { x: -5, y: 1.5, z: 6 },
        lookAt: { x: 0, y: 0, z: 0 },
        focusCluster: 0,
        cxFrac: 0.5,
      },
      // Pulling away — camera retreats after Applications section
      {
        scroll: 0.82,
        camPos: { x: 0, y: 1, z: 16 },
        lookAt: { x: 0, y: 0, z: 0 },
        focusCluster: 0,
        cxFrac: 0.5,
      },
      // Fully pulled back — graph is too far to read, opacity also
      // fades to 0 over this range so it disappears entirely
      {
        scroll: 1.00,
        camPos: { x: 0, y: 0, z: 60 },
        lookAt: { x: 0, y: 0, z: 0 },
        focusCluster: 0,
        cxFrac: 0.5,
      },
    ];
  }, [nodes, clusters]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetScrollRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetScrollRef.current = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let smoothScroll = 0;
    const startT = performance.now();
    let last = startT;

    const projected: { sx: number; sy: number; z: number; nodeIdx: number }[] = new Array(nodes.length);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let hoveredLocal: number | null = null;

    /* Firing animation state — each "firing" lights up the edges
     * along the upstream parent chain. The current segment fills in
     * progressively from the downstream node toward its parent;
     * already-traversed segments stay lit. When the path reaches the
     * root, the whole chain glows briefly then fades out. */
    type Firing = {
      path: number[]; // [start, ..., root]
      idx: number; // current segment index (path[idx] → path[idx+1])
      progress: number; // 0..1 along current segment
      pauseMs: number; // ms remaining at current node
      fadeOutMs: number; // > 0 while fading out after reaching root
    };
    const firings: Firing[] = [];
    let nextSpawnMs = 800;
    const PAUSE_AT_NODE_MS = 180;
    const SEGMENTS_PER_SEC = 0.65;
    const FADE_OUT_MS = 700;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(64, now - last);
      last = now;

      // Critically-damped lerp toward target scroll
      const target = targetScrollRef.current;
      smoothScroll += (target - smoothScroll) * (1 - Math.exp(-dt * 0.008));
      const t = reduced ? 0 : (now - startT) / 1000;

      const { camPos, lookAt, focusCluster, cxFrac } = interpolateCamera(
        waypoints,
        smoothScroll
      );
      const basis = computeViewBasis(camPos, lookAt);

      const w = window.innerWidth;
      const h = window.innerHeight;
      const FOCAL = Math.min(w, h) * 0.9;
      /* Projection centre comes from the waypoint — right-of-centre
       * during the hero, centred for the text-heavy sections. On
       * narrow screens we always centre so the tree never clips off
       * the right edge. */
      const cx = w * (w < 900 ? 0.5 : cxFrac);
      const cy = h / 2;

      // Project all nodes (apply ambient rotation around Y so structures
      // never look frozen)
      const rotY = t * 0.04;
      const cosRY = Math.cos(rotY);
      const sinRY = Math.sin(rotY);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // Rotate around the focus cluster centre if we're locked onto one,
        // otherwise around world origin. Subtle, just keeps things alive.
        const cluster = clusters[n.cluster] ?? null;
        const centre = cluster ? cluster.center : { x: 0, y: 0, z: 0 };
        const lx = n.x - centre.x;
        const lz = n.z - centre.z;
        const rx = lx * cosRY + lz * sinRY + centre.x;
        const rz = -lx * sinRY + lz * cosRY + centre.z;
        const ry = n.y;

        const dx = rx - camPos.x;
        const dy = ry - camPos.y;
        const dz = rz - camPos.z;
        const viewZ = dx * basis.fx + dy * basis.fy + dz * basis.fz;
        if (viewZ <= 0.05) {
          projected[i] = { sx: -9999, sy: -9999, z: viewZ, nodeIdx: i };
          continue;
        }
        const viewX = dx * basis.rx + dy * basis.ry + dz * basis.rz;
        const viewY = dx * basis.ux + dy * basis.uy + dz * basis.uz;
        projected[i] = {
          sx: cx + (viewX * FOCAL) / viewZ,
          sy: cy - (viewY * FOCAL) / viewZ,
          z: viewZ,
          nodeIdx: i,
        };
      }

      // Hit test for hover
      const mouse = mouseRef.current;
      let newHover: number | null = null;
      if (mouse) {
        let bestDist = 24; // px
        for (let i = 0; i < nodes.length; i++) {
          const p = projected[i];
          if (p.z <= 0) continue;
          if (nodes[i].cluster < 0) continue; // skip background stars
          const dx = p.sx - mouse.x;
          const dy = p.sy - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < bestDist) {
            bestDist = d;
            newHover = i;
          }
        }
      }
      hoveredLocal = newHover;

      // ── Draw ──
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      /* Two-stage opacity. The first stage softens the graph past
       * the hero so it doesn't bite into body copy. The second stage
       * fades it out entirely after the Applications section so the
       * Foundation section reads cleanly without any background. */
      const fadeRaw = (smoothScroll - 0.06) / 0.08;
      const fade = Math.max(0, Math.min(1, fadeRaw));
      const disappearRaw = (smoothScroll - 0.78) / 0.10;
      const disappear = Math.max(0, Math.min(1, disappearRaw));
      const graphOpacity = (1 - fade * 0.55) * (1 - disappear);
      if (graphOpacity < 0.005) {
        raf = requestAnimationFrame(tick);
        return;
      }
      ctx.globalAlpha = graphOpacity;

      // Sort edges back-to-front so near edges draw on top
      const edgeOrder = edges
        .map((e, idx) => {
          const a = projected[e.a];
          const b = projected[e.b];
          return { idx, avgZ: (a.z + b.z) / 2 };
        })
        .sort((x, y) => y.avgZ - x.avgZ);

      for (const eo of edgeOrder) {
        const e = edges[eo.idx];
        const pa = projected[e.a];
        const pb = projected[e.b];
        if (pa.z <= 0 || pb.z <= 0) continue;
        const depthFactor = 1 / Math.max(1, eo.avgZ * 0.4);
        const alpha = Math.max(0.04, Math.min(0.55, depthFactor * 0.5));
        ctx.strokeStyle = `rgba(146,64,14,${alpha})`;
        ctx.lineWidth = Math.max(0.3, depthFactor * 1.2);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // Sort nodes back-to-front
      const nodeOrder = projected
        .map((p, i) => ({ i, z: p.z }))
        .sort((x, y) => y.z - x.z);

      for (const no of nodeOrder) {
        const p = projected[no.i];
        if (p.z <= 0) continue;
        const node = nodes[no.i];
        const isBg = node.cluster < 0;
        const isHover = hoveredLocal === no.i;
        /* sizeFactor falls off gently with depth so far nodes still
         * read as small circles instead of disappearing into the grain. */
        const sizeFactor = 1 / Math.max(1, p.z * 0.22);
        const baseR = isBg ? Math.max(0.8, sizeFactor * 1.8) : Math.max(2.2, sizeFactor * 5.5);
        const r = isHover ? baseR * 1.7 : baseR;
        const alpha = Math.min(1, Math.max(0.2, sizeFactor * (isBg ? 0.9 : 1.2)));

        // Halo
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = isBg
          ? `rgba(146,64,14,${alpha * 0.06})`
          : `rgba(146,64,14,${alpha * 0.15})`;
        ctx.fill();

        // Main dot
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = isBg
          ? `rgba(146,64,14,${alpha * 0.55})`
          : `rgba(146,64,14,${Math.min(1, alpha * 0.95 + (isHover ? 0.2 : 0))})`;
        ctx.fill();

        // Pulsing ring on hover
        if (isHover) {
          const pulse = 1 + 0.7 * Math.sin(t * 4);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 2.4 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(146,64,14,${0.18 * (1 - (pulse - 1) / 0.7)})`;
          ctx.fill();
        }
      }

      // Labels — only for focused cluster (or hovered)
      ctx.font = '500 12px var(--f-mono, ui-monospace, monospace)';
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      for (const no of nodeOrder) {
        const p = projected[no.i];
        if (p.z <= 0) continue;
        const node = nodes[no.i];
        if (node.cluster < 0) continue;
        const isFocus = focusCluster === node.cluster;
        const isHover = hoveredLocal === no.i;
        if (!isFocus && !isHover) continue;
        const sizeFactor = 1 / Math.max(1, p.z * 0.4);
        const labelAlpha = isHover
          ? 0.95
          : Math.max(0, Math.min(0.85, sizeFactor * 0.85));
        if (labelAlpha < 0.08) continue;
        const r = Math.max(1.4, sizeFactor * 3.5);
        ctx.fillStyle = isHover
          ? `rgba(146,64,14,${labelAlpha})`
          : `rgba(28,25,23,${labelAlpha * 0.78})`;
        ctx.fillText(node.label, p.sx + r + 6, p.sy + 0.5);
      }

      /* ── Firing animations ─────────────────────────────────────
       * Each firing lights up an upstream path one edge at a time.
       * The current edge fills in from downstream end → upstream end;
       * already-traversed edges stay lit until the whole path fades. */
      const sinceStartMs = now - startT;
      if (sinceStartMs >= nextSpawnMs && spawnable.length > 0) {
        const seed = spawnable[Math.floor(Math.random() * spawnable.length)];
        const path: number[] = [seed];
        let cur = seed;
        while (parents[cur] >= 0) {
          cur = parents[cur];
          path.push(cur);
        }
        if (path.length >= 2) {
          firings.push({ path, idx: 0, progress: 0, pauseMs: 0, fadeOutMs: 0 });
        }
        nextSpawnMs = sinceStartMs + 1500 + Math.random() * 2000;
      }

      const dtSec = dt / 1000;
      for (let fi = firings.length - 1; fi >= 0; fi--) {
        const fire = firings[fi];
        if (fire.fadeOutMs > 0) {
          fire.fadeOutMs -= dt;
          if (fire.fadeOutMs <= 0) firings.splice(fi, 1);
          continue;
        }
        if (fire.pauseMs > 0) {
          fire.pauseMs -= dt;
          continue;
        }
        fire.progress += dtSec * SEGMENTS_PER_SEC;
        if (fire.progress >= 1) {
          fire.idx++;
          if (fire.idx >= fire.path.length - 1) {
            // Full path lit — hold briefly, then fade out
            fire.progress = 1;
            fire.fadeOutMs = FADE_OUT_MS;
            continue;
          }
          fire.progress = 0;
          fire.pauseMs = PAUSE_AT_NODE_MS;
        }
      }

      /* Render firings as a moving "comet" along the path — bright
       * head, fading tail. Spans across segment boundaries so the
       * pulse appears to flow continuously rather than restart at
       * each node. */
      ctx.lineCap = "round";
      const TAIL_LENGTH = 0.7; // in path-coordinate units (segments)

      for (const fire of firings) {
        const fade = fire.fadeOutMs > 0 ? Math.max(0, fire.fadeOutMs / FADE_OUT_MS) : 1;
        const headPath = fire.idx + fire.progress;
        const tailPath = Math.max(0, headPath - TAIL_LENGTH);
        const totalLen = headPath - tailPath;
        if (totalLen <= 0.001) continue;

        // Walk the path and render the portion of each segment that
        // overlaps the comet's [tail, head] range. Per-segment we
        // build a linear gradient whose stops reflect the alpha curve
        // along the comet (0 at the tail end, 1 at the head end).
        for (let s = 0; s < fire.path.length - 1; s++) {
          const segOverlapStart = Math.max(s, tailPath);
          const segOverlapEnd = Math.min(s + 1, headPath);
          if (segOverlapStart >= segOverlapEnd) continue;

          const pa = projected[fire.path[s]];
          const pb = projected[fire.path[s + 1]];
          if (!pa || !pb || pa.z <= 0 || pb.z <= 0) continue;

          // Within-segment fractions (0..1)
          const fStart = segOverlapStart - s;
          const fEnd = segOverlapEnd - s;
          const sx = pa.sx + (pb.sx - pa.sx) * fStart;
          const sy = pa.sy + (pb.sy - pa.sy) * fStart;
          const ex = pa.sx + (pb.sx - pa.sx) * fEnd;
          const ey = pa.sy + (pb.sy - pa.sy) * fEnd;

          // Alpha position along the comet (0 = tail, 1 = head)
          const aStart = (segOverlapStart - tailPath) / totalLen;
          const aEnd = (segOverlapEnd - tailPath) / totalLen;

          // Three stacked strokes: outer halo / mid glow / bright core.
          // Each gets its own per-call gradient so colours fade
          // independently with the comet position.
          const stroke = (
            color: string,
            multStart: number,
            multEnd: number,
            width: number
          ) => {
            const g = ctx.createLinearGradient(sx, sy, ex, ey);
            g.addColorStop(0, color.replace("ALPHA", String(multStart * fade)));
            g.addColorStop(1, color.replace("ALPHA", String(multEnd * fade)));
            ctx.strokeStyle = g;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          };

          // Outer halo — subtle, like a soft glow
          stroke("rgba(217,119,6,ALPHA)", aStart * 0.10, aEnd * 0.10, 6);
          // Mid amber
          stroke("rgba(217,119,6,ALPHA)", aStart * 0.28, aEnd * 0.28, 2.2);
          // Bright cream core
          stroke("rgba(254,243,199,ALPHA)", aStart * 0.55, aEnd * 0.55, 1.0);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [nodes, edges, clusters, parents, spawnable, waypoints, reduced]);

  /* The canvas has pointer-events: none so it never intercepts clicks
   * meant for hero buttons / nav links sitting in front. Hover is
   * tracked via a separate window mousemove listener (above). */
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
