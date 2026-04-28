"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAxiomStats,
  type AxiomJurisdictionCount,
  type AxiomStats,
} from "@/lib/supabase";
import { getJurisdictionBySlug } from "@/lib/tree-data";

/**
 * Landing-page stat block + primary jurisdiction navigation.
 *
 * The three big numbers establish scale (corpus, citation graph,
 * jurisdictions). The pills beneath are the main jurisdiction
 * picker — every ingested jurisdiction is a real clickable link
 * into its axiom tree, grouped as federal/national pills on top
 * and US states / territories in an alphabetical grid below.
 *
 * Returns null while the RPC is in flight so the layout doesn't
 * jump when the numbers arrive.
 */
export function AxiomStats() {
  const [stats, setStats] = useState<AxiomStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAxiomStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  return (
    <div data-testid="axiom-stats" className="mb-8">
      <div className="flex justify-center gap-12">
        <Stat value={stats.provisions_count} label="provisions indexed" />
        <Stat value={stats.references_count} label="citations extracted" />
        <Stat value={stats.jurisdictions_count} label="jurisdictions" />
      </div>
      {stats.jurisdictions && stats.jurisdictions.length > 0 && (
        <JurisdictionPills jurisdictions={stats.jurisdictions} />
      )}
    </div>
  );
}

/**
 * Groupings the pill nav uses so federal-scope jurisdictions read
 * as a primary band and state-scope pills fall into an alphabetical
 * grid beneath. "Other" catches any uncurated slug so nothing gets
 * dropped from the page.
 */
interface JurisdictionGroup {
  title: string;
  items: Array<{
    slug: string;
    label: string;
    count: number;
  }>;
}

function groupJurisdictions(
  jurisdictions: AxiomJurisdictionCount[]
): JurisdictionGroup[] {
  type Item = JurisdictionGroup["items"][number];
  const federal: Item[] = [];
  const states: Item[] = [];
  const other: Item[] = [];

  for (const j of jurisdictions) {
    const config = getJurisdictionBySlug(j.jurisdiction);
    const label = config?.label ?? j.jurisdiction.toUpperCase();
    const item: Item = { slug: j.jurisdiction, label, count: j.count };
    if (
      j.jurisdiction === "us" ||
      j.jurisdiction === "uk" ||
      j.jurisdiction === "canada"
    ) {
      federal.push(item);
    } else if (j.jurisdiction.startsWith("us-")) {
      states.push(item);
    } else {
      other.push(item);
    }
  }

  // Federal ordered by count desc so the biggest corpus surfaces
  // first; states by label alphabetical so people can find theirs.
  federal.sort((a, b) => b.count - a.count);
  states.sort((a, b) => a.label.localeCompare(b.label));
  other.sort((a, b) => a.label.localeCompare(b.label));

  const groups: JurisdictionGroup[] = [];
  if (federal.length > 0) groups.push({ title: "Federal & national", items: federal });
  if (states.length > 0) groups.push({ title: "US states & territories", items: states });
  if (other.length > 0) groups.push({ title: "Other", items: other });
  return groups;
}

function JurisdictionPills({
  jurisdictions,
}: {
  jurisdictions: AxiomJurisdictionCount[];
}) {
  const groups = groupJurisdictions(jurisdictions);

  return (
    <nav
      aria-label="Choose a jurisdiction"
      data-testid="axiom-stats-pills"
      className="mt-10 space-y-6 max-w-[1100px] mx-auto"
    >
      {groups.map((group) => (
        <section key={group.title}>
          <div className="flex items-baseline justify-between mb-3 px-2">
            <span className="eyebrow">{group.title}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              {group.items.length}
              {" · "}
              {formatCompact(
                group.items.reduce((sum, i) => sum + i.count, 0)
              )}{" "}
              rules
            </span>
          </div>
          <ul className="flex flex-wrap justify-center gap-2 m-0 p-0 list-none">
            {group.items.map((item) => (
              <li key={item.slug}>
                <JurisdictionPill {...item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function JurisdictionPill({
  slug,
  label,
  count,
}: {
  slug: string;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={`/axiom/${slug}`}
      title={`${label} — ${count.toLocaleString()} rules`}
      className="group inline-flex items-baseline gap-2 px-4 py-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] text-sm text-[var(--color-ink-secondary)] no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
    >
      <span className="font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
        {label}
      </span>
      <span className="font-mono text-xs text-[var(--color-ink-muted)] tabular-nums">
        {formatCompact(count)}
      </span>
    </Link>
  );
}

/**
 * Render a jurisdiction code as its short display label.
 *
 *   'us'     → 'USC+CFR'    (federal statutes + regulations)
 *   'us-ny'  → 'NY'
 *   'us-dc'  → 'DC'
 *   'uk'     → 'UK'
 *   'canada' → 'CAN'
 *
 * Kept as the single source of truth for the short-code form even
 * though the primary pill nav now shows full labels — some tests
 * and legacy surfaces still reach for it.
 */
export function jurisdictionDisplay(jurisdiction: string): string {
  if (jurisdiction === "us") return "USC+CFR";
  if (jurisdiction === "canada") return "CAN";
  if (jurisdiction === "uk") return "UK";
  if (jurisdiction.startsWith("us-")) {
    return jurisdiction.slice(3).toUpperCase();
  }
  return jurisdiction.toUpperCase();
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div
        className="font-heading text-3xl text-[var(--color-accent)] tabular-nums"
        title={value.toLocaleString()}
      >
        {formatCompact(value)}
      </div>
      <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)] mt-1">
        {label}
      </div>
    </div>
  );
}

/**
 * Render a count as a compact human-readable string.
 *
 *   1,234       → "1.2K"
 *   658,899     → "659K"
 *   1,500,000   → "1.5M"
 *   17          → "17"
 */
export function formatCompact(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 10_000) return (n / 1_000).toFixed(1) + "K";
  if (n < 1_000_000) return Math.round(n / 1_000) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}
