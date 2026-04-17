"use client";

import { useEffect, useRef, useState } from "react";
import { getRuleReferences, type RuleReference } from "@/lib/supabase";

export interface UseRuleReferences {
  outgoing: RuleReference[];
  incoming: RuleReference[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch the citation graph around one rule.
 *
 * Returns outgoing refs sorted by their position in the source body
 * (so viewers can walk them in one pass to splice anchor tags) and
 * incoming refs sorted by ranking relevance, which here is just the
 * alphabetical citation_path of the citing rule — good enough for a
 * referenced-by panel.
 */
export function useRuleReferences(
  citationPath: string | null | undefined
): UseRuleReferences {
  const [outgoing, setOutgoing] = useState<RuleReference[]>([]);
  const [incoming, setIncoming] = useState<RuleReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(0);

  useEffect(() => {
    if (!citationPath) {
      setOutgoing([]);
      setIncoming([]);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++inflight.current;
    setLoading(true);
    setError(null);
    getRuleReferences(citationPath)
      .then((rows) => {
        if (token !== inflight.current) return;
        const out = rows
          .filter((r) => r.direction === "outgoing")
          .sort((a, b) => a.start_offset - b.start_offset);
        const inc = rows
          .filter((r) => r.direction === "incoming")
          .sort((a, b) =>
            (a.other_citation_path || "").localeCompare(
              b.other_citation_path || ""
            )
          );
        setOutgoing(out);
        setIncoming(inc);
      })
      .catch((e) => {
        if (token !== inflight.current) return;
        setError(e instanceof Error ? e.message : "Failed to fetch references");
      })
      .finally(() => {
        if (token === inflight.current) setLoading(false);
      });
  }, [citationPath]);

  return { outgoing, incoming, loading, error };
}
