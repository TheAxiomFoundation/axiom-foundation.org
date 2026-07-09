"use client";

import { useState } from "react";
import type { RuleEncodingData, RuleReference } from "@/lib/supabase";
import type { InlineReference } from "@/lib/axiom/inline-references";
import {
  refsForChunk,
  type EncodedRuleLink,
  type RailRuleGroup,
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
  allGroups,
  outgoing,
  incoming,
}: {
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  chunks: RailChunk[];
  encodedRules: EncodedRuleLink[];
  allGroups: RailRuleGroup[];
  outgoing: InlineReference[];
  incoming: RuleReference[];
}) {
  const [follow, setFollow] = useState(true);
  const active = useActiveAnchor(chunks.map((chunk) => chunk.anchor));
  const activeChunk = chunks.find((chunk) => chunk.anchor === active);
  const canFollow = chunks.length > 0;
  const mode: "node" | "overview" | "all" =
    follow && canFollow ? (activeChunk ? "node" : "overview") : "all";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {mode === "node"
            ? `Encoding · ${activeChunk!.designator}`
            : "Encoding"}
        </p>
        {canFollow && (
          <ModeToggle follow={follow} onChange={setFollow} />
        )}
      </div>

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
        <div className="space-y-8">
          <RuleSpecTab
            encoding={encoding}
            loading={false}
            jurisdiction={jurisdiction}
            citationPath={citationPath}
            isRepealed={isRepealed}
            showSummary={false}
            ruleGroups={allGroups}
          />
          {(outgoing.length > 0 || incoming.length > 0) && (
            <div className="border-t border-[var(--color-rule)] pt-6">
              <ReferencesPanel outgoing={outgoing} incoming={incoming} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeToggle({
  follow,
  onChange,
}: {
  follow: boolean;
  onChange: (follow: boolean) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Encoding rail mode"
      className="flex rounded border border-[var(--color-rule)] font-mono text-[10px] uppercase tracking-wider"
    >
      <button
        type="button"
        aria-pressed={follow}
        onClick={() => onChange(true)}
        className={`px-2 py-1 cursor-pointer transition-colors ${
          follow
            ? "bg-[var(--color-code-bg)] text-[var(--color-ink)]"
            : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        }`}
      >
        Follow
      </button>
      <button
        type="button"
        aria-pressed={!follow}
        onClick={() => onChange(false)}
        className={`px-2 py-1 cursor-pointer border-l border-[var(--color-rule)] transition-colors ${
          !follow
            ? "bg-[var(--color-code-bg)] text-[var(--color-ink)]"
            : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        }`}
      >
        All
      </button>
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
      />
      {nodeOutgoing.length > 0 && (
        <div className="border-t border-[var(--color-rule)] pt-6">
          <ReferencesPanel outgoing={nodeOutgoing} incoming={[]} />
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
          <ReferencesPanel outgoing={outgoing} incoming={incoming} />
        </div>
      )}
    </div>
  );
}
