"use client";

import type { TraceNode } from "./types";

/**
 * The proof tree — the law as a nested recipe.
 *
 * A dependency canvas answers "what connects to what"; this view
 * answers "what is this made of?". Each result is a document of
 * nested cards: rule → the steps it's computed from, indented and
 * foldable at every joint. Breaking down is unfolding; putting back
 * together is folding — the hierarchy is the reassembly, and
 * nothing ever leaves the page.
 *
 * It shares the plane's fold state, so the Map, the Index, and the
 * Tree are three projections of one dissection.
 */

const BUCKET_COLOR: Record<string, string> = {
  statutes: "#d97706",
  regulations: "#0f766e",
  policies: "#4f46e5",
  guidance: "#b45309",
  compositions: "#78716c",
};

function bucketOf(legalId: string): string | null {
  return legalId.split(":")[1]?.split("/")[0] ?? null;
}

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function countSteps(node: TraceNode, seen = new Set<string>()): number {
  if (seen.has(node.legalId)) return 0;
  seen.add(node.legalId);
  let count = 0;
  for (const child of node.children ?? []) {
    if (child.dtype === "input") continue;
    count += 1 + countSteps(child, seen);
  }
  return count;
}

function formatValue(value: TraceNode["value"]): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString("en-US");
  return String(value);
}

export function PlaneTree({
  roots,
  folded,
  onToggleFold,
  executed,
  onLens,
}: {
  /** The selected outputs' trace trees (values grafted when live). */
  roots: TraceNode[];
  folded: Set<string>;
  onToggleFold: (legalId: string) => void;
  executed: Set<string>;
  /** "How does this rule work?" → the lens. */
  onLens: (legalId: string) => void;
}) {
  if (roots.length === 0) {
    return (
      <div className="tree-empty">
        Select at least one result to read its composition.
      </div>
    );
  }
  return (
    <div className="tree-scroll" data-testid="plane-tree">
      <div className="tree-doc">
        {roots.map((root) => (
          <TreeBranch
            key={root.legalId}
            node={root}
            depth={0}
            folded={folded}
            onToggleFold={onToggleFold}
            executed={executed}
            onLens={onLens}
            seen={new Set()}
          />
        ))}
      </div>
    </div>
  );
}

function TreeBranch({
  node,
  depth,
  folded,
  onToggleFold,
  executed,
  onLens,
  seen,
}: {
  node: TraceNode;
  depth: number;
  folded: Set<string>;
  onToggleFold: (legalId: string) => void;
  executed: Set<string>;
  onLens: (legalId: string) => void;
  seen: Set<string>;
}) {
  if (seen.has(node.legalId) || depth > 10) {
    return (
      <div className="tree-ref" style={{ marginLeft: depth * 22 }}>
        ↺ {humanize(node.label ?? "")} — defined above
      </div>
    );
  }
  const nextSeen = new Set(seen).add(node.legalId);
  const steps = (node.children ?? []).filter(
    (child) => child.dtype !== "input"
  );
  const inputs = (node.children ?? []).filter(
    (child) => child.dtype === "input"
  );
  const isFolded = folded.has(node.legalId);
  const hidden = isFolded ? countSteps(node) : 0;
  const bucket = bucketOf(node.legalId);
  const value = formatValue(node.value);
  const isExec = executed.has(node.legalId);
  const isRoot = depth === 0;

  return (
    <div
      className={`tree-branch ${isRoot ? "is-root" : ""}`}
      style={{ marginLeft: isRoot ? 0 : 22 }}
    >
      <div
        className={`tree-card ${isExec ? "is-executed" : ""} ${isRoot ? "is-root" : ""}`}
        style={
          bucket && BUCKET_COLOR[bucket]
            ? { borderLeftColor: BUCKET_COLOR[bucket] }
            : undefined
        }
      >
        <div className="tree-card-main">
          <button
            type="button"
            className="tree-name"
            onClick={() => onLens(node.legalId)}
            title="How does this rule work? — open the lens on the map"
          >
            {humanize(node.label ?? node.legalId.split("#").pop() ?? "")}
          </button>
          {value !== null && (
            <span className={`tree-value ${isExec ? "is-executed" : ""}`}>
              {value}
            </span>
          )}
          {steps.length > 0 && (
            <button
              type="button"
              className={`tree-fold ${isFolded ? "" : "is-open"}`}
              onClick={() => onToggleFold(node.legalId)}
            >
              {isFolded ? `▸ ${hidden} steps` : "▾ fold"}
            </button>
          )}
        </div>
        {(node.source || node.formula) && (
          <div className="tree-card-meta">
            {node.source && <span className="tree-cite">{node.source}</span>}
            {node.formula && (
              <code className="tree-formula">{node.formula}</code>
            )}
          </div>
        )}
        {inputs.length > 0 && !isFolded && (
          <div className="tree-inputs">
            {inputs.slice(0, 8).map((input) => (
              <span key={input.legalId} className="tree-input-chip">
                {humanize(
                  input.label ??
                    input.legalId.split("#").pop()?.replace(/^input\./, "") ??
                    ""
                )}
                {formatValue(input.value) !== null && (
                  <b> {formatValue(input.value)}</b>
                )}
              </span>
            ))}
            {inputs.length > 8 && (
              <span className="tree-input-chip is-more">
                +{inputs.length - 8} inputs
              </span>
            )}
          </div>
        )}
      </div>
      {!isFolded && steps.length > 0 && (
        <div className="tree-children">
          {steps.map((child, index) => (
            <TreeBranch
              key={`${child.legalId}-${index}`}
              node={child}
              depth={depth + 1}
              folded={folded}
              onToggleFold={onToggleFold}
              executed={executed}
              onLens={onLens}
              seen={nextSeen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
