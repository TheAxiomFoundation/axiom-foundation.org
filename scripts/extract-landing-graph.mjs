#!/usr/bin/env node
/**
 * Extract a focal subgraph from one of the Axiom compiled programs and
 * emit it as a typed TypeScript module under
 * src/components/landing/landing-graph.ts for the hero canvas.
 *
 * Re-run when the source changes or you switch programs:
 *   node scripts/extract-landing-graph.mjs
 *
 * Program selection lives in the PROGRAMS constant below. Pick a
 * program by name with the LANDING_PROGRAM env var:
 *   LANDING_PROGRAM=co-snap node scripts/extract-landing-graph.mjs
 *   LANDING_PROGRAM=federal-income-tax node scripts/extract-landing-graph.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Each program supplies:
 *  - source: absolute path to the compiled JSON
 *  - root: variable to BFS from (the "final" output of the program)
 *  - maxDepth / maxNodes: subgraph caps
 *  - policyAgencyLabels: prefix → short label for non-statute corpus
 *    ids (lets policy bulletins get a clean "AGENCY § doc" label)
 *  - sectionShorthands: long doc segments → shorter form for visual fit
 */
const PROGRAMS = {
  "federal-income-tax": {
    source: path.join(
      process.env.HOME ?? "/",
      "axiom-microsim/engine/artifacts/federal-income-tax.compiled.json"
    ),
    root: "regular_tax_before_credits",
    maxDepth: 6,
    maxNodes: 55,
    policyAgencyLabels: [
      { prefix: "us:policies/irs/rev-proc-2025-32/", label: "Rev. Proc. 2025-32" },
    ],
    sectionShorthands: {
      "capital-gains": "capital-gains",
      "income-tax-brackets": "income-brackets",
    },
  },
  "co-snap": {
    source: path.join(
      process.env.HOME ?? "/",
      "axiom-co-snap/engine/artifacts/co-snap.compiled.json"
    ),
    root: "snap_regular_month_allotment",
    maxDepth: 5,
    maxNodes: 55,
    policyAgencyLabels: [
      { prefix: "us:policies/usda/snap/fy-2026-cola/", label: "USDA FY26" },
      { prefix: "us-co:policies/cdhs/snap/fy-2026-", label: "CO CDHS FY26" },
    ],
    sectionShorthands: {
      "maximum-allotments": "max-allotments",
      "income-eligibility-standards": "income-elig",
      "benefit-calculation": "benefit-calc",
      deductions: "deductions",
    },
  },
};

const PROGRAM_NAME = process.env.LANDING_PROGRAM ?? "federal-income-tax";
const program = PROGRAMS[PROGRAM_NAME];
if (!program) {
  console.error(`Unknown program: ${PROGRAM_NAME}`);
  console.error(`Available: ${Object.keys(PROGRAMS).join(", ")}`);
  process.exit(1);
}

const OUT = path.join(__dirname, "../src/components/landing/landing-graph.ts");
const PRNG_SEED = 20260528;

/* ── Load compiled program ── */

const data = JSON.parse(fs.readFileSync(program.source, "utf8"));
const derivedByName = new Map();
for (const d of data.program.derived) derivedByName.set(d.name, d);

/* ── Collect derived references inside an expression AST ── */

function walkRefs(expr, refs) {
  if (!expr || typeof expr !== "object") return;
  if (Array.isArray(expr)) {
    for (const e of expr) walkRefs(e, refs);
    return;
  }
  if (expr.kind === "derived" && typeof expr.name === "string") {
    refs.add(expr.name);
  }
  for (const k of Object.keys(expr)) {
    if (k === "kind" || k === "name") continue;
    walkRefs(expr[k], refs);
  }
}

/* ── BFS the dependency graph from the root, depth/count capped ── */

const visited = new Set([program.root]);
const childrenByParent = new Map();
const allEdges = new Set();
const queue = [{ name: program.root, depth: 0 }];

while (queue.length > 0) {
  const { name, depth } = queue.shift();
  if (depth >= program.maxDepth) continue;
  const d = derivedByName.get(name);
  if (!d) continue;
  const refs = new Set();
  walkRefs(d.expr, refs);
  const children = [];
  for (const ref of refs) {
    if (!derivedByName.has(ref)) continue;
    children.push(ref);
    const key = `${name}→${ref}`;
    if (allEdges.has(key)) continue;
    allEdges.add(key);
    if (!visited.has(ref) && visited.size < program.maxNodes) {
      visited.add(ref);
      queue.push({ name: ref, depth: depth + 1 });
    }
  }
  childrenByParent.set(name, children);
}

/* ── 3D layout — recursive fan with per-fan asymmetry, no parent-angle
 *    inheritance (which would compound across levels and tilt the
 *    whole sub-tree to one side). */

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const HEIGHT = 5.2;
const INITIAL_SPREAD = 2.6;
const SPREAD_SHRINK = 0.55;
const STEP_Y = HEIGHT / 4;
const rng = makeRng(PRNG_SEED);

const positions = new Map();
const placed = new Set();

