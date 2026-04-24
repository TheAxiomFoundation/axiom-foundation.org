"use client";

import { useEffect, useRef, useState } from "react";
import type { Rule } from "@/lib/supabase";
import { getRuleDescendants } from "@/lib/atlas/rule-tree";

/**
 * Fetch every descendant of a rule up to a bounded depth via
 * parent_id BFS (see ``getRuleDescendants``). Drops stale responses
 * via an inflight token so a slow query from the previous rule
 * can't overwrite the current one.
 */
export function useRuleDescendants(ruleId: string | null): {
  descendants: Rule[];
  loading: boolean;
} {
  const [descendants, setDescendants] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const inflight = useRef(0);

  useEffect(() => {
    if (!ruleId) {
      setDescendants([]);
      setLoading(false);
      return;
    }
    const token = ++inflight.current;
    setLoading(true);
    getRuleDescendants(ruleId)
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
  }, [ruleId]);

  return { descendants, loading };
}
