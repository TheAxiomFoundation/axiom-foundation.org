"use client";

import { AtlasBrowser } from "@/components/atlas/document-browser";
import { CommandPaletteProvider } from "@/components/atlas/command-palette-provider";

/**
 * Thin client subtree for the Atlas route. The server component in
 * ``page.tsx`` handles metadata + JSON-LD; this file mounts the
 * command palette provider and the browser under one "use client"
 * boundary.
 */
export function AtlasClient({ segments }: { segments: string[] }) {
  return (
    <CommandPaletteProvider>
      <div className="relative z-1 pt-24 pb-16">
        <AtlasBrowser segments={segments} />
      </div>
    </CommandPaletteProvider>
  );
}
