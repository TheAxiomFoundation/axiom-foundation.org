"use client";

import { useEffect, useState } from "react";
import { FlatStrip } from "./flat-strip";

/**
 * Client-only mount for the flat pipeline strip. The strip branches on
 * prefers-reduced-motion at module scope, so rendering it during SSR
 * would hydrate-mismatch for reduced-motion visitors — the placeholder
 * reserves the stage until the client owns the render.
 */
export function ArchitectureStrip() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div aria-hidden className="w-full aspect-[1420/368] min-h-[240px]" />;
  }
  return <FlatStrip />;
}
