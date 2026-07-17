"use client";

import type { RuleEncodingData, RuleReference } from "@/lib/supabase";
import type { InlineReference } from "@/lib/axiom/inline-references";
import {
  refsForChunk,
  type EncodedRuleLink,
} from "@/lib/axiom/section-page";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";
import {
  builderUrlForRule,
  graphFocusForCitationPath,
  graphViewerUrl,
  ruleGraphFocus,
} from "@/lib/axiom/runtime/graph-links";
import { RuleSpecTab } from "@/components/axiom/rulespec-tab";
import { ReferencesPanel } from "@/components/axiom/references-panel";
import { RunSample } from "./run-sample";
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
  // "Use this rule as an output" — the builder resolves the program
  // itself, so this needs only the rule's legal ID.
  const builderLinkForRule = (ruleName: string): string | null => {
    const filePath = ruleFiles[ruleName];
    if (!filePath || !slug) return null;
    return builderUrlForRule(ruleGraphFocus(slug, filePath, ruleName));
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
          builderLinkForRule={builderLinkForRule}
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
          builderLinkForRule={builderLinkForRule}
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
            builderLinkForRule={builderLinkForRule}
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
/**
 * Family key for grouping: state-prefixed program ids fold into
 * their base program ("co-snap" in us-co → "snap"), so seven state
 * SNAP packages render as one row with jurisdiction chips instead of
 * seven near-identical rows.
 */
function programFamily(program: ProvisionProgramCoverage): string {
  const state = program.jurisdiction.split("-")[1];
  return state && program.programId.startsWith(`${state}-`)
    ? program.programId.slice(state.length + 1)
    : program.programId;
}

/** Short jurisdiction chip: "us-co" → "CO", "us" → "US", "uk" → "UK". */
function jurisdictionChip(jurisdiction: string): string {
  const parts = jurisdiction.split("-");
  return (parts[1] ?? parts[0]).toUpperCase();
}

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

  const families = new Map<string, ProvisionProgramCoverage[]>();
  for (const program of visible) {
    const family = programFamily(program);
    const group = families.get(family);
    if (group) group.push(program);
    else families.set(family, [program]);
  }

  return (
    <nav aria-label="Executable programs" data-testid="rail-programs">
      <div className="eyebrow mb-3">Executable in</div>
      <ol className="space-y-3">
        {Array.from(families, ([family, group]) => (
          <li key={family}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-mono text-sm text-[var(--color-ink-secondary)]">
                {family}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-[var(--color-ink-muted)]">
                {group.length === 1
                  ? `${group[0].ruleCount} ${group[0].ruleCount === 1 ? "rule" : "rules"} here`
                  : `${group.length} jurisdictions`}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {group.map((program) => (
                <a
                  key={`${program.jurisdiction}/${program.programId}`}
                  href={graphViewerUrl(program, focus)}
                  target="_blank"
                  rel="noreferrer"
                  title={`${program.programId} (${program.jurisdiction}): ${program.ruleCount} ${program.ruleCount === 1 ? "rule" : "rules"} from this section · ${program.mode} — view in graph`}
                  className={`rounded-sm border border-[var(--color-rule)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider no-underline transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] ${
                    program.status === "ready"
                      ? "text-[var(--color-ink-secondary)]"
                      : "text-[var(--color-ink-muted)] opacity-60"
                  }`}
                >
                  {jurisdictionChip(program.jurisdiction)}
                </a>
              ))}
            </div>
            {(() => {
              const runnable = group.filter(
                (program) => program.status === "ready"
              );
              return runnable.length > 0 ? (
                <RunSample programs={runnable} sectionFocus={focus} />
              ) : null;
            })()}
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
  builderLinkForRule,
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
  builderLinkForRule: (ruleName: string) => string | null;
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
        builderLinkForRule={builderLinkForRule}
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
  builderLinkForRule,
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
  builderLinkForRule: (ruleName: string) => string | null;
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
        builderLinkForRule={builderLinkForRule}
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
