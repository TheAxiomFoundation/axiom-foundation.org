"use client";

import { useEffect, useState } from "react";
import { useCommandPalette } from "./command-palette-provider";

/**
 * Visible trigger that opens the command palette. Two variants:
 *
 *   variant="hero"    — big primary CTA for the landing page
 *   variant="compact" — slim pill for secondary placements (header,
 *                       breadcrumb row) so keyboard-averse users can
 *                       still discover the palette
 *
 * Also renders the platform-correct shortcut label (``⌘K`` on Mac,
 * ``Ctrl K`` elsewhere). Label is decorative — the real shortcut is
 * registered globally by the CommandPaletteProvider.
 */
export function PaletteTrigger({
  variant = "compact",
}: {
  variant?: "hero" | "compact";
}) {
  const { open } = useCommandPalette();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent));
  }, []);

  const shortcut = isMac ? "⌘K" : "Ctrl K";

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={open}
        className="group w-full max-w-[560px] mx-auto flex items-center gap-3 px-5 py-4 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] hover:border-[var(--color-accent)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
        aria-label="Open Atlas command palette"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className="w-5 h-5 text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" strokeLinecap="round" />
        </svg>
        <span className="flex-1 text-left text-base text-[var(--color-ink-muted)]">
          Search citation, program, or topic…
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)] border border-[var(--color-rule)] rounded px-1.5 py-0.5 shrink-0">
          {shortcut}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
      aria-label="Open Atlas command palette"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
        className="w-3.5 h-3.5 shrink-0"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="M14 14l4 4" strokeLinecap="round" />
      </svg>
      <span className="font-mono text-[11px] uppercase tracking-wider">
        Search
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider border border-[var(--color-rule)] rounded px-1 py-px">
        {shortcut}
      </span>
    </button>
  );
}
