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
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-sm text-[#ef4444]">
        {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        No items found.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--color-border-subtle)]">
      {nodes.map((node) => (
        <div
          key={node.segment}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate(node)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigate(node);
            }
          }}
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[rgba(59,130,246,0.05)] transition-colors"
        >
          <span className="w-5 text-center text-[var(--color-text-muted)] text-xs shrink-0">
            {node.hasChildren ? "\u25B8" : "\u00B7"}
          </span>
          <span className="flex-1 text-sm text-[var(--color-text-secondary)] truncate">
            {node.label}
          </span>
          {node.hasRac && (
            <span className="font-[family-name:var(--f-mono)] text-[10px] text-[var(--color-precision)] border border-[var(--color-precision)] rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0">
              RAC
            </span>
          )}
          {node.childCount !== undefined && node.childCount > 0 && (
            <span className="font-[family-name:var(--f-mono)] text-xs text-[var(--color-text-muted)] shrink-0">
              {node.childCount.toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
