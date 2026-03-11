import { useState, useEffect, useCallback } from "react";
import { supabaseArch, type Rule } from "@/lib/supabase";
import { JURISDICTIONS } from "@/lib/tree-data";

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
          const { count } = await supabaseArch
            .from("rules")
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
        let query = supabaseArch
          .from("rules")
          .select("id,jurisdiction,doc_type,parent_id,level,ordinal,heading,effective_date,repeal_date,source_url,source_path,citation_path,rac_path,has_rac,created_at,updated_at", { count: "estimated" })
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
        const { data: ruleData, error: ruleError } = await supabaseArch
          .from("rules")
          .select("*")
          .eq("id", id)
          .single();

        if (ruleError) throw ruleError;
        setRule(ruleData);

        const { data: childrenData, error: childrenError } = await supabaseArch
          .from("rules")
          .select("*")
          .eq("parent_id", id)
          .order("ordinal");

        if (childrenError) throw childrenError;
        /* v8 ignore next -- defensive null coalescing */
        setChildren(childrenData || []);
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
