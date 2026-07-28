"use client";

import { useState, type ReactNode } from "react";

/**
 * Clamped source-text preview. The encoded layer leads the section
 * page; the statute text grounds it and expands on demand — a
 * preview first, the wall of words only when asked for.
 */
export function CollapsibleText({
  children,
  defaultOpen = false,
  label = "read the full text",
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid="collapsible-text">
      <div
        className={
          open
            ? ""
            : "relative max-h-28 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]"
        }
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-1.5 cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
      >
        {open ? "collapse ▴" : `${label} ▾`}
      </button>
    </div>
  );
}
