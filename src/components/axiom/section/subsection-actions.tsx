"use client";

import { useState } from "react";

/**
 * Quiet action row at a deep-linked subsection heading — the verbs a
 * sent visitor came for, surfaced at the point of attention instead
 * of buried in the rail: copy a formatted citation, open the
 * dependency graph, or use the subsection's rule as a calculator
 * output in the builder.
 */
export function SubsectionActions({
  citationLabel,
  href,
  graphHref,
  builderHref,
}: {
  /** Formatted legal citation, e.g. "7 U.S.C. § 2017(a)". */
  citationLabel: string;
  /** App-relative canonical path for this subsection. */
  href: string;
  graphHref: string | null;
  builderHref: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const copyCitation = async () => {
    const text = `${citationLabel} — ${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave
      // the URL itself as the fallback affordance.
    }
  };

  const linkClass =
    "font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors";

  return (
    <p
      data-testid="subsection-actions"
      className="mt-1 flex flex-wrap items-center gap-3"
    >
      <button
        type="button"
        onClick={copyCitation}
        data-testid="copy-citation"
        title={`Copy "${citationLabel}" with a link to this subsection`}
        className={`${linkClass} cursor-pointer border-0 bg-transparent p-0`}
      >
        {copied ? "copied ✓" : `cite · ${citationLabel}`}
      </button>
      {graphHref && (
        <a
          href={graphHref}
          target="_blank"
          rel="noreferrer"
          title="View this subsection's rules in the program graph"
          className={linkClass}
        >
          graph ↗
        </a>
      )}
      {builderHref && (
        <a
          href={builderHref}
          target="_blank"
          rel="noreferrer"
          title="Use this subsection's rule as a calculator output in the builder"
          className={linkClass}
        >
          use in builder ↗
        </a>
      )}
    </p>
  );
}
