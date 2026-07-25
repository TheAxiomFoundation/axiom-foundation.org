"use client";

import { useEffect, useRef, useState } from "react";
import { CYCLE, JourneyFilm } from "./journey-film";

/**
 * The journey film as a scrolly story: the film is one 56s SMIL clock,
 * so instead of re-authoring its five scenes for scroll we pause the
 * SVG's clock and scrub `setCurrentTime` from scroll progress — the
 * reader drives the camera.
 *
 * Scrolly mode engages only on wide viewports with motion allowed.
 * Everywhere else (mobile, reduced motion, no JS worth of it) the
 * film renders as its normal self-running loop in normal flow — the
 * film's own reduced-motion branch shows a composed still.
 */
const TRACK_VH = 640; // scroll distance that spans the scrubbed range

// Scrub range: skip scene I (the wall of provision dots) and open on
// scene II — the provision shelf — through to the final frame. Scene
// windows live in journey-film.tsx (W.s2 starts at 0.183).
const SCRUB_FROM = 0.183 * CYCLE;
const SCRUB_TO = CYCLE - 0.4;

export function JourneyScrolly() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolly, setScrolly] = useState(false);

  useEffect(() => {
    // One commit: the film must mount with the right `paused` value.
    const wide =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 901px)").matches;
    const noMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setScrolly(wide && !noMotion);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !scrolly) return;
    const track = trackRef.current;
    const svg = track?.querySelector<SVGSVGElement>("svg.lsk");
    if (!track || !svg || typeof svg.pauseAnimations !== "function") return;
    svg.pauseAnimations();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = track.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        // SCRUB_TO stops a hair short of the wrap so p=1 holds the
        // final frame instead of looping back to scene one.
        svg.setCurrentTime(SCRUB_FROM + p * (SCRUB_TO - SCRUB_FROM));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [mounted, scrolly]);

  return (
    <div
      ref={trackRef}
      style={scrolly ? { height: `${TRACK_VH}vh` } : undefined}
    >
      <div className={scrolly ? "sticky top-[96px]" : undefined}>
        {mounted ? (
          <JourneyFilm paused={scrolly} />
        ) : (
          <div aria-hidden className="w-full aspect-[1420/620] min-h-[320px]" />
        )}
        {scrolly && (
          <p
            className="pscroll-hint mt-3"
            aria-hidden
          >
            scroll to run the pipeline ↓
          </p>
        )}
      </div>
    </div>
  );
}
