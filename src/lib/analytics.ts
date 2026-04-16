"use client";

import posthog from "posthog-js";

/* v8 ignore start -- PostHog init is env-dependent */
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized || !POSTHOG_KEY || typeof window === "undefined") return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    respect_dnt: true,
  });
  initialized = true;
}
/* v8 ignore stop */

// ---- Custom atlas events ----

export type AtlasEvent =
  | { event: "atlas_rule_viewed"; properties: { citation_path: string; jurisdiction: string; has_rac: boolean } }
  | { event: "atlas_encoding_viewed"; properties: { citation_path: string; source: "github" | "lab" } }
  | { event: "atlas_jurisdiction_selected"; properties: { jurisdiction: string } }
  | { event: "atlas_search"; properties: { query_length: number; doc_type: "all" | "statute" | "regulation"; result_count: number } }
  | { event: "atlas_tree_navigated"; properties: { depth: number; segment: string } }
  | { event: "atlas_filter_toggled"; properties: { filter: string; enabled: boolean } };

/* v8 ignore start -- env-dependent capture */
export function trackAtlasEvent<T extends AtlasEvent>(
  event: T["event"],
  properties: T["properties"]
) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}
/* v8 ignore stop */
