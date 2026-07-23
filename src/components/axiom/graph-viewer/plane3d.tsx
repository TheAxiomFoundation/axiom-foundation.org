"use client";

import { useMemo, useRef, useCallback, useEffect } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type NodeObject,
} from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import type { Object3D } from "three";
import type { ProgramGraph } from "./types";

/**
 * Plane 3D — the strata of law.
 *
 * Space carries meaning instead of decoration:
 *   depth (x)    — computation order: inputs at the horizon, results
 *                  at the front. Walking forward IS evaluating.
 *   altitude (y) — source of law: statutes above, regulations mid,
 *                  policies below. Cross-band edges are literally
 *                  law changing bodies.
 *   spread (z)   — within-stratum separation only.
 *
 * All positions are fixed (no simulation wobble): the layout is an
 * argument, not an accident. Execution renders as particle flows
 * along the executed edges with the executed strata lit amber.
 */

const BUCKET_COLOR: Record<string, string> = {
  statutes: "#d97706",
  regulations: "#0f766e",
  policies: "#4f46e5",
  guidance: "#b45309",
  compositions: "#78716c",
};
const BUCKET_BAND: Record<string, number> = {
  statutes: 120,
  regulations: 0,
  policies: -120,
  guidance: 60,
  compositions: -60,
};
const LAYER_SPACING = 110;
const EXEC_COLOR = "#f59e0b";
const DIM_COLOR = "#d6d3d1";

interface PlaneNode extends NodeObject {
  id: string;
  name: string;
  bucket: string;
  depth: number;
  consumers: number;
  isTerminal: boolean;
}

/** Deterministic small jitter so strata don't stack into a line. */
function jitter(seed: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return ((hash % 1000) / 1000 - 0.5) * range;
}

