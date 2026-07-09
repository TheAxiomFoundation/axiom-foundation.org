"use client";

import type { RuleEncodingData, RuleReference } from "@/lib/supabase";
import type { InlineReference } from "@/lib/axiom/inline-references";
import {
  refsForChunk,
  type EncodedRuleLink,
} from "@/lib/axiom/section-page";
import { RuleSpecTab } from "@/components/axiom/rulespec-tab";
import { ReferencesPanel } from "@/components/axiom/references-panel";
import { useActiveAnchor } from "./use-active-anchor";

export interface RailChunk {
  anchor: string;
  designator: string;
  label: string;
  text: string;
}

/**
 * The v2 encoding rail — the "page" for the node being read, even
 * though the reading column keeps the whole section for context.
 *
 * Follow mode (default) treats the document as fully split:
 * - above the first subsection → section overview: source file,
 *   subsection map with rule counts, section-wide rules, full
 *   citation graph;
 * - inside a subsection → only that node: its rule cards and the
 *   citations it makes.
 * "All" restores the complete document-ordered grouping.
 */
export function EncodingRail({
  encoding,
  jurisdiction,
  citationPath,
  isRepealed,
  chunks,
  encodedRules,
  outgoing,
  incoming,
}: {
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  chunks: RailChunk[];
  encodedRules: EncodedRuleLink[];
  outgoing: InlineReference[];
  incoming: RuleReference[];
}) {
  const active = useActiveAnchor(chunks.map((chunk) => chunk.anchor));
  const activeChunk = chunks.find((chunk) => chunk.anchor === active);
  const mode: "node" | "overview" | "flat" =
    chunks.length === 0 ? "flat" : activeChunk ? "node" : "overview";
  // rule name → the first subsection it cites; rule cards use this
  // to link back into the reading column.
  const textAnchors = Object.fromEntries(
    encodedRules
      .filter((rule) => rule.anchors.length > 0)
      .map((rule) => [rule.name, rule.anchors[0]])
  );

  return (
    <div>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {mode === "node"
          ? `Encoding · ${activeChunk!.designator}`
          : "Encoding"}
      </p>

      {mode === "node" ? (
        <NodeView
          chunk={activeChunk!}
          encoding={encoding}
          jurisdiction={jurisdiction}
          citationPath={citationPath}
          isRepealed={isRepealed}
          encodedRules={encodedRules}
          outgoing={outgoing}
        />
      ) : mode === "overview" ? (
        <OverviewView
          encoding={encoding}
          jurisdiction={jurisdiction}
          citationPath={citationPath}
          isRepealed={isRepealed}
          chunks={chunks}
          encodedRules={encodedRules}
          outgoing={outgoing}
          incoming={incoming}
        />
      ) : (
        // No parseable subsection structure — flat rule list plus the
        // section-level citation graph.
        <div className="space-y-8">
          <RuleSpecTab
            encoding={encoding}
            loading={false}
            jurisdiction={jurisdiction}
            citationPath={citationPath}
            isRepealed={isRepealed}
            showSummary={false}
            textAnchors={textAnchors}
          />
          {(outgoing.length > 0 || incoming.length > 0) && (
            <div className="border-t border-[var(--color-rule)] pt-6">
              <ReferencesPanel outgoing={outgoing} incoming={incoming} hrefPrefix="/axiom/v2" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The node's own page: its rules, then the citations it makes. */
function NodeView({
  chunk,
  encoding,
  jurisdiction,
  citationPath,
  isRepealed,
  encodedRules,
  outgoing,
}: {
  chunk: RailChunk;
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  encodedRules: EncodedRuleLink[];
  outgoing: InlineReference[];
}) {
  const ruleNames = encodedRules
    .filter((rule) => rule.anchors.includes(chunk.anchor))
    .map((rule) => rule.name);
  const nodeOutgoing = refsForChunk(
    outgoing,
    chunk.text
  ) as InlineReference[];
  // In node view every card links back to the node itself, so the
  // reader can hop rail → text at the subsection being read.
  const textAnchors = Object.fromEntries(
    ruleNames.map((name) => [name, chunk.anchor])
  );

  return (
    <div className="space-y-8">
      <RuleSpecTab
        encoding={encoding}
        loading={false}
        jurisdiction={jurisdiction}
        citationPath={citationPath}
        isRepealed={isRepealed}
        showSummary={false}
        showHeader={false}
        ruleGroups={[{ label: chunk.label, ruleNames }]}
        includeUngrouped={false}
        textAnchors={textAnchors}
      />
      {nodeOutgoing.length > 0 && (
        <div className="border-t border-[var(--color-rule)] pt-6">
          <ReferencesPanel outgoing={nodeOutgoing} incoming={[]} hrefPrefix="/axiom/v2" />
        </div>
      )}
    </div>
  );
}

/** Section-level view shown above the first subsection. */
function OverviewView({
  encoding,
  jurisdiction,
  citationPath,
  isRepealed,
  chunks,
  encodedRules,
  outgoing,
  incoming,
}: {
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  chunks: RailChunk[];
  encodedRules: EncodedRuleLink[];
  outgoing: InlineReference[];
  incoming: RuleReference[];
}) {
  const sectionWide = encodedRules
    .filter((rule) => rule.anchors.length === 0)
    .map((rule) => rule.name);
  const countFor = (anchor: string) =>
    encodedRules.filter((rule) => rule.anchors.includes(anchor)).length;

  return (
    <div className="space-y-8">
      <RuleSpecTab
        encoding={encoding}
        loading={false}
        jurisdiction={jurisdiction}
        citationPath={citationPath}
        isRepealed={isRepealed}
        showSummary={false}
        ruleGroups={
          sectionWide.length > 0
            ? [{ label: "Section-wide", ruleNames: sectionWide }]
            : [{ label: "", ruleNames: [] }]
        }
        includeUngrouped={false}
      />
      {encodedRules.length > 0 && (
        <nav aria-label="Rules by subsection" data-testid="rail-subsection-map">
          <div className="eyebrow mb-3">Rules by subsection</div>
          <ol className="space-y-1">
            {chunks
              .map((chunk) => ({ chunk, count: countFor(chunk.anchor) }))
              .filter(({ count }) => count > 0)
              .map(({ chunk, count }) => (
                <li key={chunk.anchor}>
                  <a
                    href={`#${chunk.anchor}`}
                    className="flex items-baseline justify-between gap-2 rounded-sm px-1 py-0.5 text-sm text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    <span className="truncate">{chunk.label}</span>
                    <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                      {count}
                    </span>
                  </a>
                </li>
              ))}
          </ol>
        </nav>
      )}
      {(outgoing.length > 0 || incoming.length > 0) && (
        <div className="border-t border-[var(--color-rule)] pt-6">
          <ReferencesPanel outgoing={outgoing} incoming={incoming} hrefPrefix="/axiom/v2" />
        </div>
      )}
    </div>
  );
}
