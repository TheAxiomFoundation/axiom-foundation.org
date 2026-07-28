"use client";

import { useState } from "react";

/**
 * The section header's action strip — the page's verbs, surfaced
 * once where every reader sees them instead of buried in the rail:
 * Graph · Build · Cite. The reading column below stays calm; the
 * rail holds per-rule links for every encoding.
 */
export function ActionStrip({
  encodedRuleCount,
  graphHref,
  builderHref,
  citationLabel,
  href,
}: {
  encodedRuleCount: number;
  graphHref: string | null;
  builderHref: string | null;
  citationLabel: string;
  href: string;
}) {
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
      <div className="flex flex-wrap items-center gap-2">
        {graphHref && (
          <a href={graphHref} target="_blank" rel="noreferrer" className={quiet}>
            graph ↗
          </a>
        )}
        {builderHref && (
          <a
            href={builderHref}
            target="_blank"
            rel="noreferrer"
            className={quiet}
          >
            build calculator ↗
          </a>
        )}
        {encodedRuleCount > 0 && !graphHref && (
          <span
            data-testid="strip-not-executable"
            title="The rules are encoded but their files are not yet mirrored — graph and builder links unlock when they are."
            className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]"
          >
            encoded — links pending mirror sync
          </span>
        )}
        <button
          type="button"
          onClick={copyCitation}
          data-testid="strip-cite"
          className={`${quiet} ml-auto`}
        >
          {copied ? "copied ✓" : "cite"}
        </button>
      </div>
    </div>
  );
}
