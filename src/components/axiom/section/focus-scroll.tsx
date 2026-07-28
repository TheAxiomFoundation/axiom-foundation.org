"use client";

import { useEffect } from "react";

/**
 * Scrolls the focused subsection into view on mount. Used when a
 * subsection URL (…/26/32/a) resolves to its parent section page —
 * the anchor is in the path, not the hash, so the browser won't
 * scroll on its own.
 */
export function FocusScroll({ anchor }: { anchor: string }) {
  useEffect(() => {
    const el = document.getElementById(anchor);
    if (!el) return;
    const handle = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [anchor]);

  return null;
}
