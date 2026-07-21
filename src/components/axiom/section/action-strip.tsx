"use client";

import { useState } from "react";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";
import { useRunProgram, runParamFor } from "./use-run-program";

/**
 * The section header's action strip — the page's verbs, surfaced
 * once where every reader sees them instead of buried in the rail:
 * a status line (encoded / executable-in) and Run · Graph · Build ·
 * Cite. The reading column below stays calm; the rail holds the
 * per-node detail.
 */
export function ActionStrip({
  sectionRuleIds = [],
  encodedRuleCount,
  familySummary,
  defaultProgram,
  graphHref,
  builderHref,
  citationLabel,
  href,
}: {
  /** Durable legal ids traced with the run (section rule values). */
  sectionRuleIds?: string[];
  encodedRuleCount: number;
  /** e.g. "snap (7 jurisdictions)" — grouped program families. */
  familySummary: string | null;
  /** Program the Run button executes (first ready program). */
  defaultProgram: ProvisionProgramCoverage | null;
  graphHref: string | null;
  builderHref: string | null;
  citationLabel: string;
  href: string;
}) {
  const { run, runProgram, running } = useRunProgram();
  const [copied, setCopied] = useState(false);

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(
        `${citationLabel} — ${window.location.origin}${href}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the URL itself remains the fallback.
    }
  };

  const buttonClass =
    "rounded border border-[var(--color-rule)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider no-underline cursor-pointer transition-colors";
  const quiet = `${buttonClass} text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]`;

  return (
    <div data-testid="action-strip" className="mt-3 space-y-2">
      {familySummary && (
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          executable in {familySummary}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {defaultProgram && (
          <button
            type="button"
            data-testid="strip-run"
            disabled={running || Boolean(run)}
            onClick={() => runProgram(defaultProgram, sectionRuleIds)}
            title={`Execute the ${runParamFor(defaultProgram)} sample household through the engine — computed values appear in the text below`}
            className={`${buttonClass} border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)] hover:bg-[var(--color-accent)]/20 disabled:cursor-default disabled:opacity-60`}
          >
            {running ? "running…" : run ? "▶ ran sample" : "▶ run sample"}
          </button>
        )}
        {graphHref && (
          <a href={graphHref} target="_blank" rel="noreferrer" className={quiet}>
            graph ↗
          </a>
        )}
        {encodedRuleCount > 0 && !defaultProgram && !graphHref && (
          <span
            data-testid="strip-not-executable"
            title="The rules are encoded, but no compiled runtime package includes this section yet — run unlocks when one does."
            className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]"
          >
            encoded, not yet in an executable program
          </span>
        )}
        {/* Secondary verbs sit off to the right, away from Run/Graph. */}
        {builderHref && (
          <a
            href={builderHref}
            target="_blank"
            rel="noreferrer"
            className={`${quiet} ml-auto`}
          >
            build calculator ↗
          </a>
        )}
        <button
          type="button"
          onClick={copyCitation}
          data-testid="strip-cite"
          className={builderHref ? quiet : `${quiet} ml-auto`}
        >
          {copied ? "copied ✓" : "cite"}
        </button>
      </div>
    </div>
  );
}
