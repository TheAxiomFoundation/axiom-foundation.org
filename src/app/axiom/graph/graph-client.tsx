"use client";

import dynamic from "next/dynamic";

/**
 * Client boundary for the graph viewer. React Flow measures the DOM
 * and the viewer reads window.location at mount, so it renders
 * client-only; the skeleton keeps the canvas area stable meanwhile.
 */
const GraphViewerApp = dynamic(
  () =>
    import("@/components/axiom/graph-viewer/viewer-app").then(
      (mod) => mod.GraphViewerApp
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          loading graph…
        </p>
      </div>
    ),
  }
);

export function GraphClient() {
  return <GraphViewerApp />;
}
