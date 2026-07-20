"use client";

import type { ReactNode } from "react";
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

import { programFamily } from "@/lib/axiom/runtime/families";

/** Short jurisdiction chip: "us-co" → "CO", "us" → "US", "uk" → "UK". */
function jurisdictionChip(jurisdiction: string): string {
  const parts = jurisdiction.split("-");
  return (parts[1] ?? parts[0]).toUpperCase();
}

/**
 * Collapsed-by-default disclosure. Native <details> so the rail
 * stays server-renderable and works without JS; the reading page is
 * calm and one click opens each drawer.
 */
function RailSection({
  summary,
  testId,
  defaultOpen = false,
  children,
}: {
  summary: string;
  testId?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      data-testid={testId}
      open={defaultOpen}
      className="group border-t border-[var(--color-rule)] pt-2"
    >
      <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        {summary}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

/** Jurisdiction chips linking each program into the graph viewer. */
function ProgramChips({
  programs,
  focus,
}: {
  programs: ProvisionProgramCoverage[];
  focus: string | null;
}) {
  const families = new Map<string, ProvisionProgramCoverage[]>();
  for (const program of programs) {
    const family = programFamily(program);
    const group = families.get(family);
    if (group) group.push(program);
    else families.set(family, [program]);
  }
  return (
    <ol data-testid="rail-programs" className="space-y-3">
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
        </li>
      ))}
    </ol>
  );
}

/**
 * The v2 rail — the inspector for the node being read. Order of
 * importance, top down: where you are and what ran (always visible),
 * then Rules / Executable-in / Citations as collapsed drawers. The
 * reading column stays calm; this is where the machinery lives.
 *
 * Follow mode (default) scopes everything to the subsection under
 * the reading line; above the first subsection it covers the whole
 * section.
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
  sectionRuleIds = [],
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
  /** Durable legal ids traced with runs. */
  sectionRuleIds?: string[];
}) {
  const active = useActiveAnchor(chunks.map((chunk) => chunk.anchor));
  const activeChunk = chunks.find((chunk) => chunk.anchor === active);
  const nodeMode = Boolean(activeChunk);

  const slug = citationPath?.split("/")[0] ?? null;
  const sectionFocus = citationPath
    ? graphFocusForCitationPath(citationPath)
    : null;
  const graphLinkForRule = (ruleName: string): string | null => {
    const filePath = ruleFiles[ruleName];
    if (!filePath || !slug || programs.length === 0) return null;
    const program =
      programs.find((candidate) => candidate.ruleNames.includes(ruleName)) ??
      programs[0];
    return graphViewerUrl(program, ruleGraphFocus(slug, filePath, ruleName));
  };
  const builderLinkForRule = (ruleName: string): string | null => {
    const filePath = ruleFiles[ruleName];
    if (!filePath || !slug) return null;
    return builderUrlForRule(ruleGraphFocus(slug, filePath, ruleName));
  };

  // Scope everything to the active subsection in follow mode.
  const nodeRules = activeChunk
    ? encodedRules.filter((rule) => rule.anchors.includes(activeChunk.anchor))
    : encodedRules;
  const nodeOutgoing = activeChunk
    ? (refsForChunk(outgoing, activeChunk.text) as InlineReference[])
    : outgoing;
  const nodeIncoming = nodeMode ? [] : incoming;
  const nodePrograms = activeChunk
    ? programs.filter((program) =>
        program.anchors.includes(activeChunk.anchor)
      )
    : programs;
  const textAnchors = Object.fromEntries(
    nodeRules
      .filter((rule) => rule.anchors.length > 0)
      .map((rule) => [
        rule.name,
        activeChunk ? activeChunk.anchor : rule.anchors[0],
      ])
  );

  const citesSummary =
    nodeOutgoing.length > 0 || nodeIncoming.length > 0
      ? `citations (${nodeOutgoing.length}${
          nodeIncoming.length > 0 ? ` · cited by ${nodeIncoming.length}` : ""
        })`
      : null;

  return (
    <div>
      <p
        data-testid="rail-header"
        className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]"
      >
        {activeChunk
          ? `This subsection — ${activeChunk.designator}`
          : "This section"}
      </p>
      <p className="mb-3 font-mono text-[10px] text-[var(--color-ink-muted)]">
        {nodeRules.length} {nodeRules.length === 1 ? "rule" : "rules"}
        {nodePrograms.length > 0 &&
          ` · in ${nodePrograms.length} ${nodePrograms.length === 1 ? "program" : "programs"}`}
      </p>

      <RunSample programs={programs} sectionFocus={sectionFocus} sectionRuleIds={sectionRuleIds} />

      <div className="mt-4 space-y-2">
        {(encoding || nodeRules.length > 0) && (
          <RailSection
            summary={`rules (${nodeRules.length})`}
            testId="rail-rules"
          >
            <RuleSpecTab
              encoding={encoding}
              loading={false}
              jurisdiction={jurisdiction}
              citationPath={citationPath}
              isRepealed={isRepealed}
              showSummary={false}
              showHeader={!nodeMode}
              ruleGroups={
                activeChunk
                  ? [
                      {
                        label: activeChunk.label,
                        ruleNames: nodeRules.map((rule) => rule.name),
                      },
                    ]
                  : undefined
              }
              includeUngrouped={!activeChunk}
              textAnchors={textAnchors}
              graphLinkForRule={graphLinkForRule}
              builderLinkForRule={builderLinkForRule}
            />
          </RailSection>
        )}
        {nodePrograms.length > 0 && (
          <RailSection
            summary={`executable in (${nodePrograms.length})`}
            testId="rail-executable"
          >
            <ProgramChips programs={nodePrograms} focus={sectionFocus} />
          </RailSection>
        )}
        {citesSummary && (
          <RailSection summary={citesSummary} testId="rail-citations">
            <ReferencesPanel outgoing={nodeOutgoing} incoming={nodeIncoming} />
          </RailSection>
        )}
      </div>
    </div>
  );
}
