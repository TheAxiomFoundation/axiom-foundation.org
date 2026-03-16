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
    <div className="relative z-1 pt-24 pb-16">
      <AtlasBrowser segments={segments || []} />
    </div>
  );
}
/* v8 ignore stop */
