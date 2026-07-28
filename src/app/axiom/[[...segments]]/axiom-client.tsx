"use client";

import { AxiomBrowser } from "@/components/axiom/document-browser";
import type { InitialTreeNodesState } from "@/lib/axiom/tree-cache";
import type { AxiomStats } from "@/lib/supabase";

/**
 * Thin client subtree for the Axiom route. The server component in
 * ``page.tsx`` handles metadata + JSON-LD; this file mounts the
 * browser under one "use client" boundary.
 */
export function AxiomClient({
  segments,
  initialTreeState,
  initialStats,
  initialEncodedOnly,
}: {
  segments: string[];
  initialTreeState?: InitialTreeNodesState | null;
  initialStats?: AxiomStats | null;
  initialEncodedOnly?: boolean;
}) {
  // The command palette provider now lives in the root layout (the
  // nav's search trigger needs it), so this subtree only mounts the
  // browser.
  return (
    <div className="relative z-1 pt-24 pb-16">
      <AxiomBrowser
        segments={segments}
        initialTreeState={initialTreeState}
        initialStats={initialStats}
        initialEncodedOnly={initialEncodedOnly}
      />
    </div>
  );
}
