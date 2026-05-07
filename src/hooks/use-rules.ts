import { useState, useEffect, useCallback } from "react";
import { supabaseCorpus, type Rule } from "@/lib/supabase";
import { JURISDICTIONS } from "@/lib/tree-data";

/**
 * Return ``s`` with its last character bumped one codepoint up — used
 * to build a half-open range bound for citation-path-prefix scans.
 * E.g. ``bumpLastChar("us-co/regulation/10-ccr-2506-1/4.401.")`` →
 * ``"us-co/regulation/10-ccr-2506-1/4.401/"``, which lex-orders just
 * past every ``"4.401."`` descendant. Returns ``null`` for empty
 * input so callers can skip the range query.
 */
function bumpLastChar(s: string): string | null {
  if (!s) return null;
  const last = s.charCodeAt(s.length - 1);
  return s.slice(0, -1) + String.fromCharCode(last + 1);
}

const PAGE_SIZE = 50;

export interface RuleStats {
  jurisdiction: string;
  count: number;
}

export interface UseRulesResult {
  rules: Rule[];
  stats: RuleStats[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useRules(options: {
  jurisdiction?: string;
  search?: string;
} = {}): UseRulesResult {
  const { jurisdiction, search } = options;

  const [rules, setRules] = useState<Rule[]>([]);
  const [stats, setStats] = useState<RuleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const jurisdictions = JURISDICTIONS.map((j) => j.slug);
      const results = await Promise.all(
        jurisdictions.map(async (jur) => {
          const { count } = await supabaseCorpus
            .from("current_provisions")
            .select("*", { count: "exact", head: true })
            .eq("jurisdiction", jur);
          return { jurisdiction: jur, count: count || 0 };
        })
      );
      setStats(results);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchRules = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setError(null);

      try {
        let query = supabaseCorpus
          .from("current_provisions")
          .select("id,jurisdiction,doc_type,parent_id,level,ordinal,heading,effective_date,repeal_date,source_url,source_path,citation_path,rulespec_path,has_rulespec,created_at,updated_at", { count: "estimated" })
          .is("parent_id", null);

        if (jurisdiction) {
          query = query.eq("jurisdiction", jurisdiction);
        }

        if (search) {
          query = query.textSearch("fts", search, { type: "websearch" });
        }

        const { data, error: fetchError, count } = await query
          .order("jurisdiction")
          .order("ordinal")
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (fetchError) throw fetchError;

        /* v8 ignore next -- defensive null coalescing for Supabase data */
        const rows = (data || []) as Rule[];
        setRules(append ? (prev) => [...prev, ...rows] : rows);
        setTotalCount(count || 0);
        setPage(pageNum);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch rules";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [jurisdiction, search]
  );

  const loadMore = useCallback(() => {
    if (!loading && rules.length < totalCount) {
      fetchRules(page + 1, true);
    }
  }, [loading, rules.length, totalCount, page, fetchRules]);

  useEffect(() => {
    fetchStats();
    fetchRules(0);
  }, [jurisdiction, search]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    rules,
    stats,
    loading,
    error,
    hasMore: rules.length < totalCount,
    loadMore,
  };
}

export function useRule(id: string | null) {
  const [rule, setRule] = useState<Rule | null>(null);
  const [children, setChildren] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setRule(null);
      setChildren([]);
      setLoading(false);
      return;
    }

    const fetchRule = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: ruleData, error: ruleError } = await supabaseCorpus
          .from("current_provisions")
          .select("*")
          .eq("id", id)
          .single();

        if (ruleError) throw ruleError;
        setRule(ruleData);

        const { data: childrenData, error: childrenError } = await supabaseCorpus
          .from("current_provisions")
          .select("*")
          .eq("parent_id", id)
          .order("ordinal");

        if (childrenError) throw childrenError;
        let collected: Rule[] = childrenData || [];

        // Fall back to citation-path-prefix siblings when the rule
        // has no parent_id-anchored children. The CCR encoder treats
        // ``4.401`` and ``4.401.1`` / ``4.401.2`` as siblings under
        // the same ``10-ccr-2506-1`` parent, even though the dotted
        // form reads like a subsection. Surface those here so the
        // reader gets a "subsections" affordance instead of a
        // dead-end leaf.
        if (collected.length === 0 && ruleData?.citation_path) {
          const lower = `${ruleData.citation_path}.`;
          const upper = bumpLastChar(lower);
          if (upper) {
            const { data: siblingsData } = await supabaseCorpus
              .from("current_provisions")
              .select("*")
              .gte("citation_path", lower)
              .lt("citation_path", upper)
              .order("citation_path");
            if (siblingsData && siblingsData.length > 0) {
              collected = siblingsData as Rule[];
            }
          }
        }
        /* v8 ignore next -- defensive null coalescing */
        setChildren(collected);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch rule";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchRule();
  }, [id]);

  return { rule, children, loading, error };
}
