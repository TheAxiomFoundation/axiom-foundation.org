"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/analytics";

/* v8 ignore start -- client-only PostHog bootstrap */
export function PostHogProvider() {
  useEffect(() => {
    initPostHog();
  }, []);
  return null;
}
/* v8 ignore stop */
