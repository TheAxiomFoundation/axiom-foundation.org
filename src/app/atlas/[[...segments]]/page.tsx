/* v8 ignore start -- Next.js async params wrapper */
"use client";

import { use } from "react";
import { AtlasBrowser } from "@/components/atlas/document-browser";
import { CommandPaletteProvider } from "@/components/atlas/command-palette-provider";

export default function AtlasPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments } = use(params);
  return (
    <CommandPaletteProvider>
      <div className="relative z-1 pt-24 pb-16">
        <AtlasBrowser segments={segments || []} />
      </div>
    </CommandPaletteProvider>
  );
}
/* v8 ignore stop */
