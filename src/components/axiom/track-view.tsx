"use client";

import { useEffect, useRef } from "react";
import { trackAxiomEvent, type AxiomEvent } from "@/lib/analytics";

/**
 * Fires one analytics event when a server-rendered view mounts.
 *
 * The v2 reader and browse pages are server components, so they can't
 * call the client-side capture directly. They render this instead. It
 * fires once per distinct payload, so an App Router navigation to a
 * different section reports again while a re-render of the same view
 * stays quiet.
 */
export function TrackView<T extends AxiomEvent>({
  event,
  properties,
}: {
  event: T["event"];
  properties: T["properties"];
}) {
  const key = JSON.stringify([event, properties]);
  const fired = useRef<string | null>(null);

  useEffect(() => {
    if (fired.current === key) return;
    fired.current = key;
    trackAxiomEvent(event, properties);
    // `key` already encodes event + properties; listing the objects
    // themselves would re-fire on every render (new identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
