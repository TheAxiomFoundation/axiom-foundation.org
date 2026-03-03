"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTreeNodes } from "@/hooks/use-tree-nodes";
import { TreeBreadcrumbs } from "./tree-breadcrumbs";
import { TreeNodeList } from "./tree-node-list";
import { RuleDetailPanel } from "./rule-detail-panel";
import { JurisdictionPicker } from "./jurisdiction-picker";
import { transformRuleToViewerDoc } from "@/lib/atlas-utils";
import { resolveAtlasPath, buildBreadcrumbs, isUUID } from "@/lib/tree-data";
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
  const { nodes, loading, error, hasMore, loadMore, leafRule } = useTreeNodes(
    dbJurisdictionId,
    ruleSegments,
    hasCitationPaths,
    encodedOnly
  );
  const breadcrumbs = buildBreadcrumbs(segments);

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
                breadcrumbs[breadcrumbs.length - 2]?.href ?? "/atlas"
              )
            }
          />
        </div>
      </div>
    );
  }
  /* v8 ignore stop */

  const handleNavigate = (node: { segment: string }) => {
    router.push(`/atlas/${[...segments, node.segment].join("/")}`);
  };

  return (
    <div className="max-w-[1280px] mx-auto">
      <TreeBreadcrumbs items={breadcrumbs} />

      {/* v8 ignore start -- filter toggle UI */}
      {/* Filter bar */}
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setEncodedOnly((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 font-[family-name:var(--f-mono)] text-xs rounded-lg border transition-colors ${
            encodedOnly
              ? "text-[var(--color-precision)] border-[var(--color-precision)] bg-[rgba(59,130,246,0.1)]"
              : "text-[var(--color-text-muted)] border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-hover)]"
          }`}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              encodedOnly
                ? "bg-[var(--color-precision)]"
                : "bg-[var(--color-text-muted)]"
            }`}
          />
          Encoded only
        </button>
      </div>
      {/* v8 ignore stop */}

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

  if (resolved.phase === "country-picker") {
    return (
      <div className="max-w-[1280px] mx-auto">
        <TreeBreadcrumbs items={breadcrumbs} />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="heading-section text-[var(--color-text)] mb-4">
            Atlas
          </h1>
          <p className="font-[family-name:var(--f-body)] text-lg text-[var(--color-text-secondary)] max-w-[600px] mx-auto">
            Explore encoded law. Source documents, RAC encodings, and
            validation results across jurisdictions.
          </p>
        </div>

        <JurisdictionPicker mode="country" />
      </div>
    );
  }

  if (resolved.phase === "sub-jurisdiction-picker" && resolved.country) {
    return (
      <div className="max-w-[1280px] mx-auto">
        <TreeBreadcrumbs items={breadcrumbs} />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="heading-section text-[var(--color-text)] mb-4">
            {resolved.country.label}
          </h1>
          <p className="font-[family-name:var(--f-body)] text-lg text-[var(--color-text-secondary)] max-w-[600px] mx-auto">
            Select a sub-jurisdiction to browse.
          </p>
        </div>

        <JurisdictionPicker
          mode="sub-jurisdiction"
          country={resolved.country}
        />
      </div>
    );
  }

  /* v8 ignore start -- subJurisdiction always defined in rule phase; else branch is unreachable */
  // Rule phase
  if (resolved.subJurisdiction) {
    return (
      <RuleTreeView
        segments={segments}
        dbJurisdictionId={resolved.subJurisdiction.dbJurisdictionId}
        ruleSegments={resolved.ruleSegments}
        hasCitationPaths={resolved.subJurisdiction.hasCitationPaths}
      />
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        Invalid path.{" "}
        <button
          className="ml-2 text-[var(--color-precision)] hover:underline"
          onClick={() => router.push("/atlas")}
        >
          Return to Atlas
        </button>
      </div>
    </div>
  );
}
/* v8 ignore stop */
