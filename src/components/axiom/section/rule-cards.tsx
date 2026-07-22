import type { EncodedRuleLink } from "@/lib/axiom/section-page";

/**
 * Presentational card list for encoded rules — the face of the
 * rail's encodings section. Each card is a single clear action:
 * open the rule in the graph, focused. Kind glyphs: ƒ derived rule,
 * □ parameter.
 */
export function RuleCardList({
  rules,
  hrefFor,
}: {
  rules: EncodedRuleLink[];
  hrefFor: (ruleName: string) => string | null;
}) {
  if (rules.length === 0) return null;
  return (
    <ol data-testid="rule-cards" className="grid grid-cols-1 gap-1.5">
      {rules.map((rule) => {
        const href = hrefFor(rule.name);
        const inner = (
          <>
            <span className="flex items-baseline gap-2">
              <span
                aria-hidden
                title={rule.kind === "derived" ? "Derived rule" : "Parameter"}
                className="font-mono text-[12px] text-[var(--color-accent)]"
              >
                {rule.kind === "derived" ? "ƒ" : "□"}
              </span>
              <span className="min-w-0 truncate font-mono text-[13px] text-[var(--color-ink)]">
                {rule.name}
              </span>
            </span>
            <span className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              <span>
                {rule.anchors.length > 0
                  ? `implements (${rule.anchors.join(") (")})`
                  : "whole section"}
              </span>
              {href && (
                <span className="shrink-0 transition-colors group-hover:text-[var(--color-accent)]">
                  graph →
                </span>
              )}
            </span>
          </>
        );
        const cardClass =
          "group block rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-3 py-2.5 no-underline transition-colors";
        return (
          <li key={rule.name}>
            {href ? (
              <a
                href={href}
                className={`${cardClass} hover:border-[var(--color-accent)]`}
              >
                {inner}
              </a>
            ) : (
              <div className={cardClass}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
