"use client";

import posthog from "posthog-js";

/* v8 ignore start -- env-dependent capture */
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_KEY;

// ---- Custom axiom events ----

export type AxiomEvent =
  | { event: "axiom_rule_viewed"; properties: { citation_path: string; jurisdiction: string; has_rulespec: boolean } }
  | { event: "axiom_encoding_viewed"; properties: { citation_path: string; source: "github" | "encoding_run" } }
  | { event: "axiom_jurisdiction_selected"; properties: { jurisdiction: string } }
  | {
      event: "axiom_search";
      properties: {
        query: string;
        query_length: number;
        doc_type: "all" | "policy" | "statute" | "regulation" | "rulemaking";
        jurisdiction: string;
        result_count: number;
      };
    }
  | {
      event: "axiom_search_click";
      properties: {
        query: string;
        citation_path: string;
        kind: "citation" | "program" | "encoded" | "corpus";
        position: number;
      };
    }
  | { event: "axiom_tree_navigated"; properties: { depth: number; segment: string } }
  | { event: "axiom_filter_toggled"; properties: { filter: string; enabled: boolean } }
  | {
      event: "axiom_palette_commit";
      properties: { query: string; position: number } & (
        | { kind: "citation"; citation_path: string }
        | {
            kind: "program";
            program: string;
            role: string;
            citation_path: string;
          }
        | { kind: "search"; citation_path: string }
      );
    }
  | {
      event: "announcement_cta_clicked";
      properties: { cta: "join_launch_event" | "get_updates" };
    }
  | {
      event: "hero_cta_clicked";
      properties: { cta: "why_this_exists" | "see_encoder_run" };
    }
  | {
      event: "hero_search_submitted";
      properties: { query_length: number };
    };

export function trackAxiomEvent<T extends AxiomEvent>(
  event: T["event"],
  properties: T["properties"]
) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}
/* v8 ignore stop */
