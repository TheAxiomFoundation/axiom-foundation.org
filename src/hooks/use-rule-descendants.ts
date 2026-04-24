"use client";

import { useEffect, useRef, useState } from "react";
import type { Rule } from "@/lib/supabase";
import { getRuleDescendants } from "@/lib/atlas/rule-tree";

/**
 * Fetch every descendant of a rule by citation_path prefix. Returns
 * a flat list ordered by level + ordinal so callers can hand it to
 * ``buildRuleTree`` or walk it directly.
 *
 * Drops stale responses via an inflight token so a slow query from
 * the previous rule can't overwrite the current one.
 */
export function useRuleDescendants(citationPath: string | null): {
  descendants: Rule[];
  loading: boolean;
} {
  const [descendants, setDescendants] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const inflight = useRef(0);

  useEffect(() => {
    if (!citationPath) {
      setDescendants([]);
      setLoading(false);
      return;
    }
    const token = ++inflight.current;
    setLoading(true);
    getRuleDescendants(citationPath)
      .then((rows) => {
        if (token !== inflight.current) return;
        setDescendants(rows);
      })
      .catch(() => {
        if (token !== inflight.current) return;
        setDescendants([]);
      })
      .finally(() => {
        if (token === inflight.current) setLoading(false);
      });
  }, [citationPath]);

  return { descendants, loading };
}
