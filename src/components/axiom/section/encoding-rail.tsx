"use client";

import type { ReactNode } from "react";
import type { RuleEncodingData, RuleReference } from "@/lib/supabase";
import type { InlineReference } from "@/lib/axiom/inline-references";
import {
  refsForChunk,
  type EncodedRuleLink,
} from "@/lib/axiom/section-page";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";
import { RuleSpecTab } from "@/components/axiom/rulespec-tab";
import { ReferencesPanel } from "@/components/axiom/references-panel";
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
  const nodeMode = Boolean(activeChunk);

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
      {/* Scope header: one readable line naming what the rail is
          showing right now. Counts live on the drawer summaries — no
          duplicate stat line. */}
      <p className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        in view
      </p>
      <p
        data-testid="rail-header"
        className="mb-3 truncate text-sm text-[var(--color-ink)]"
        style={{ fontFamily: "var(--f-serif)" }}
        title={activeChunk?.label}
      >
        {activeChunk ? activeChunk.label : "Whole section"}
      </p>

      <div className="mt-4 space-y-2">
        {(encoding || nodeRules.length > 0) && (
          <RailSection
            summary={`rules (${nodeRules.length})`}
            testId="rail-rules"
            defaultOpen
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
                        // The rail header already names the node; an
                        // empty label suppresses the duplicate group
                        // heading.
                        label: "",
                        ruleNames: nodeRules.map((rule) => rule.name),
                      },
                    ]
                  : undefined
              }
              includeUngrouped={!activeChunk}
              textAnchors={textAnchors}
            />
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
