"use client";

import { useEffect, useState } from "react";

/**
 * Vertical position of the "reading line": a section counts as
 * active once its top edge crosses above this line. Sits below the
 * 96px fixed nav so anchor jumps (scroll-mt-24) land exactly on it.
 */
const READING_LINE_PX = 160;

/**
 * Scroll-spy over a list of element ids (in document order): returns
 * the id of the last element whose top has crossed the reading line
 * — i.e. the subsection currently being read. Null while still above
 * the first section. Shared by the TOC (highlight) and the encoding
 * rail (follow mode).
 *
 * Deliberately scroll-driven rather than IntersectionObserver-based:
 * "last top above the line" is deterministic at anchor-jump
 * boundaries, where observer band membership is ambiguous.
 */
export function useActiveAnchor(anchors: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = anchors.join("|");

  useEffect(() => {
    const ids = key ? key.split("|") : [];
    if (ids.length === 0) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= READING_LINE_PX) {
          current = id;
        } else {
          break;
        }
      }
      setActive(current);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
}
