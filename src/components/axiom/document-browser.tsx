"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTreeNodes } from "@/hooks/use-tree-nodes";
import type { InitialTreeNodesState } from "@/lib/axiom/tree-cache";
import { usePersistentToggle } from "@/hooks/use-persistent-toggle";
import { TreeBreadcrumbs } from "./tree-breadcrumbs";
import { TreeNodeList } from "./tree-node-list";
import { RuleDetailPanel } from "./rule-detail-panel";
import { RuleInlineSummary } from "./rule-inline-summary";
import { SiblingStrip } from "./sibling-strip";
import { AxiomStats } from "./axiom-stats";
import { PaletteTrigger } from "./palette-trigger";
import { transformRuleToViewerDoc } from "@/lib/axiom-utils";
import {
  resolveAxiomPath,
  buildBreadcrumbs,
  resolveDisplayContext,
} from "@/lib/tree-data";
import type { DisplayContext } from "@/lib/tree-data";
import { useRule } from "@/hooks/use-rules";
import { trackAxiomEvent } from "@/lib/analytics";

/**
 * Compact "Encoded only" toggle, sized to sit beside ``PaletteTrigger``
 * in the page's top-right command bar. Behaviour mirrors the previous
 * standalone filter row — only the layout has shifted to live next to
 * search rather than above the tree list.
 */
function EncodedOnlyToggle({
  encodedOnly,
  setEncodedOnly,
}: {
  encodedOnly: boolean;
  setEncodedOnly: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={encodedOnly}
      // Persisted value is read synchronously on the client, so the
      // server-rendered "off" state can briefly disagree with the
      // hydrated "on" state. Suppress the warning on the dynamic
      // attrs; the visual state settles within the first commit.
      suppressHydrationWarning
      onClick={() => {
        const next = !encodedOnly;
        trackAxiomEvent("axiom_filter_toggled", {
          filter: "encoded_only",
          enabled: next,
        });
        setEncodedOnly(next);
      }}
      className={`flex h-8 items-center gap-2 whitespace-nowrap px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 ${
        encodedOnly
          ? "text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent-light)]"
          : "text-[var(--color-ink-muted)] border-[var(--color-rule)] bg-transparent hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      }`}
    >
      <span
        aria-hidden="true"
        suppressHydrationWarning
        className={`inline-block w-2 h-2 rounded-full transition-colors ${
          encodedOnly
            ? "bg-[var(--color-accent)]"
            : "bg-[var(--color-ink-muted)]"
        }`}
      />
      Encoded only
    </button>
  );
}

function BrowserToolbarActions({
  showEncodedFilter,
  encodedOnly,
  setEncodedOnly,
}: {
  showEncodedFilter: boolean;
  encodedOnly: boolean;
  setEncodedOnly: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="flex h-8 w-[132px] shrink-0 justify-end">
        {showEncodedFilter ? (
          <EncodedOnlyToggle
            encodedOnly={encodedOnly}
            setEncodedOnly={setEncodedOnly}
          />
        ) : null}
      </div>
      <PaletteTrigger />
    </div>
  );
}

