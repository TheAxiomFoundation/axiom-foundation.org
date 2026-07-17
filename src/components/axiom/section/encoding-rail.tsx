"use client";

import type { RuleEncodingData, RuleReference } from "@/lib/supabase";
import type { InlineReference } from "@/lib/axiom/inline-references";
import {
  refsForChunk,
  type EncodedRuleLink,
} from "@/lib/axiom/section-page";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";
import {
  graphFocusForCitationPath,
  graphViewerUrl,
  ruleGraphFocus,
} from "@/lib/axiom/runtime/graph-links";
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
  programs = [],
  ruleFiles = {},
}: {
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  chunks: RailChunk[];
  encodedRules: EncodedRuleLink[];
  outgoing: InlineReference[];
  incoming: RuleReference[];
  programs?: ProvisionProgramCoverage[];
  /** Rule name → repo file path; enables per-rule graph links. */
  ruleFiles?: Record<string, string>;
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
  // Per-rule graph deep link: the rule's full legal ID as ?focus=,
  // opened in a program that contains it (preferring one whose
  // sampled rule names include it). Null when the rule's home file
  // is unknown or no program covers this provision.
  const slug = citationPath?.split("/")[0] ?? null;
  const graphLinkForRule = (ruleName: string): string | null => {
    const filePath = ruleFiles[ruleName];
    if (!filePath || !slug || programs.length === 0) return null;
    const program =
      programs.find((candidate) => candidate.ruleNames.includes(ruleName)) ??
      programs[0];
    return graphViewerUrl(program, ruleGraphFocus(slug, filePath, ruleName));
  };

  return (
    <div>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        Encoding
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
          programs={programs}
          graphLinkForRule={graphLinkForRule}
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
          programs={programs}
          graphLinkForRule={graphLinkForRule}
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
            graphLinkForRule={graphLinkForRule}
          />
          <ProgramsBlock programs={programs} citationPath={citationPath} />
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

/**
 * Programs containing rules derived from this provision — the
 * provision↔program join from the runtime-package registry. Entry
 * point for the Run/Graph/Build surfaces; renders nothing when the
 * runtime API is unconfigured or no program touches the provision.
 */
function ProgramsBlock({
  programs,
  citationPath,
  anchor,
}: {
  programs: ProvisionProgramCoverage[];
  citationPath: string | null;
  /** When set, only programs with rules under this subsection. */
  anchor?: string;
}) {
  const visible = anchor
    ? programs.filter((program) => program.anchors.includes(anchor))
    : programs;
  if (visible.length === 0) return null;
  const focus = citationPath ? graphFocusForCitationPath(citationPath) : null;

  return (
    <nav aria-label="Executable programs" data-testid="rail-programs">
      <div className="eyebrow mb-3">Executable in</div>
      <ol className="space-y-2">
        {visible.map((program) => (
          <li key={`${program.jurisdiction}/${program.programId}`}>
            <a
              href={graphViewerUrl(program, focus)}
              target="_blank"
              rel="noreferrer"
              title="View this provision's rules in the program graph"
              className="block rounded-sm px-1 py-0.5 transition-colors hover:bg-[var(--color-rule)]/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-mono text-sm text-[var(--color-ink-secondary)]">
                  {program.programId}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {program.jurisdiction}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ink-muted)]">
                {program.ruleCount}{" "}
                {program.ruleCount === 1 ? "rule" : "rules"} here ·{" "}
                {program.mode}
                {program.status !== "ready" && " · unavailable"} · graph ↗
              </div>
            </a>
          </li>
        ))}
      </ol>
    </nav>
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
  programs,
  graphLinkForRule,
}: {
  chunk: RailChunk;
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  encodedRules: EncodedRuleLink[];
  outgoing: InlineReference[];
  programs: ProvisionProgramCoverage[];
  graphLinkForRule: (ruleName: string) => string | null;
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
        graphLinkForRule={graphLinkForRule}
      />
      <ProgramsBlock programs={programs} citationPath={citationPath} anchor={chunk.anchor} />
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
  programs,
  graphLinkForRule,
}: {
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  chunks: RailChunk[];
  encodedRules: EncodedRuleLink[];
  outgoing: InlineReference[];
  incoming: RuleReference[];
  programs: ProvisionProgramCoverage[];
  graphLinkForRule: (ruleName: string) => string | null;
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
        graphLinkForRule={graphLinkForRule}
      />
      <ProgramsBlock programs={programs} citationPath={citationPath} />
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
