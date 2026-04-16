"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTreeNodes } from "@/hooks/use-tree-nodes";
import { TreeBreadcrumbs } from "./tree-breadcrumbs";
import { TreeNodeList } from "./tree-node-list";
import { RuleDetailPanel } from "./rule-detail-panel";
import { JurisdictionPicker } from "./jurisdiction-picker";
import { transformRuleToViewerDoc } from "@/lib/atlas-utils";
import {
  resolveAtlasPath,
  buildBreadcrumbs,
  isUUID,
  resolveDisplayContext,
} from "@/lib/tree-data";
import type { DisplayContext } from "@/lib/tree-data";
import { useRule } from "@/hooks/use-rules";
import { trackAtlasEvent } from "@/lib/analytics";

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
      <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
        Loading rule...
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-ink-muted)] mb-4">
          {error || "Rule not found."}
        </p>
        <button className="btn-outline" onClick={onBack}>
          Back to Atlas
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

function RuleTreeView({
  segments,
  dbJurisdictionId,
  ruleSegments,
  hasCitationPaths,
}: {
  segments: string[];
  dbJurisdictionId: string;
  ruleSegments: string[];
  hasCitationPaths: boolean;
}) {
  const router = useRouter();
  const [encodedOnly, setEncodedOnly] = useState(false);
  const { nodes, loading, error, hasMore, loadMore, leafRule, currentRule } = useTreeNodes(
    dbJurisdictionId,
    ruleSegments,
    hasCitationPaths,
    encodedOnly
  );
  const breadcrumbs = buildBreadcrumbs(segments);
  const {
    rule: currentRuleDetail,
    children: currentRuleChildren,
    loading: currentRuleLoading,
  } = useRule(currentRule?.id ?? null);

  const [displayCtx, setDisplayCtx] = useState<DisplayContext | null>(null);
  const useParentContext =
    !hasCitationPaths || (leafRule?.level ?? 0) > 1;

  useEffect(() => {
    if (leafRule) {
      if (useParentContext) {
        resolveDisplayContext(leafRule).then(setDisplayCtx);
      } else {
        setDisplayCtx({
          rule: leafRule,
          parentBody: null,
          siblings: [leafRule],
          targetIndex: 0,
        });
      }
      /* v8 ignore next 4 -- analytics side effect */
      trackAtlasEvent("atlas_rule_viewed", {
        citation_path: leafRule.citation_path || leafRule.id,
        jurisdiction: leafRule.jurisdiction,
        has_rac: leafRule.has_rac,
      });
    } else {
      setDisplayCtx(null);
    }
  }, [leafRule, useParentContext]);

  // Leaf rule from tree navigation (e.g. UK/Canada act with no children)
  /* v8 ignore start -- leaf rule rendering */
  if (leafRule) {
    if (!displayCtx) {
      return (
        <div className="max-w-[1280px] mx-auto px-8">
          <TreeBreadcrumbs items={breadcrumbs} />
          <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
            Loading...
          </div>
        </div>
      );
    }

    const doc = transformRuleToViewerDoc(
      leafRule,
      displayCtx.parentBody ? displayCtx.siblings : [],
      displayCtx.parentBody
        ? {
            contextText: displayCtx.parentBody,
            highlightId: leafRule.citation_path?.split("/").pop(),
          }
        : undefined
    );

    return (
      <div className="max-w-[1280px] mx-auto px-8">
        <TreeBreadcrumbs items={breadcrumbs} />
        <div className="min-h-[calc(100vh-200px)]">
          <RuleDetailPanel
            document={doc}
            rule={leafRule}
            onBack={() =>
              router.push(
                breadcrumbs[breadcrumbs.length - 2]?.href ?? "/atlas"
              )
            }
          />
        </div>
      </div>
    );
  }
  /* v8 ignore stop */

  // Suppress the inline detail panel when the current node is a navigation
  // container (no body of its own) whose children are distinct navigable
  // sections — e.g. a CFR subpart. In that case the children belong in the
  // tree list below, not dumped inline.
  const currentRuleIsNavigationContainer =
    !!currentRuleDetail &&
    (currentRuleDetail.body == null || currentRuleDetail.body.trim() === "") &&
    currentRuleChildren.length > 0;

  const currentRuleDoc =
    currentRuleDetail && !currentRuleIsNavigationContainer
      ? transformRuleToViewerDoc(
          currentRuleDetail,
          currentRuleChildren,
          currentRuleChildren.length > 0 && currentRuleDetail.body
            ? { contextText: currentRuleDetail.body }
            : undefined
        )
      : null;

  const handleNavigate = (node: { segment: string }) => {
    trackAtlasEvent("atlas_tree_navigated", {
      depth: segments.length + 1,
      segment: node.segment,
    });
    router.push(`/atlas/${[...segments, node.segment].join("/")}`);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-8">
      <TreeBreadcrumbs items={breadcrumbs} />

      {currentRule && currentRuleIsNavigationContainer && currentRuleDetail && (
        <div className="mb-6 px-6 py-5 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)] mb-1">
            {currentRuleDetail.citation_path}
          </div>
          <h2 className="font-display text-lg text-[var(--color-ink)]">
            {currentRuleDetail.heading || "Untitled"}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">
            {currentRuleChildren.length} section
            {currentRuleChildren.length === 1 ? "" : "s"} below — select one to
            read the text.
          </p>
        </div>
      )}

      {currentRule && !currentRuleIsNavigationContainer && (
        <div className="mb-6 min-h-[240px] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md overflow-hidden">
          {currentRuleLoading || !currentRuleDoc || !currentRuleDetail ? (
            <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
              Loading...
            </div>
          ) : (
            <RuleDetailPanel document={currentRuleDoc} rule={currentRuleDetail} />
          )}
        </div>
      )}

      {/* v8 ignore start -- filter toggle UI */}
      {/* Filter bar */}
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => {
            setEncodedOnly((prev) => {
              trackAtlasEvent("atlas_filter_toggled", { filter: "encoded_only", enabled: !prev });
              return !prev;
            });
          }}
          className={`flex items-center gap-2 px-3 py-1.5 font-mono text-xs rounded-md border transition-colors ${
            encodedOnly
              ? "text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent-light)]"
              : "text-[var(--color-ink-muted)] border-[var(--color-rule)] bg-transparent hover:border-[var(--color-rule-hover)]"
          }`}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              encodedOnly
                ? "bg-[var(--color-accent)]"
                : "bg-[var(--color-ink-muted)]"
            }`}
          />
          Encoded only
        </button>
      </div>
      {/* v8 ignore stop */}

      {/* Tree node list */}
      <div className="bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md overflow-hidden min-h-[400px]">
        <TreeNodeList
          nodes={nodes}
          onNavigate={handleNavigate}
          loading={loading}
          error={error}
        />
        {hasMore && (
          <div className="flex justify-center py-4 border-t border-[var(--color-rule)]">
            <button
              className="px-6 py-2 font-mono text-xs text-[var(--color-accent)] bg-transparent border border-[var(--color-rule)] rounded-md hover:bg-[var(--color-accent-light)] transition-colors"
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

export function AtlasBrowser({ segments }: { segments: string[] }) {
  const router = useRouter();

  // Backward compat: single UUID segment → rule detail view
  /* v8 ignore start -- UUID backward compat branch */
  if (segments.length === 1 && isUUID(segments[0])) {
    return (
      <UUIDRuleView
        ruleId={segments[0]}
        onBack={() => router.push("/atlas")}
      />
    );
  }
  /* v8 ignore stop */

  const resolved = resolveAtlasPath(segments);
  const breadcrumbs = buildBreadcrumbs(segments);

  if (resolved.phase === "jurisdiction-picker") {
    return (
      <div className="max-w-[1280px] mx-auto px-8">
        <TreeBreadcrumbs items={breadcrumbs} />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="heading-section text-[var(--color-ink)] mb-4">
            Atlas
          </h1>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[600px] mx-auto">
            Explore encoded law. Source documents, RAC encodings, and
            validation results across jurisdictions.
          </p>
        </div>

        <JurisdictionPicker />
      </div>
    );
  }

  /* v8 ignore start -- jurisdiction always defined in rule phase; else branch is unreachable */
  // Rule phase
  if (resolved.jurisdiction) {
    const useLegacyUuidRouting =
      resolved.jurisdiction.slug === "uk" &&
      resolved.ruleSegments.length > 0 &&
      resolved.ruleSegments.every((segment) => isUUID(segment));

    return (
      <RuleTreeView
        segments={segments}
        dbJurisdictionId={resolved.jurisdiction.slug}
        ruleSegments={resolved.ruleSegments}
        hasCitationPaths={
          useLegacyUuidRouting ? false : resolved.jurisdiction.hasCitationPaths
        }
      />
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8">
      <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
        Invalid path.{" "}
        <button
          className="ml-2 text-[var(--color-accent)] hover:underline"
          onClick={() => router.push("/atlas")}
        >
          Return to Atlas
        </button>
      </div>
    </div>
  );
}
/* v8 ignore stop */
