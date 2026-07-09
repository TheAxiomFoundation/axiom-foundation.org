"use client";

import { useState } from "react";
import type { RuleEncodingData } from "@/lib/supabase";
import type {
  EncodedRuleLink,
  RailRuleGroup,
} from "@/lib/axiom/section-page";
import { RuleSpecTab } from "@/components/axiom/rulespec-tab";
import { useActiveAnchor } from "./use-active-anchor";

/**
 * The v2 encoding rail. Default mode follows the reading column: the
 * scroll-spy tracks the subsection in view and the rail shows every
 * rule whose source cites it — the code stays side by side with the
 * law as you scroll. "All" switches back to the full
 * document-ordered grouping.
 */
export function EncodingRail({
  encoding,
  jurisdiction,
  citationPath,
  isRepealed,
  chunks,
  encodedRules,
  allGroups,
}: {
  encoding: RuleEncodingData | null;
  jurisdiction: string;
  citationPath: string | null;
  isRepealed: boolean;
  chunks: Array<{ anchor: string; label: string }>;
  encodedRules: EncodedRuleLink[];
  allGroups: RailRuleGroup[];
}) {
  const [follow, setFollow] = useState(true);
  const active = useActiveAnchor(chunks.map((chunk) => chunk.anchor));
  const activeChunk = chunks.find((chunk) => chunk.anchor === active);
  const canFollow = chunks.length > 0 && encodedRules.length > 0;
  const following = follow && canFollow && Boolean(activeChunk);

  const groups = following
    ? [
        {
          label: activeChunk!.label,
          ruleNames: encodedRules
            .filter((rule) => rule.anchors.includes(activeChunk!.anchor))
            .map((rule) => rule.name),
        },
      ]
    : allGroups;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          Encoding
        </p>
        {canFollow && (
          <div
            role="group"
            aria-label="Encoding rail mode"
            className="flex rounded border border-[var(--color-rule)] font-mono text-[10px] uppercase tracking-wider"
          >
            <button
              type="button"
              aria-pressed={follow}
              onClick={() => setFollow(true)}
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
              onClick={() => setFollow(false)}
              className={`px-2 py-1 cursor-pointer border-l border-[var(--color-rule)] transition-colors ${
                !follow
                  ? "bg-[var(--color-code-bg)] text-[var(--color-ink)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              All
            </button>
          </div>
        )}
      </div>
      <RuleSpecTab
        encoding={encoding}
        loading={false}
        jurisdiction={jurisdiction}
        citationPath={citationPath}
        isRepealed={isRepealed}
        showSummary={false}
        ruleGroups={groups}
        includeUngrouped={!following}
      />
    </div>
  );
}
