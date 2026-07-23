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

const OPERATOR_RE = /(\band\b|\bor\b|\bnot\b|\bif\b|\belse\b|[+\-*/]|>=|<=|==|!=|>|<)/;

/** Light syntax tint for formula one-liners. */
function FormulaLine({ formula }: { formula: string }) {
  const clean = formula.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const parts = clean.split(
    /(\band\b|\bor\b|\bnot\b|\bif\b|\belse\b|[+\-*/]|>=|<=|==|!=|>|<)/g,
  );
  return (
    <code className="tree-formula" title={formula}>
      <span className="tree-formula-eq">=</span>{" "}
      {parts.map((part, index) =>
        OPERATOR_RE.test(part) && part.length <= 4 ? (
          <b key={index}>{part}</b>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </code>
  );
}

/** Boilerplate composition "sources" say nothing — only real legal
 *  cites earn a chip. */
function meaningfulCite(source: string | undefined): string | null {
  if (!source) return null;
  if (/composition/i.test(source)) return null;
  return source;
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
      <div className="tree-ref">
        ↺ {humanize(node.label ?? "")} — defined above
      </div>
    );
  }
  const nextSeen = new Set(seen).add(node.legalId);
  const steps = (node.children ?? []).filter(
    (child) => child.dtype !== "input",
  );
  const inputs = (node.children ?? []).filter(
    (child) => child.dtype === "input",
  );
  const isFolded = folded.has(node.legalId);
  const hidden = isFolded ? countSteps(node) : 0;
  const bucket = bucketOf(node.legalId);
  const seam = bucket ? (BUCKET_COLOR[bucket] ?? null) : null;
  const value = formatValue(node.value);
  const cite = meaningfulCite(node.source ?? undefined);
  const isExec = executed.has(node.legalId);
  const isRoot = depth === 0;

  return (
    <div className={`tree-branch ${isRoot ? "is-root" : ""}`}>
      {!isRoot && (
        <span
          aria-hidden
          className="tree-joint"
          style={seam ? { background: seam } : undefined}
        />
      )}
      <div
        className={`tree-card depth-${Math.min(depth, 4)} ${isExec ? "is-executed" : ""} ${isRoot ? "is-root" : ""}`}
      >
        <div className="tree-card-main">
          {isRoot && <span className="tree-eyebrow">Result</span>}
          <button
            type="button"
            className="tree-name"
            onClick={() => onLens(node.legalId)}
            title="How does this rule work? — open the lens on the map"
          >
            {humanize(node.label ?? node.legalId.split("#").pop() ?? "")}
          </button>
          {cite && (
            <span
              className="tree-cite-chip"
              style={
                seam ? { color: seam, borderColor: `${seam}55` } : undefined
              }
              title={cite}
            >
              {cite}
            </span>
          )}
          <span className="tree-spacer" />
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
              {isFolded ? `▸ ${hidden}` : "▾"}
            </button>
          )}
        </div>
        {node.formula && <FormulaLine formula={node.formula} />}
        {inputs.length > 0 && !isFolded && (
          <div className="tree-inputs">
            {inputs.slice(0, 6).map((input) => (
              <span key={input.legalId} className="tree-input-chip">
                {humanize(
                  input.label ??
                    input.legalId.split("#").pop()?.replace(/^input\./, "") ??
                    "",
                )}
                {formatValue(input.value) !== null && (
                  <b> {formatValue(input.value)}</b>
                )}
              </span>
            ))}
            {inputs.length > 6 && (
              <span className="tree-input-chip is-more">
                +{inputs.length - 6} inputs
              </span>
            )}
          </div>
        )}
      </div>
      {!isFolded && steps.length > 0 && (
        <div
          className="tree-children"
          style={seam ? { borderColor: `${seam}33` } : undefined}
        >
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
