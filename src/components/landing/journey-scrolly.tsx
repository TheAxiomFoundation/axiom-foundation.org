"use client";

import { useEffect, useRef, useState } from "react";
import { CorpusLibrary, DUR as LIB_DUR } from "./corpus-library";
import { CYCLE, JourneyFilm } from "./journey-film";

/**
 * The journey as a scrolly story, opening exactly like the
 * architecture repo's Journey tab: the reading room — five bays of
 * cloth spines, Title 7 pulled off the shelf, opened to § 2017 — and
 * only then the film: segmentation, the gates, the graph, the
 * registry pull-back.
 *
 * Both acts run on SMIL clocks (library 14.2s, film 56s), so scroll
 * doesn't re-author anything: we pause each SVG's clock and scrub
 * `setCurrentTime` from scroll progress. The film crossfades in over
 * the landed page, same as the demo's auto mode.
 *
 * Scrolly engages on wide viewports with motion allowed; elsewhere
 * the two acts run themselves (library → film → library), a compact
 * version of the demo's autopilot.
 */
const TRACK_VH = 820;

// Damping for the scrub: scroll sets a target, and each frame the
// clock eases toward it by this fraction. ~0.08 at 60fps ≈ a 200ms
// settle — wheel flicks glide instead of teleporting the camera.
const EASE = 0.08;

// Share of the track given to the library act. The library's 14.2s
// carries less story-per-second than the film — a quarter feels right.
const LIB_SHARE = 0.26;

// Film scrub range — the statute page, settled, through the wide
// graph shot. Ends at 0.848: the constellation's own fade-out ramp
// begins at ~0.852 of the cycle, and the scroll must land on the
// fully-lit wide shot, not mid-fade.
const FILM_FROM = 0.207 * CYCLE;
const FILM_TO = 0.848 * CYCLE;

function AutoJourney() {
  const [phase, setPhase] = useState<"lib" | "film">("lib");
  const [cycle, setCycle] = useState(0);
  return (
    <div className="jdemo__stage">
      <div key={`lib-${cycle}`} className="jdemo__layer">
        <CorpusLibrary autopilot onArrived={() => setPhase("film")} />
      </div>
      {phase === "film" && (
        <div className="jdemo__over">
          <JourneyFilm
            startOffset={FILM_FROM}
            endAt={FILM_TO}
            onCycleEnd={() => {
              setPhase("lib");
              setCycle((c) => c + 1);
            }}
          />
        </div>
      )}
    </div>
  );
}

export function JourneyScrolly() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolly, setScrolly] = useState(false);
  const [filmOn, setFilmOn] = useState(false);

  useEffect(() => {
    // One commit: the acts must mount with the right mode.
    const mm = typeof window.matchMedia === "function";
    const wide = mm && window.matchMedia("(min-width: 901px)").matches;
    const noMotion =
      mm && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setScrolly(wide && !noMotion);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !scrolly) return;
    const track = trackRef.current;
    const lib = track?.querySelector<SVGSVGElement>("svg.clib-svg");
    const film = track?.querySelector<SVGSVGElement>("svg.lsk");
    if (
      !track ||
      !lib ||
      !film ||
      typeof lib.pauseAnimations !== "function" ||
      typeof film.pauseAnimations !== "function"
    )
      return;
    lib.pauseAnimations();
    film.pauseAnimations();

    // Apply a smoothed progress value to both clocks.
    const apply = (p: number) => {
      if (p < LIB_SHARE) {
        // hold just short of the freeze frame so the last SMIL ramp
        // still has range to scrub through
        lib.setCurrentTime((p / LIB_SHARE) * (LIB_DUR - 0.05));
        film.setCurrentTime(FILM_FROM);
        setFilmOn(false);
      } else {
        lib.setCurrentTime(LIB_DUR - 0.05);
        const fp = (p - LIB_SHARE) / (1 - LIB_SHARE);
        film.setCurrentTime(FILM_FROM + fp * (FILM_TO - FILM_FROM));
        setFilmOn(true);
      }
    };

    // Damped follower: scroll only moves the target; a rAF loop eases
    // the applied progress toward it and stops when settled.
    const s = { target: 0, current: 0, raf: 0, running: false };
    const tick = () => {
      const d = s.target - s.current;
      if (Math.abs(d) < 0.0004) {
        s.current = s.target;
        apply(s.current);
        s.running = false;
        return;
      }
      s.current += d * EASE;
      apply(s.current);
      s.raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      s.target = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      if (!s.running) {
        s.running = true;
        s.raf = requestAnimationFrame(tick);
      }
    };
    // First paint lands directly on the target — no glide on load.
    const rect = track.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    s.target = s.current =
      total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    apply(s.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(s.raf);
    };
  }, [mounted, scrolly]);

  return (
    <div
      ref={trackRef}
      style={scrolly ? { height: `${TRACK_VH}vh` } : undefined}
    >
      <div className={scrolly ? "sticky top-[96px]" : undefined}>
        {!mounted ? (
          <div aria-hidden className="w-full aspect-[1420/620] min-h-[320px]" />
        ) : scrolly ? (
          <div className="jdemo__stage">
            <div className="jdemo__layer">
              <CorpusLibrary autopilot />
            </div>
            <div
              className="jdemo__over"
              style={{
                animation: "none",
                opacity: filmOn ? 1 : 0,
                pointerEvents: filmOn ? undefined : "none",
                transition: "opacity 600ms var(--ease-out, ease-out)",
              }}
            >
              <JourneyFilm paused startOffset={FILM_FROM} />
            </div>
          </div>
        ) : (
          <AutoJourney />
        )}
        {scrolly && (
          <p className="pscroll-hint mt-3" aria-hidden>
            scroll to run the pipeline ↓
          </p>
        )}
      </div>
    </div>
  );
}
