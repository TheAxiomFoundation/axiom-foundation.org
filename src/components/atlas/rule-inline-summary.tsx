"use client";

import type { ViewerDocument } from "@/lib/atlas-utils";
import type { Rule } from "@/lib/supabase";
import { getJurisdictionLabel } from "@/lib/atlas-utils";

interface RuleInlineSummaryProps {
  document: ViewerDocument;
  rule: Rule;
  childCount: number;
}

/**
 * A compact "you are here" card for container-rule pages — sections
 * and subsections that have their own heading/body *and* children.
 *
 * Shows the same Axiom header treatment as the full reader (eyebrow
 * → gradient citation → serif title) followed by a body preview.
 * No encoding rail, no agent drawer, no sibling strip — those belong
 * in the leaf view. Here the job is to orient the reader before they
 * drill into the children list below.
 *
 * Body is truncated to the first two paragraphs so the card stays
 * proportionate to the tree list beneath it. A subtle "continue
 * below" line nudges the reader to the children.
 */
export function RuleInlineSummary({
  document,
  rule,
  childCount,
}: RuleInlineSummaryProps) {
  const docKind =
    document.jurisdiction === "us" ||
    document.jurisdiction.startsWith("us-")
      ? "Code"
      : "Statute";

  const previewParagraphs = (rule.body ?? "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <section
      data-testid="rule-inline-summary"
      className="mb-8 px-8 py-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md"
    >
      <div className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span>{getJurisdictionLabel(document.jurisdiction)}</span>
        <span aria-hidden="true" className="text-[var(--color-ink-muted)]">
          ·
        </span>
        <span className="text-[var(--color-ink-muted)]">{docKind}</span>
        {document.hasRac && (
          <>
            <span aria-hidden="true" className="text-[var(--color-ink-muted)]">
              ·
            </span>
            <span>Encoded</span>
          </>
        )}
      </div>
      <h1 className="heading-section text-[var(--color-ink)] m-0 break-words">
        {document.citation}
      </h1>
      <p
        className="mt-3 text-[1.05rem] leading-snug text-[var(--color-ink-secondary)]"
        style={{ fontFamily: "var(--f-serif)" }}
      >
        {document.title}
      </p>

      {previewParagraphs.length > 0 && (
        <div
          className="mt-5 pt-5 border-t border-[var(--color-rule)] text-[0.95rem] leading-relaxed text-[var(--color-ink-secondary)] space-y-3 max-w-[720px]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {previewParagraphs.map((p, i) => (
            <p key={i} className="m-0 whitespace-pre-wrap">
              {p}
            </p>
          ))}
        </div>
      )}

      {childCount > 0 && (
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
          {childCount} {childCount === 1 ? "subsection" : "subsections"} below
          — select one to read the full text.
        </p>
      )}
    </section>
  );
}