function RuleTreeView({
  segments,
  dbJurisdictionId,
  ruleSegments,
  hasCitationPaths,
  onNavigateHref,
  initialTreeState,
}: {
  segments: string[];
  dbJurisdictionId: string;
  ruleSegments: string[];
  hasCitationPaths: boolean;
  onNavigateHref: (href: string) => void;
  initialTreeState?: InitialTreeNodesState | null;
}) {
  const [encodedOnly, setEncodedOnly] = usePersistentToggle(
    "axiom:encoded-only"
  );
  const {
    nodes,
    loading,
    error,
    hasMore,
    loadMore,
    leafRule,
    currentRule,
    stale: treeStateStale = false,
  } = useTreeNodes(
    dbJurisdictionId,
    ruleSegments,
    hasCitationPaths,
    encodedOnly,
    initialTreeState
  );
  const breadcrumbs = buildBreadcrumbs(segments);
  const {
    rule: currentRuleDetail,
    children: currentRuleChildren,
    loading: currentRuleLoading,
  } = useRule(currentRule?.id ?? null);

  const [displayCtx, setDisplayCtx] = useState<DisplayContext | null>(null);
  // The SiblingStrip above the reader already covers lateral context
  // for citation-path jurisdictions, so at a US/UK deep leaf we no
  // longer render the parent's body + all siblings inline. Only
  // non-citation-path jurisdictions (Canada today) still need the
  // parent-context fallback because they navigate by UUID.
  const useParentContext = !hasCitationPaths;

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
      trackAxiomEvent("axiom_rule_viewed", {
        citation_path: leafRule.citation_path || leafRule.id,
        jurisdiction: leafRule.jurisdiction,
        has_rulespec: leafRule.has_rulespec,
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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <TreeBreadcrumbs
                items={breadcrumbs}
                onNavigate={onNavigateHref}
              />
            </div>
            <BrowserToolbarActions
              showEncodedFilter={false}
              encodedOnly={encodedOnly}
              setEncodedOnly={setEncodedOnly}
            />
          </div>
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <TreeBreadcrumbs items={breadcrumbs} onNavigate={onNavigateHref} />
          </div>
          <BrowserToolbarActions
            showEncodedFilter={false}
            encodedOnly={encodedOnly}
            setEncodedOnly={setEncodedOnly}
          />
        </div>
        <SiblingStrip rule={leafRule} onNavigate={onNavigateHref} />
        <div className="min-h-[calc(100vh-200px)] mt-4 border border-[var(--color-rule)] rounded-md overflow-hidden bg-[var(--color-paper-elevated)]">
          <RuleDetailPanel
            document={doc}
            rule={leafRule}
            onBack={() =>
              onNavigateHref(breadcrumbs[breadcrumbs.length - 2]?.href ?? "/")
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

  const handleNavigate = (node: { segment: string; rule?: { citation_path: string | null } }) => {
    trackAxiomEvent("axiom_tree_navigated", {
      depth: segments.length + 1,
      segment: node.segment,
    });
    onNavigateHref(
      node.rule?.citation_path
        ? `/${node.rule.citation_path}`
        : `/${[...segments, node.segment].join("/")}`
    );
  };

  // The encoded filter is a tree-browser control, not a rule-reader control.
  // Keep it available on known browse levels even while their data is loading,
  // but don't let stale browse state leak into a newly selected deep rule.
  const routeIsKnownBrowseLevel = hasCitationPaths
    ? ruleSegments.length <= 2
    : ruleSegments.length === 0;
  const showBrowseContent = !currentRule || currentRuleIsNavigationContainer;
  const waitingForPossibleRule =
    (treeStateStale || loading) &&
    nodes.length === 0 &&
    !currentRule &&
    !leafRule &&
    !routeIsKnownBrowseLevel;
  const showFilterToggle = showBrowseContent && !waitingForPossibleRule;

  return (
    <div className="max-w-[1280px] mx-auto px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <TreeBreadcrumbs items={breadcrumbs} onNavigate={onNavigateHref} />
        </div>
        <BrowserToolbarActions
          showEncodedFilter={showFilterToggle}
          encodedOnly={encodedOnly}
          setEncodedOnly={setEncodedOnly}
        />
      </div>

      {currentRule && currentRuleDetail && (
        <div className="mt-4">
          <SiblingStrip rule={currentRuleDetail} onNavigate={onNavigateHref} />
        </div>
      )}

      {currentRule && currentRuleIsNavigationContainer && currentRuleDetail && (
        <div className="mb-6 mt-4 px-6 py-5 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md">
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
        currentRuleLoading || !currentRuleDoc || !currentRuleDetail ? (
          <div className="mb-6 mt-4 flex items-center justify-center py-12 text-[var(--color-ink-muted)] border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
            Loading...
          </div>
        ) : (
          <div className="mt-4 mb-6 border border-[var(--color-rule)] rounded-md overflow-hidden bg-[var(--color-paper-elevated)]">
            <RuleDetailPanel
              document={currentRuleDoc}
              rule={currentRuleDetail}
              heroSlot={({ outgoingRefs }) => (
                <RuleInlineSummary
                  rule={currentRuleDetail}
                  children={currentRuleChildren}
                  outgoingRefs={outgoingRefs}
                />
              )}
            />
          </div>
        )
      )}

      {/* Filter + tree list: only on browse levels where the inline
          atomic tree of the current rule isn't already covering
          navigation. At an actual rule with children, the inline
          subsection breakdown above is the primary affordance, so
          showing the same children again in a list below would be
          redundant. */}
      {showBrowseContent ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}

export function AxiomBrowser({
  segments,
  initialTreeState,
}: {
  segments: string[];
  initialTreeState?: InitialTreeNodesState | null;
}) {
  const normalisedSegments = useMemo(() => decodeSegments(segments), [segments]);
  const [activeSegments, setActiveSegments] = useState(normalisedSegments);

  useEffect(() => {
    setActiveSegments(normalisedSegments);
  }, [normalisedSegments]);

  useEffect(() => {
    const onPopState = () => {
      setActiveSegments(segmentsFromPathname(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateHref = useCallback((href: string) => {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      window.location.href = href;
      return;
    }
    const nextSegments = segmentsFromPathname(url.pathname);
    window.history.pushState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
    setActiveSegments(nextSegments);
  }, []);

  const resolved = resolveAxiomPath(activeSegments);
  const breadcrumbs = buildBreadcrumbs(activeSegments);

  if (resolved.phase === "jurisdiction-picker") {
    return (
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="heading-section text-[var(--color-ink)] mb-4">
            Axiom
          </h1>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[600px] mx-auto">
            Explore encoded law. Source documents, RuleSpec encodings, and
            validation results across jurisdictions.
          </p>
        </div>

        {/* Primary entry — unified search opens the command palette */}
        <div className="mb-12">
          <PaletteTrigger variant="hero" />
        </div>

        <AxiomStats />

        <div className="mt-12 flex justify-center">
          <Link
            href="/ops"
            className="inline-flex rounded-md border border-[var(--color-rule)] px-3 py-2 text-sm no-underline text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Ops dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* v8 ignore start -- jurisdiction always defined in rule phase; else branch is unreachable */
  // Rule phase
  if (resolved.jurisdiction) {
    return (
      <RuleTreeView
        segments={activeSegments}
        dbJurisdictionId={resolved.jurisdiction.slug}
        ruleSegments={resolved.ruleSegments}
        hasCitationPaths={resolved.jurisdiction.hasCitationPaths}
        onNavigateHref={navigateHref}
        initialTreeState={initialTreeState}
      />
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8">
      <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
        Invalid path.{" "}
        <button
          className="ml-2 text-[var(--color-accent)] hover:underline"
          onClick={() => navigateHref("/")}
        >
          Return to Axiom
        </button>
      </div>
    </div>
  );
}
/* v8 ignore stop */

function segmentsFromPathname(pathname: string): string[] {
  const parts = decodeSegments(pathname.split("/").filter(Boolean));
  return parts[0] === "axiom" ? parts.slice(1) : parts;
}

function decodeSegments(segments: string[]): string[] {
  return segments.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}
