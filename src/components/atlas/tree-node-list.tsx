"use client";

import type { TreeNode } from "@/lib/tree-data";

interface TreeNodeListProps {
  nodes: TreeNode[];
  onNavigate: (node: TreeNode) => void;
  loading: boolean;
  error: string | null;
}

export function TreeNodeList({
  nodes,
  onNavigate,
  loading,
  error,
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
    <ul className="divide-y divide-[var(--color-rule-subtle)] list-none m-0 p-0">
      {nodes.map((node) => {
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
            key={node.segment}
            role="button"
            tabIndex={0}
            aria-label={a11yLabel}
            onClick={() => onNavigate(node)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigate(node);
              }
            }}
            className="group flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[var(--color-accent-light)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:-outline-offset-2"
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
  );
}