export function Plane3D({
  graph,
  selectedOutputs,
  executed,
  valueOf,
  onInspect,
}: {
  graph: ProgramGraph;
  selectedOutputs: string[];
  /** Durable legal ids the current run computed. */
  executed: Set<string>;
  /** Formatted value for an executed rule, if any. */
  valueOf: (legalId: string) => string | null;
  /** Click → the shared inspector. */
  onInspect: (payload: {
    legalId: string;
    label: string;
    kind: string;
    value: string | null;
    source: string | null;
  }) => void;
}) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const live = executed.size > 0;

  const data = useMemo(() => {
    const byId = new Map(graph.rules.map((rule) => [rule.legalId, rule]));
    // Longest-path depth: inputs/parameter-only rules sit deepest.
    const depth = new Map<string, number>();
    const resolve = (id: string, stack: Set<string>): number => {
      const cached = depth.get(id);
      if (cached !== undefined) return cached;
      if (stack.has(id)) return 0;
      stack.add(id);
      const rule = byId.get(id);
      const parents = (rule?.ruleDeps ?? []).filter((dep) => byId.has(dep));
      const d =
        parents.length === 0
          ? 0
          : Math.max(...parents.map((p) => resolve(p, stack))) + 1;
      depth.set(id, d);
      return d;
    };
    for (const rule of graph.rules) resolve(rule.legalId, new Set());
    const maxDepth = Math.max(1, ...depth.values());

    const consumers = new Map<string, number>();
    for (const rule of graph.rules) {
      for (const dep of rule.ruleDeps) {
        consumers.set(dep, (consumers.get(dep) ?? 0) + 1);
      }
    }

    const terminal = new Set(graph.terminalOutputs);
    const nodes: PlaneNode[] = graph.rules.map((rule) => {
      const bucket = rule.legalId.split(":")[1]?.split("/")[0] ?? "policies";
      const d = depth.get(rule.legalId) ?? 0;
      return {
        id: rule.legalId,
        name: rule.name,
        bucket,
        depth: d,
        consumers: consumers.get(rule.legalId) ?? 0,
        isTerminal: terminal.has(rule.legalId),
        fx: (d - maxDepth / 2) * LAYER_SPACING,
        fy: (BUCKET_BAND[bucket] ?? 0) + jitter(rule.legalId, 56),
        fz: jitter(rule.name, 210),
      };
    });
    const links = graph.rules.flatMap((rule) =>
      rule.ruleDeps
        .filter((dep) => byId.has(dep))
        .map((dep) => ({ source: dep, target: rule.legalId }))
    );
    return { nodes, links };
  }, [graph]);

  const selectedSet = useMemo(() => new Set(selectedOutputs), [selectedOutputs]);

  // Every node is a card — the same boxes-and-lines language as the
  // flat plane, floated in space. Executed cards tint amber and
  // carry their value; the rest are quiet white cards seamed with
  // their source color.
  const nodeObject = useCallback(
    (node: NodeObject) => {
      const n = node as PlaneNode;
      const isExec = executed.has(n.id);
      const focal = n.isTerminal || selectedSet.has(n.id);
      const dimmed = live && !isExec;
      const value = isExec ? valueOf(n.id) : null;
      const sprite = new SpriteText(
        value ? `${humanizeName(n.name)} · ${value}` : humanizeName(n.name)
      );
      sprite.color = isExec ? "#7c2d12" : dimmed ? "#a8a29e" : "#292524";
      sprite.backgroundColor = isExec
        ? "rgba(251,243,219,0.96)"
        : dimmed
          ? "rgba(255,255,255,0.55)"
          : "rgba(255,255,255,0.94)";
      sprite.borderColor = isExec
        ? EXEC_COLOR
        : dimmed
          ? "#eceae7"
          : (BUCKET_COLOR[n.bucket] ?? "#e7e5e4");
      sprite.borderWidth = isExec || focal ? 0.7 : 0.4;
      sprite.borderRadius = 2.5;
      sprite.padding = focal ? 3.5 : 2.5;
      sprite.textHeight = focal ? 7.5 : isExec ? 6 : 4.6;
      return sprite as unknown as Object3D;
    },
    [executed, valueOf, selectedSet, live]
  );

  // Establishing shot: once the strata exist, pull back to frame
  // them from a three-quarter vantage.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const xs = data.nodes.map((n) => n.fx as number);
      const span = Math.max(...xs) - Math.min(...xs);
      fgRef.current?.cameraPosition(
        { x: span * 0.18, y: 200, z: span * 0.62 },
        { x: 0, y: 0, z: 0 },
        0,
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [data]);

  // Fly to the executed results when a run lands; reset when it clears.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (live) {
      const results = data.nodes.filter(
        (n) => executed.has(n.id) && (n.isTerminal || selectedSet.has(n.id))
      );
      const target = results[0] ?? null;
      if (target) {
        fg.cameraPosition(
          {
            x: (target.fx as number) + 260,
            y: (target.fy as number) + 120,
            z: (target.fz as number) + 260,
          },
          {
            x: target.fx as number,
            y: target.fy as number,
            z: target.fz as number,
          },
          1400
        );
      }
    } else {
      fg.zoomToFit(900, 70);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <div className="plane3d-wrap" data-live={live || undefined}>
      <ForceGraph3D
        ref={fgRef as never}
        graphData={data}
        backgroundColor="#faf9f6"
        showNavInfo={false}
        cooldownTicks={0}
        nodeRelSize={6}
        warmupTicks={0}
        enableNodeDrag={false}
        nodeId="id"
        nodeVal={4}
        nodeColor={(node) => {
          const n = node as PlaneNode;
          if (live && !executed.has(n.id)) return DIM_COLOR;
          if (executed.has(n.id)) return EXEC_COLOR;
          return BUCKET_COLOR[n.bucket] ?? "#78716c";
        }}
        nodeOpacity={0.92}
        nodeThreeObject={nodeObject}
        linkColor={(link) => {
          const s = (link.source as PlaneNode).id ?? link.source;
          const t = (link.target as PlaneNode).id ?? link.target;
          if (live && executed.has(s as string) && executed.has(t as string)) {
            return EXEC_COLOR;
          }
          return live ? "#eceae7" : "#ddd8d3";
        }}
        linkOpacity={0.4}
        linkWidth={(link) => {
          const s = (link.source as PlaneNode).id ?? link.source;
          const t = (link.target as PlaneNode).id ?? link.target;
          return live && executed.has(s as string) && executed.has(t as string)
            ? 1.8
            : 0.7;
        }}
        linkDirectionalParticles={(link) => {
          const s = (link.source as PlaneNode).id ?? link.source;
          const t = (link.target as PlaneNode).id ?? link.target;
          return live && executed.has(s as string) && executed.has(t as string)
            ? 3
            : 0;
        }}
        linkDirectionalParticleSpeed={0.012}
        linkDirectionalParticleWidth={1.8}
        linkDirectionalParticleColor={() => EXEC_COLOR}
        onNodeClick={(node) => {
          const n = node as PlaneNode;
          const fg = fgRef.current;
          if (fg) {
            fg.cameraPosition(
              {
                x: (n.fx as number) + 170,
                y: (n.fy as number) + 80,
                z: (n.fz as number) + 170,
              },
              {
                x: n.fx as number,
                y: n.fy as number,
                z: n.fz as number,
              },
              800
            );
          }
          onInspect({
            legalId: n.id,
            label: humanizeName(n.name),
            kind: n.isTerminal ? "result" : "rule",
            value: valueOf(n.id),
            source: n.id.split("#")[0] ?? null,
          });
        }}
        nodeLabel={(node) => {
          const n = node as PlaneNode;
          const value = valueOf(n.id);
          return `<div style="font-family:ui-sans-serif;font-size:12px;color:#1c1917;background:rgba(255,255,255,0.95);border:1px solid #e7e5e4;border-radius:8px;padding:6px 10px;box-shadow:0 8px 24px -12px rgba(28,25,23,0.4)">${humanizeName(
            n.name
          )}${value ? ` · <b>${value}</b>` : ""}<br/><span style="color:#78716c;font-size:10px">${
            n.bucket
          } · used by ${n.consumers}</span></div>`;
        }}
      />
    </div>
  );
}

function humanizeName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
