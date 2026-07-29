import type { EncodedRuleLink } from "@/lib/axiom/section-page";
import CodeBlock from "@/components/code-block";

export interface RuleCardDetail {
  /** The rule's source citation string ("26 USC 32(a)(1)"). */
  source: string | null;
  /** The rule's own YAML block, for the expanded view. */
  yaml: string | null;
}

/**
 * Expandable card list for encoded rules — the face of the rail's
 * encodings section. The summary row identifies the rule (kind
 * glyph, name, the subsection it implements); expanding reveals its
 * source citation, its RuleSpec YAML, and the graph action. Kind
 * glyphs: ƒ derived rule, □ parameter.
 */
export function RuleCardList({
  rules,
  hrefFor,
  detailFor,
  citationLabel = "",
  onExpand,
}: {
  rules: EncodedRuleLink[];
  hrefFor: (ruleName: string) => string | null;
  detailFor?: (ruleName: string) => RuleCardDetail | null;
  /** Compact legal cite for the section ("7 USC § 2017") — grounds
   *  each card's second line without per-card glyph icons. */
  citationLabel?: string;
  /** Fired when a card opens (not on close) — the "encoding viewed"
   *  moment for analytics. Client parents only. */
  onExpand?: (ruleName: string) => void;
}) {
  if (rules.length === 0) return null;
  return (
    <ol data-testid="rule-cards" className="grid grid-cols-1 gap-1.5">
      {rules.map((rule) => {
        const href = hrefFor(rule.name);
        const detail = detailFor?.(rule.name) ?? null;
        const cite = citationLabel
          ? `${citationLabel}${
              rule.anchors.length > 0 ? ` (${rule.anchors.join(")(")})` : ""
            }`
          : rule.anchors.length > 0
            ? `(${rule.anchors.join(")(")})`
            : "";
        return (
          <li key={rule.name}>
            <details
              onToggle={(event) => {
                if (event.currentTarget.open) onExpand?.(rule.name);
              }}
              className="group rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] transition-colors open:border-[var(--color-accent)]/40 hover:border-[var(--color-accent)]"
            >
              <summary className="block cursor-pointer list-none px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[var(--color-ink)]">
                    {rule.name}
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 text-[10px] text-[var(--color-ink-muted)] transition-transform group-open:rotate-90"
                  >
                    ▸
                  </span>
                </span>
                <span className="mt-1 block truncate text-[11px] text-[var(--color-ink-muted)]">
                  {cite}
                  {cite && rule.kind && " · "}
                  {rule.kind}
                </span>
              </summary>
              <div className="border-t border-[var(--color-rule)] px-3 py-2.5">
                {detail?.source && (
                  <p className="m-0 font-mono text-[11px] leading-relaxed text-[var(--color-ink-secondary)]">
                    {detail.source}
                  </p>
                )}
                {detail?.yaml && (
                  <div className="mt-2 max-h-64 overflow-auto rounded">
                    <CodeBlock
                      code={detail.yaml}
                      language="yaml"
                      className="!m-0 text-[11px] leading-relaxed"
                    />
                  </div>
                )}
                {href && (
                  <a
                    href={href}
                    className="mt-2.5 inline-block rounded border border-[var(--color-rule)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)] no-underline transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    open in graph ↗
                  </a>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
