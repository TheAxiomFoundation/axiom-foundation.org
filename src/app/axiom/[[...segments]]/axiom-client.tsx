"use client";

import { AxiomBrowser } from "@/components/axiom/document-browser";
import { CommandPaletteProvider } from "@/components/axiom/command-palette-provider";
import type { InitialTreeNodesState } from "@/lib/axiom/tree-cache";

/**
 * Thin client subtree for the Axiom route. The server component in
 * ``page.tsx`` handles metadata + JSON-LD; this file mounts the
 * command palette provider and the browser under one "use client"
 * boundary.
 */
export function AxiomClient({
  segments,
  initialTreeState,
}: {
  segments: string[];
  initialTreeState?: InitialTreeNodesState | null;
}) {
  return (
    <CommandPaletteProvider>
      <div className="relative z-1 pt-24 pb-16">
        <AxiomBrowser
          segments={segments}
          initialTreeState={initialTreeState}
        />
      </div>
    </CommandPaletteProvider>
  );
}
