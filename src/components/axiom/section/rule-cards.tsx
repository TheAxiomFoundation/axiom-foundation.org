import type { SectionPageData } from "@/lib/axiom/section-page";
import {
  composeGraphViewerUrl,
  graphViewerUrl,
  ruleGraphFocus,
} from "@/lib/axiom/runtime/graph-links";
import { primaryProgram } from "./primary-program";

/**
 * The encoded layer, leading the section page: one card per rule
 * derived from this provision. Each card is a single clear action —
 * open the rule in the graph, focused — with the subsection it
 * implements as its grounding line. Kind glyphs: ƒ derived rule,
 * □ parameter.
 */
export function RuleCards({ data }: { data: SectionPageData }) {
  if (data.encodedRules.length === 0) return null;
  const slug = data.citationPath.split("/")[0];
  const program = primaryProgram(data.programs);

  const hrefFor = (ruleName: string): string | null => {
    const filePath = data.ruleFiles[ruleName];
    if (!filePath) return null;
    const focus = ruleGraphFocus(slug, filePath, ruleName);
    return program
      ? graphViewerUrl(program, focus)
      : composeGraphViewerUrl(focus);
  };

  return (
    <section data-testid="rule-cards" className="mt-8">
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        Encoded rules · {data.encodedRules.length}
      </h2>
      <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.encodedRules.map((rule) => {
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
                  <span className="shrink-0 text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]">
                    graph →
                  </span>
                )}
              </span>
            </>
          );
          const cardClass =
            "group block rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-3.5 py-3 no-underline transition-colors";
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
    </section>
  );
}
