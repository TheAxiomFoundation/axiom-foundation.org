"use client";

import type { TreeNode } from "@/lib/tree-data";

interface TreeNodeListProps {
  nodes: TreeNode[];
  onNavigate: (node: TreeNode) => void;
  loading: boolean;
  error: string | null;
  updating?: boolean;
}

export function TreeNodeList({
  nodes,
  onNavigate,
  loading,
  error,
  updating = false,
}: TreeNodeListProps) {
  if (loading && nodes.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]"
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="p-4 bg-[rgba(196,61,61,0.08)] border border-[rgba(196,61,61,0.2)] rounded-md text-sm text-[var(--color-error)]"
      >
        {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
        No items found.
      </div>
    );
  }

  return (
    <div className="relative" aria-busy={updating || undefined}>
      <ul
        className={`divide-y divide-[var(--color-rule-subtle)] list-none m-0 p-0 transition-opacity ${
          updating ? "opacity-60 pointer-events-none select-none" : ""
        }`}
      >
        {nodes.map((node, index) => {
          const parts: string[] = [node.label];
          if (node.hasRuleSpec) parts.push("encoded");
          if (node.childCount !== undefined && node.childCount > 0) {
            parts.push(
              `${node.childCount} item${node.childCount === 1 ? "" : "s"}`
            );
          }
          const a11yLabel = parts.join(", ");
          return (
            <li
              key={treeNodeKey(node, index)}
              role="button"
              tabIndex={updating ? -1 : 0}
              aria-disabled={updating || undefined}
              aria-label={a11yLabel}
              onClick={() => {
                if (!updating) onNavigate(node);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!updating) onNavigate(node);
                }
              }}
              className={`group flex items-center gap-3 px-5 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:-outline-offset-2 ${
                updating
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-[var(--color-accent-light)]"
              }`}
            >
              <span
                aria-hidden="true"
                className="w-5 text-center text-xs shrink-0 text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)] transition-colors"
              >
                {node.hasChildren ? "▸" : "·"}
              </span>
              <span className="flex-1 text-sm text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink)] truncate transition-colors">
                {node.label}
              </span>
              {node.hasRuleSpec && (
                <span
                  aria-hidden="true"
                  className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)] rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0"
                >
                  RuleSpec
                </span>
              )}
              {node.childCount !== undefined && node.childCount > 0 && (
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-[var(--color-ink-muted)] tabular-nums shrink-0"
                >
                  {node.childCount.toLocaleString()}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {updating && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-3 top-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] shadow-sm"
        >
          Loading...
        </div>
      )}
    </div>
  );
}

function treeNodeKey(node: TreeNode, index: number): string {
  return [
    node.rule?.id,
    node.rule?.citation_path,
    node.nodeType,
    node.segment,
    index,
  ]
    .filter(Boolean)
    .join(":");
}
