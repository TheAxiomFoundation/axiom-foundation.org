"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabaseArch, type Rule } from "@/lib/supabase";

function getJurisdictionColor(jurisdiction: string): string {
  switch (jurisdiction) {
    case "us":
      return "var(--color-precision)";
    case "uk":
      return "var(--color-warmth)";
    case "canada":
      return "#ef4444";
    default:
      return "var(--color-text-muted)";
  }
}

function RuleTreeNode({
  rule,
  depth,
  onSelect,
}: {
  rule: Rule;
  depth: number;
  onSelect: (rule: Rule) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);

  const toggleExpand = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (expanded) {
        setExpanded(false);
        return;
      }

      if (children.length === 0) {
        setLoading(true);
        try {
          const { data, count } = await supabaseArch
            .from("rules")
            .select("*", { count: "exact" })
            .eq("parent_id", rule.id)
            .order("ordinal")
            .limit(100);

          setChildren(data || []);
          setHasChildren((count || 0) > 0);
        } catch (err) {
          console.error("Failed to fetch children:", err);
        } finally {
          setLoading(false);
        }
      }

      setExpanded(true);
    },
    [expanded, children.length, rule.id]
  );

  // Lazy check for children on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (hasChildren !== null) return;
      try {
        const { count } = await supabaseArch
          .from("rules")
          .select("*", { count: "exact", head: true })
          .eq("parent_id", rule.id)
          .limit(1);
        if (!cancelled) setHasChildren((count || 0) > 0);
      } catch {
        if (!cancelled) setHasChildren(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rule.id, hasChildren]);

  return (
    <div>
      <motion.div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded transition-colors duration-100 hover:bg-[rgba(59,130,246,0.05)]"
        style={{ paddingLeft: depth * 20 + 12 }}
        onClick={() => onSelect(rule)}
      >
        <button
          className="w-5 h-5 flex items-center justify-center bg-transparent border-none text-[var(--color-text-muted)] text-xs cursor-pointer shrink-0"
          onClick={toggleExpand}
          disabled={hasChildren === false}
        >
          {loading ? (
            <span className="animate-spin">⟳</span>
          ) : hasChildren === false ? (
            <span className="text-[var(--color-border)]">·</span>
          ) : expanded ? (
            <span>▼</span>
          ) : (
            <span>▶</span>
          )}
        </button>

        <span
          className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider"
          style={{ color: getJurisdictionColor(rule.jurisdiction) }}
        >
          {rule.jurisdiction.toUpperCase()}
        </span>

        <span className="font-mono text-[0.8rem] text-[var(--color-text-muted)] shrink-0">
          {rule.source_path || rule.id.slice(0, 8)}
        </span>

        <span className="text-[0.85rem] text-[var(--color-text-secondary)] truncate">
          {rule.heading || "(no heading)"}
        </span>
      </motion.div>

      <AnimatePresence>
        {expanded && children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <RuleTreeNode
                key={child.id}
                rule={child}
                depth={depth + 1}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RuleTree({
  rules,
  onSelect,
}: {
  rules: Rule[];
  onSelect: (rule: Rule) => void;
}) {
  return (
    <div>
      {rules.map((rule) => (
        <RuleTreeNode key={rule.id} rule={rule} depth={0} onSelect={onSelect} />
      ))}
    </div>
  );
}
