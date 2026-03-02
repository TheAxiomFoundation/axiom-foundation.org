"use client";

import { useRouter } from "next/navigation";
import { useTreeNodes } from "@/hooks/use-tree-nodes";
import { TreeBreadcrumbs } from "./tree-breadcrumbs";
import { TreeNodeList } from "./tree-node-list";
import { RuleDetailPanel } from "./rule-detail-panel";
import { transformRuleToViewerDoc } from "@/lib/atlas-utils";
import { isUUID } from "@/lib/tree-data";
import { useRule } from "@/hooks/use-rules";

/* v8 ignore start -- UUID backward compat component */
function UUIDRuleView({
  ruleId,
  onBack,
}: {
  ruleId: string;
  onBack: () => void;
}) {
  const { rule, children, loading, error } = useRule(ruleId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        Loading rule...
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-muted)] mb-4">
          {error || "Rule not found."}
        </p>
        <button className="btn-outline" onClick={onBack}>
          Back to Browser
        </button>
      </div>
    );
  }

  const doc = transformRuleToViewerDoc(rule, children);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <RuleDetailPanel document={doc} rule={rule} onBack={onBack} />
    </div>
  );
}
/* v8 ignore stop */

export function AtlasBrowser({ segments }: { segments: string[] }) {
  const router = useRouter();
  const { nodes, loading, error, hasMore, loadMore, breadcrumbs, leafRule } =
    useTreeNodes(segments);

  // Backward compat: single UUID segment → rule detail view
  /* v8 ignore start -- UUID backward compat branch */
  if (segments.length === 1 && isUUID(segments[0])) {
    return (
      <UUIDRuleView
        ruleId={segments[0]}
        onBack={() => router.push("/browse")}
      />
    );
  }
  /* v8 ignore stop */

  // Leaf rule from tree navigation (e.g. UK/Canada act with no children)
  /* v8 ignore start -- leaf rule rendering */
  if (leafRule) {
    const doc = transformRuleToViewerDoc(leafRule, []);
    return (
      <div className="max-w-[1280px] mx-auto">
        <TreeBreadcrumbs items={breadcrumbs} />
        <div className="min-h-[calc(100vh-200px)]">
          <RuleDetailPanel
            document={doc}
            rule={leafRule}
            onBack={() =>
              router.push(
                breadcrumbs[breadcrumbs.length - 2]?.href ?? "/browse"
              )
            }
          />
        </div>
      </div>
    );
  }
  /* v8 ignore stop */

  const handleNavigate = (node: { segment: string }) => {
    router.push(`/browse/${[...segments, node.segment].join("/")}`);
  };

  return (
    <div className="max-w-[1280px] mx-auto">
      <TreeBreadcrumbs items={breadcrumbs} />

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="heading-section text-[var(--color-text)] mb-4">
          Atlas
        </h1>
        <p className="font-[family-name:var(--f-body)] text-lg text-[var(--color-text-secondary)] max-w-[600px] mx-auto">
          Browse the legal document archive. Statutes, regulations, and IRS
          guidance across jurisdictions.
        </p>
      </div>

      {/* Tree node list */}
      <div className="bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden min-h-[400px]">
        <TreeNodeList
          nodes={nodes}
          onNavigate={handleNavigate}
          loading={loading}
          error={error}
        />
        {hasMore && (
          <div className="flex justify-center py-4 border-t border-[var(--color-border-subtle)]">
            <button
              className="px-6 py-2 font-[family-name:var(--f-mono)] text-xs text-[var(--color-precision)] bg-transparent border border-[var(--color-border)] rounded-lg hover:bg-[rgba(59,130,246,0.1)] transition-colors"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
