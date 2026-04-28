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

// ---- Custom axiom events ----

export type AxiomEvent =
  | { event: "axiom_rule_viewed"; properties: { citation_path: string; jurisdiction: string; has_rulespec: boolean } }
  | { event: "axiom_encoding_viewed"; properties: { citation_path: string; source: "github" | "encoding_run" } }
  | { event: "axiom_jurisdiction_selected"; properties: { jurisdiction: string } }
  | { event: "axiom_search"; properties: { query_length: number; doc_type: "all" | "statute" | "regulation"; result_count: number } }
  | { event: "axiom_tree_navigated"; properties: { depth: number; segment: string } }
  | { event: "axiom_filter_toggled"; properties: { filter: string; enabled: boolean } }
  | {
      event: "axiom_palette_commit";
      properties:
        | { kind: "citation"; citation_path: string }
        | {
            kind: "program";
            program: string;
            role: string;
            citation_path: string;
          }
        | { kind: "search"; citation_path: string };
    };

/* v8 ignore start -- env-dependent capture */
export function trackAxiomEvent<T extends AxiomEvent>(
  event: T["event"],
  properties: T["properties"]
) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}
/* v8 ignore stop */
