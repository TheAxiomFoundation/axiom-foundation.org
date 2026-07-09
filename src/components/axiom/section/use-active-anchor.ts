"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-spy over a list of element ids (in document order): returns
 * the id of the topmost element currently in the viewport band.
 * Shared by the TOC (highlight) and the encoding rail (follow mode).
 */
export function useActiveAnchor(anchors: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (anchors.length === 0) return;
    const targets = anchors
      .map((anchor) => document.getElementById(anchor))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    // Track which targets are on screen; the active row is the first
    // visible one in document order (or the last scrolled past when
    // none are visible, so fast scrolling doesn't blank the spy).
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = anchors.find((anchor) => visible.has(anchor));
        if (first) setActive(first);
      },
      { rootMargin: "-96px 0px -60% 0px" }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // anchors is stable per page render (derived from server data).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchors.join("|")]);

  return active;
}
