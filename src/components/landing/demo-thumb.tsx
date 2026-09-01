"use client";

import { useEffect, useState } from "react";

/**
 * Demo preview thumb: a static poster that upgrades to the live
 * scaled-iframe preview only on desktop-class devices (hover + fine
 * pointer + wide viewport).
 *
 * The gate is a crash guard, not a bandwidth nicety. Each live thumb
 * boots a full app document — and the /about thumb embeds the demo
 * gallery, which embeds six more apps, all laid out in the 5×
 * oversized viewport the 0.2-scale thumb creates. On iPhones the
 * combined footprint blows WebKit's per-tab memory budget; Safari
 * crash-reloads, scroll restoration re-triggers the lazy iframe, and
 * the visitor is stuck in a refresh loop (reported on /about 9/1 and
 * on the landing 7/25). Never mount these iframes on touch devices.
 */
export function DemoThumb({
  src,
  poster,
  title,
}: {
  /** The live surface the desktop preview embeds. */
  src: string;
  /** Static screenshot of the same surface, served to everyone else. */
  poster: string;
  title: string;
}) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 1024px)",
    );
    const apply = () => setLive(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <span className="landing-demo-thumb" aria-hidden>
      {live ? (
        <iframe src={src} title={title} loading="lazy" tabIndex={-1} />
      ) : (
        <img src={poster} alt="" loading="lazy" decoding="async" />
      )}
    </span>
  );
}
