"use client";

import { useEffect, useRef } from "react";

/* Module-level WeakMap from canvas → Worker. Lets us keep the worker
 * bound to its canvas across React's StrictMode double-invoke (dev) and
 * Fast Refresh, both of which re-run the effect against the same DOM
 * canvas element. transferControlToOffscreen() can only fire once per
 * canvas, so on subsequent runs we just re-attach event listeners
 * against the existing worker instead of creating a new one. */
const workersByCanvas = new WeakMap<HTMLCanvasElement, Worker>();

/* Citation network 3D — thin client shell.
 *
 * All rendering happens in citation-network.worker.ts on a worker
 * thread via OffscreenCanvas. This component only owns the <canvas>
 * element, transfers control to the worker on mount, and forwards
 * scroll position, mouse position, resize, and prefers-reduced-motion
 * changes via postMessage.
 *
 * Doing the work off-thread keeps the main thread free for scrolling
 * and React, which makes the page feel responsive even when the
 * animation itself is heavy — and lets the worker self-manage its
 * frame rate without contending with React reconciliation.
 *
 * Browsers without OffscreenCanvas (≲5% of traffic in 2025 — mostly
 * Safari < 16.4 and very old Android) fall back to no animation; the
 * canvas stays blank and the rest of the page works normally.
 */

export function CitationNetwork3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Feature detect: OffscreenCanvas + transferControlToOffscreen
    if (typeof canvas.transferControlToOffscreen !== "function") {
      return;
    }

    // Reuse the worker if this canvas was already initialised (StrictMode
    // re-invocation, Fast Refresh, or a parent re-render that re-runs the
    // effect). transferControlToOffscreen throws if called twice on the
    // same canvas, so we must only do it the first time.
    let worker = workersByCanvas.get(canvas);

    if (!worker) {
      try {
        worker = new Worker(
          new URL("./citation-network.worker.ts", import.meta.url),
          { type: "module" }
        );
      } catch {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      let offscreen: OffscreenCanvas;
      try {
        offscreen = canvas.transferControlToOffscreen();
      } catch {
        worker.terminate();
        return;
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      worker.postMessage(
        { type: "init", canvas: offscreen, w, h, dpr, reduced },
        [offscreen]
      );

      workersByCanvas.set(canvas, worker);
    }

    const activeWorker = worker;

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? window.scrollY / max : 0;
      activeWorker.postMessage({ type: "scroll", value });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      activeWorker.postMessage({ type: "mouse", value: { x: e.clientX, y: e.clientY } });
    };
    const onMouseOut = () => {
      activeWorker.postMessage({ type: "mouse", value: null });
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseout", onMouseOut);

    const onResize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      const newDpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${newW}px`;
      canvas.style.height = `${newH}px`;
      activeWorker.postMessage({ type: "resize", w: newW, h: newH, dpr: newDpr });
    };
    window.addEventListener("resize", onResize);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReducedMotion = (e: MediaQueryListEvent) => {
      activeWorker.postMessage({ type: "reduce-motion", value: e.matches });
    };
    mq.addEventListener("change", onReducedMotion);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onReducedMotion);
      /* Worker stays alive — it owns the OffscreenCanvas, which can't
       * be un-transferred. On the next effect run (StrictMode / Fast
       * Refresh / parent re-render) we'll reuse it. On real unmount
       * the canvas is removed from the DOM, the WeakMap entry decays
       * with it, and the browser eventually terminates the orphaned
       * worker via GC. */
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
