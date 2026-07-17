"use client";

import { traceByAnchor } from "@/lib/axiom/runtime/trace-map";
import { useTraceRun } from "./trace-context";

function formatValue(value: number | string | boolean | null): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

/**
 * The trace overlay's per-subsection annotation: after a run, each
 * subsection that produced a value shows it inline — the statute
 * showing its work. Chips link to the rule's card in the rail.
 */
export function ChunkTraceChips({
  anchor,
  sectionFocus,
}: {
  anchor: string;
  /** File-legal-id prefix of the section ("us:statutes/7/2017"). */
  sectionFocus: string | null;
}) {
  const { run } = useTraceRun();
  if (!run || !sectionFocus) return null;
  const entries = traceByAnchor(run.trace, sectionFocus).get(anchor) ?? [];
  if (entries.length === 0) return null;

  return (
    <p
      data-testid={`trace-chips-${anchor}`}
      className="mt-1.5 flex flex-wrap items-center gap-1.5"
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
        Computed · {run.programId}
      </span>
      {entries.map((entry) => (
        <a
          key={`${entry.rule_id}-${entry.variable}`}
          href={`#rule-${entry.rule_id}`}
          title={`${entry.variable} — computed by ${entry.rule_id} for the sample household; view the rule`}
          className="rounded border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink)] hover:border-[var(--color-accent)] transition-colors"
        >
          {entry.variable} ={" "}
          <span className="font-semibold">{formatValue(entry.value)}</span>
        </a>
      ))}
    </p>
  );
}
