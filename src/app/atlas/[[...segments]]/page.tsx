/* v8 ignore start -- Next.js async params wrapper */
"use client";

import { use } from "react";
import { AtlasBrowser } from "@/components/atlas/document-browser";

export default function AtlasPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments } = use(params);
  return (
    <div className="relative z-1 py-16 px-8">
      <AtlasBrowser segments={segments || []} />
    </div>
  );
}
/* v8 ignore stop */
