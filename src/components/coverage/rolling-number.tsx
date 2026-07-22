"use client";

import { useEffect, useState } from "react";

/**
 * Odometer digits for the coverage figures. Two modes:
 *
 * - spin: every digit reel loops continuously — the loading state
 *   (used by the route skeleton while data is fetched).
 * - settle (default): reels start at 0 and roll to the target digit
 *   when `active` flips true, staggered right-to-left.
 *
 * Server-rendered HTML, no-JS, jsdom, and prefers-reduced-motion all
 * get the plain text — the reels are a client enhancement mounted
 * after hydration, so the static document always carries the real
 * figure.
 */
export function RollingNumber({
  text,
  active = true,
  delayMs = 0,
  spin = false,
}: {
  text: string;
  active?: boolean;
  delayMs?: number;
  spin?: boolean;
}) {
  const [reels, setReels] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReels(true);
  }, []);

  if (!reels) return <span>{text}</span>;

  return (
    <span className="roll" aria-label={spin ? "loading" : text}>
      {text.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="roll-digit" aria-hidden>
            <span
              className={spin ? "roll-strip roll-strip-spin" : "roll-strip"}
              style={
                spin
                  ? { animationDelay: `${(i % 5) * -160}ms` }
                  : {
                      transform:
                        active && ch !== "0"
                          ? `translateY(-${Number(ch)}em)`
                          : "translateY(0)",
                      transitionDelay: `${delayMs + i * 70}ms`,
                    }
              }
            >
              {"01234567890".split("").map((d, j) => (
                <span key={j} className="roll-cell">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        )
      )}
    </span>
  );
}
