"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Rule } from "@/lib/supabase";
import {
  getEncodedRulesForJurisdiction,
  groupEncodedRules,
  type EncodedRuleGroup,
} from "@/lib/atlas/encoded-rules";
import { jurisdictionDisplay } from "./atlas-stats";
import { stripBodyLabel } from "@/lib/atlas/rule-tree";

interface EncodedRulesListProps {
  jurisdiction: string;
  /** Optional human label shown in the eyebrow (e.g. "UK"). */
  jurisdictionLabel?: string;
}

/**
 * Flat, jurisdictionful index of every rule whose ``has_rac`` is
 * set — grouped by the parent legal instrument so a 146-row list
 * doesn't read as a wall. Rendered at /atlas/<slug>?view=encoded.
 */
export function EncodedRulesList({
  jurisdiction,
  jurisdictionLabel,
}: EncodedRulesListProps) {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRules(null);
    setError(null);
    getEncodedRulesForJurisdiction(jurisdiction)
      .then((rows) => {
        if (!cancelled) setRules(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [jurisdiction]);

  if (error) {
    return (
      <div
        role="alert"
        className="p-4 bg-[rgba(196,61,61,0.08)] border border-[rgba(196,61,61,0.2)] rounded-md text-sm text-[var(--color-error)]"
      >
        Couldn’t load encoded rules ({error}).
      </div>
    );
  }

  if (rules == null) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-12 text-center text-sm text-[var(--color-ink-muted)]"
      >
        Loading encoded rules…
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-[var(--color-ink-muted)]">
        No encoded rules ingested for{" "}
        {jurisdictionLabel ?? jurisdictionDisplay(jurisdiction)} yet.
      </div>
    );
  }

  const groups = groupEncodedRules(rules);

  return (
    <div>
      <header className="mb-6">
        <div className="eyebrow mb-2">
          {jurisdictionLabel ?? jurisdictionDisplay(jurisdiction)} ·
          Encoded rules
        </div>
        <h2 className="font-display text-lg text-[var(--color-ink)] m-0">
          {rules.length} encoded rule{rules.length === 1 ? "" : "s"}{" "}
          across {groups.length} instrument
          {groups.length === 1 ? "" : "s"}
        </h2>
      </header>
      <div className="space-y-8">
        {groups.map((group) => (
          <EncodedRuleGroupSection key={group.prefix} group={group} />
        ))}
      </div>
    </div>
  );
}

function EncodedRuleGroupSection({ group }: { group: EncodedRuleGroup }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 gap-4">
        <Link
          href={`/atlas/${group.prefix}`}
          className="font-mono text-xs uppercase tracking-wider text-[var(--color-accent)] no-underline hover:underline"
        >
          {group.label}
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] shrink-0">
          {group.rules.length} encoded
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-rule-subtle)] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md overflow-hidden m-0 p-0 list-none">
        {group.rules.map((rule) => (
          <li key={rule.id}>
            <EncodedRuleRow rule={rule} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EncodedRuleRow({ rule }: { rule: Rule }) {
  const tail = rule.citation_path
    ? rule.citation_path.split("/").slice(5).join("/")
    : "";
  const heading = rule.heading?.trim();
  const preview = stripBodyLabel(rule).slice(0, 140);
  return (
    <Link
      href={`/atlas/${rule.citation_path ?? ""}`}
      className="block px-5 py-3 no-underline hover:bg-[var(--color-accent-light)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:-outline-offset-2"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-xs text-[var(--color-accent)] truncate">
          {tail || rule.citation_path}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] border border-[var(--color-accent)] rounded px-1.5 py-px shrink-0">
          RAC
        </span>
      </div>
      {heading && (
        <div
          className="mt-1 text-sm text-[var(--color-ink)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {heading}
        </div>
      )}
      {preview && (
        <p className="mt-1 m-0 text-xs text-[var(--color-ink-secondary)] leading-snug truncate">
          {preview}
        </p>
      )}
    </Link>
  );
}