function place(name, x, y, z, spread) {
  positions.set(name, { x, y, z });
  placed.add(name);
  const allChildren = childrenByParent.get(name) ?? [];
  const newChildren = allChildren.filter((c) => visited.has(c) && !placed.has(c));
  if (newChildren.length === 0) return;
  const angleBudget = (1.3 + rng() * 0.6) * Math.PI * 2;
  const angleOffset = (rng() - 0.5) * 0.6;
  for (let i = 0; i < newChildren.length; i++) {
    const child = newChildren[i];
    const fraction = newChildren.length === 1 ? 0 : i / newChildren.length;
    const baseAngle = angleOffset + fraction * angleBudget + (rng() - 0.5) * 0.6;
    const radius = spread * (0.7 + rng() * 0.65);
    const yStep = STEP_Y * (0.75 + rng() * 0.55);
    place(
      child,
      x + Math.cos(baseAngle) * radius,
      y - yStep,
      z + Math.sin(baseAngle) * radius,
      spread * SPREAD_SHRINK
    );
  }
}

place(program.root, 0, HEIGHT / 2, 0, INITIAL_SPREAD);

for (const name of visited) {
  if (!placed.has(name)) positions.set(name, { x: 0, y: 0, z: 0 });
}

/* ── Labels ── */

function autoFormat(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortCitation(source) {
  if (!source) return null;
  let s = source.trim();
  const isSubsection = /\b(USC|CFR|CCR)\b/i.test(s);
  if (!isSubsection) return null;
  s = s.replace(/\bsection\s+/i, "§ ");
  s = s.replace(/^(\d+)\s+(USC|CFR)\s+(?!§)/i, "$1 $2 § ");
  s = s.replace(/^10 CCR 2506-1 § /i, "10 CCR § ");
  return s;
}

function policyIdLabel(id) {
  if (typeof id !== "string" || !id) return null;
  const docPath = id.split("#")[0];
  let lastSegment = docPath.split("/").pop() ?? "";
  lastSegment = lastSegment.replace(/^fy-\d{4}-/, "");
  const section = program.sectionShorthands[lastSegment] ?? lastSegment;
  const agency = program.policyAgencyLabels.find((a) => docPath.startsWith(a.prefix));
  if (agency) return `${agency.label} § ${section}`;
  return `§ ${section}`;
}

function labelFor(_name, source, id) {
  return shortCitation(source) ?? policyIdLabel(id) ?? "";
}

function titleFor(name) {
  return autoFormat(name);
}

/* ── Emit ── */

const orderedNames = [...placed];
const nameToIndex = new Map(orderedNames.map((n, i) => [n, i]));

const outNodes = orderedNames.map((n) => {
  const d = derivedByName.get(n);
  const pos = positions.get(n);
  return {
    name: n,
    label: labelFor(n, d?.source, d?.id),
    title: titleFor(n),
    source: d?.source ?? null,
    x: round(pos.x),
    y: round(pos.y),
    z: round(pos.z),
  };
});

const outEdges = [];
const seen = new Set();
for (const edgeKey of allEdges) {
  const [from, to] = edgeKey.split("→");
  if (!nameToIndex.has(from) || !nameToIndex.has(to)) continue;
  const k = `${nameToIndex.get(from)}→${nameToIndex.get(to)}`;
  if (seen.has(k)) continue;
  seen.add(k);
  outEdges.push({ a: nameToIndex.get(from), b: nameToIndex.get(to) });
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

const header = `// Auto-generated by scripts/extract-landing-graph.mjs — do not edit by hand.
// Program: ${PROGRAM_NAME}
// Source: ${path.relative(path.join(__dirname, ".."), program.source)}
// Root: ${program.root}
// Re-run: LANDING_PROGRAM=${PROGRAM_NAME} node scripts/extract-landing-graph.mjs
`;

const out =
  header +
  `\nexport type LandingGraphNode = {\n` +
  `  name: string;\n` +
  `  /** Short citation label rendered next to the dot. */\n` +
  `  label: string;\n` +
  `  /** Human-readable variable title, fallback for hover. */\n` +
  `  title: string;\n` +
  `  /** Full source citation as recorded in the compiled rules. */\n` +
  `  source: string | null;\n` +
  `  x: number;\n` +
  `  y: number;\n` +
  `  z: number;\n` +
  `};\n\n` +
  `export type LandingGraphEdge = { a: number; b: number };\n\n` +
  `export const LANDING_GRAPH_PROGRAM = ${JSON.stringify(PROGRAM_NAME)};\n` +
  `export const LANDING_GRAPH_ROOT = ${JSON.stringify(program.root)};\n\n` +
  `export const LANDING_GRAPH_NODES: LandingGraphNode[] = ${JSON.stringify(outNodes, null, 2)};\n\n` +
  `export const LANDING_GRAPH_EDGES: LandingGraphEdge[] = ${JSON.stringify(outEdges, null, 2)};\n`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);

console.log(`Wrote ${OUT}`);
console.log(`  program: ${PROGRAM_NAME}`);
console.log(`  nodes: ${outNodes.length}`);
console.log(`  edges: ${outEdges.length}`);
