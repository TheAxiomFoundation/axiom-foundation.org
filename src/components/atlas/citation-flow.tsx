"use client";

import { useEffect, useState } from "react";
import {
  getJurisdictionFlows,
  type JurisdictionFlow,
} from "@/lib/supabase";
import { jurisdictionDisplay } from "./atlas-stats";

/**
 * Sankey-style diagram of cross-jurisdictional citation flows.
 *
 * Shown on the Atlas landing page beneath the stat block to visualize
 * how different corpora (USC, CFR, state codes) reference each other.
 * Self-citations (source === target) are excluded to keep the picture
 * about cross-flow — the raw intra-code counts are already surfaced
 * as jurisdiction pills.
 *
 * Pure SVG, no viz deps. Layout is a two-column Sankey:
 *   - left: source jurisdictions, stacked and sized by total outflow
 *   - right: target jurisdictions, stacked and sized by total inflow
 *   - center: ribbons curved between anchors, each ribbon's top/bottom
 *     Y derived from its share of the node's total.
 *
 * Returns null while loading or when there are no cross-flows so the
 * landing page doesn't reserve empty space.
 */
export function CitationFlowDiagram() {
  const [flows, setFlows] = useState<JurisdictionFlow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJurisdictionFlows().then((f) => {
      if (!cancelled) setFlows(f);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!flows) return null;
  const cross = flows.filter((f) => f.source !== f.target);
  if (cross.length === 0) return null;

  const layout = computeLayout(cross);

  return (
    <div
      data-testid="citation-flow"
      className="mx-auto max-w-[900px] mb-10 pb-10 border-b border-[var(--color-rule)]"
    >
      <div className="text-center mb-4">
        <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
          Cross-jurisdictional citations
        </div>
        <p className="text-sm text-[var(--color-ink-secondary)] mt-1">
          How the state corpora cite federal law, and each other.
        </p>
      </div>
      <svg
        viewBox={`0 0 ${LAYOUT.width} ${layout.height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Citation-flow diagram between jurisdictions"
      >
        {layout.ribbons.map((r) => (
          <path
            key={`${r.source}->${r.target}`}
            d={r.path}
            fill="var(--color-accent)"
            fillOpacity={0.2}
            stroke="var(--color-accent)"
            strokeOpacity={0.35}
            strokeWidth={0.5}
          >
            <title>{`${jurisdictionDisplay(r.source)} → ${jurisdictionDisplay(r.target)}: ${r.count.toLocaleString()} citations`}</title>
          </path>
        ))}
        {layout.nodes.map((n) => (
          <g key={`${n.side}-${n.jurisdiction}`}>
            <rect
              x={n.x}
              y={n.y}
              width={LAYOUT.nodeWidth}
              height={n.height}
              fill="var(--color-accent)"
              rx={2}
            />
            <text
              x={
                n.side === "source"
                  ? n.x - 6
                  : n.x + LAYOUT.nodeWidth + 6
              }
              y={n.y + n.height / 2}
              textAnchor={n.side === "source" ? "end" : "start"}
              dominantBaseline="central"
              className="font-mono fill-[var(--color-ink-secondary)]"
              style={{ fontSize: 11 }}
            >
              {jurisdictionDisplay(n.jurisdiction)} ·{" "}
              {n.total.toLocaleString()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------
// Layout math — exported for tests.

interface LayoutConstants {
  width: number;
  nodeWidth: number;
  nodeGap: number;
  verticalPadding: number;
  minNodeHeight: number;
  baseHeight: number;
  marginH: number;
}

export const LAYOUT: LayoutConstants = {
  width: 900,
  nodeWidth: 10,
  nodeGap: 6,
  verticalPadding: 16,
  minNodeHeight: 8,
  baseHeight: 320,
  marginH: 120,
};

export interface LaidOutNode {
  side: "source" | "target";
  jurisdiction: string;
  x: number;
  y: number;
  height: number;
  total: number;
}

export interface LaidOutRibbon {
  source: string;
  target: string;
  count: number;
  path: string;
}

export interface LayoutResult {
  nodes: LaidOutNode[];
  ribbons: LaidOutRibbon[];
  height: number;
}

/**
 * Compute a Sankey layout for a cross-jurisdictional flow set.
 *
 * Node heights are proportional to total in/out-flow with a floor so
 * tiny flows stay clickable. Ribbons are filled Bezier areas whose
 * top/bottom at each end is the node's y-range subset corresponding
 * to that edge's share of the node's total.
 *
 * Pure function so the component can stay a thin SVG wrapper.
 */
export function computeLayout(cross: JurisdictionFlow[]): LayoutResult {
  // Aggregate per-side totals.
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  for (const f of cross) {
    outgoing.set(f.source, (outgoing.get(f.source) ?? 0) + f.count);
    incoming.set(f.target, (incoming.get(f.target) ?? 0) + f.count);
  }

  const sortBySize = (m: Map<string, number>): string[] =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([j]) => j);

  const sources = sortBySize(outgoing);
  const targets = sortBySize(incoming);

  const totalSource = [...outgoing.values()].reduce((a, b) => a + b, 0);
  const totalTarget = [...incoming.values()].reduce((a, b) => a + b, 0);
  const totalMax = Math.max(totalSource, totalTarget);

  const effectiveHeight = Math.max(
    LAYOUT.baseHeight,
    sources.length * (LAYOUT.minNodeHeight + LAYOUT.nodeGap) +
      2 * LAYOUT.verticalPadding,
    targets.length * (LAYOUT.minNodeHeight + LAYOUT.nodeGap) +
      2 * LAYOUT.verticalPadding
  );

  const layoutColumn = (
    ordered: string[],
    sizes: Map<string, number>,
    availableHeight: number
  ): Map<string, { y: number; height: number }> => {
    const totalRaw = ordered.reduce((a, j) => a + (sizes.get(j) ?? 0), 0);
    const totalGap = (ordered.length - 1) * LAYOUT.nodeGap;
    // Reserve a minNodeHeight floor for each node, then distribute what's
    // left proportionally. Guarantees every node is ≥ minNodeHeight, at
    // the cost of compressing the big-end scale a little.
    const minSpace = ordered.length * LAYOUT.minNodeHeight;
    const distributable = Math.max(
      0,
      availableHeight - totalGap - minSpace
    );
    const final = ordered.map(
      (j) =>
        LAYOUT.minNodeHeight +
        ((sizes.get(j) ?? 0) / Math.max(1, totalRaw)) * distributable
    );
    let y = LAYOUT.verticalPadding;
    const out = new Map<string, { y: number; height: number }>();
    for (let i = 0; i < ordered.length; i++) {
      out.set(ordered[i], { y, height: final[i] });
      y += final[i] + LAYOUT.nodeGap;
    }
    return out;
  };

  const available = effectiveHeight - 2 * LAYOUT.verticalPadding;
  const srcLayout = layoutColumn(sources, outgoing, available);
  const tgtLayout = layoutColumn(targets, incoming, available);

  const sourceX = LAYOUT.marginH;
  const targetX = LAYOUT.width - LAYOUT.marginH - LAYOUT.nodeWidth;

  const nodes: LaidOutNode[] = [
    ...sources.map((j) => ({
      side: "source" as const,
      jurisdiction: j,
      x: sourceX,
      y: srcLayout.get(j)!.y,
      height: srcLayout.get(j)!.height,
      total: outgoing.get(j) ?? 0,
    })),
    ...targets.map((j) => ({
      side: "target" as const,
      jurisdiction: j,
      x: targetX,
      y: tgtLayout.get(j)!.y,
      height: tgtLayout.get(j)!.height,
      total: incoming.get(j) ?? 0,
    })),
  ];

  // Ribbon layout: partition each node's y-range by the edges touching it,
  // in the order of edges sorted DESC by count so the fattest ribbon is
  // at the top.
  const sorted = [...cross].sort((a, b) => b.count - a.count);

  const srcCursor = new Map<string, number>(
    sources.map((j) => [j, srcLayout.get(j)!.y])
  );
  const tgtCursor = new Map<string, number>(
    targets.map((j) => [j, tgtLayout.get(j)!.y])
  );

  const ribbons: LaidOutRibbon[] = [];
  for (const f of sorted) {
    const srcBox = srcLayout.get(f.source)!;
    const tgtBox = tgtLayout.get(f.target)!;
    const srcShare = f.count / (outgoing.get(f.source) ?? 1);
    const tgtShare = f.count / (incoming.get(f.target) ?? 1);
    const srcH = srcShare * srcBox.height;
    const tgtH = tgtShare * tgtBox.height;
    const s0 = srcCursor.get(f.source)!;
    const s1 = s0 + srcH;
    const t0 = tgtCursor.get(f.target)!;
    const t1 = t0 + tgtH;
    srcCursor.set(f.source, s1);
    tgtCursor.set(f.target, t1);

    ribbons.push({
      source: f.source,
      target: f.target,
      count: f.count,
      path: ribbonPath(
        sourceX + LAYOUT.nodeWidth,
        s0,
        s1,
        targetX,
        t0,
        t1
      ),
    });
  }

  return { nodes, ribbons, height: effectiveHeight };
}

/** Build a filled-area path for a ribbon between two vertical ranges. */
export function ribbonPath(
  x1: number,
  y1Top: number,
  y1Bot: number,
  x2: number,
  y2Top: number,
  y2Bot: number
): string {
  // Bezier control points: 60% of horizontal distance between anchors.
  const ctrlOffset = (x2 - x1) * 0.6;
  return (
    `M ${x1} ${y1Top} ` +
    `C ${x1 + ctrlOffset} ${y1Top}, ` +
    `${x2 - ctrlOffset} ${y2Top}, ` +
    `${x2} ${y2Top} ` +
    `L ${x2} ${y2Bot} ` +
    `C ${x2 - ctrlOffset} ${y2Bot}, ` +
    `${x1 + ctrlOffset} ${y1Bot}, ` +
    `${x1} ${y1Bot} ` +
    `Z`
  );
}

