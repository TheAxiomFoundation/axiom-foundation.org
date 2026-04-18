"use client";

import { useEffect, useState } from "react";
import {
  getAtlasStats,
  type AtlasJurisdictionCount,
  type AtlasStats,
} from "@/lib/supabase";

/**
 * Landing-page stat block. Shows corpus size + graph density so the
 * platform feels as substantial as it now is. Rendered above the
 * jurisdiction picker on ``/atlas``.
 *
 * Returns null while the RPC is in flight so the layout doesn't jump
 * when the numbers arrive; a blank stat row is worse than a delayed
 * one.
 */
export function AtlasStats() {
  const [stats, setStats] = useState<AtlasStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAtlasStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  return (
    <div
      data-testid="atlas-stats"
      className="mb-10 pb-10 border-b border-[var(--color-rule)]"
    >
      <div className="flex justify-center gap-12">
        <Stat value={stats.rules_count} label="documents indexed" />
        <Stat value={stats.references_count} label="citations extracted" />
        <Stat value={stats.jurisdictions_count} label="jurisdictions" />
      </div>
      {stats.jurisdictions && stats.jurisdictions.length > 0 && (
        <JurisdictionPills jurisdictions={stats.jurisdictions} />
      )}
    </div>
  );
}

function JurisdictionPills({
  jurisdictions,
}: {
  jurisdictions: AtlasJurisdictionCount[];
}) {
  return (
    <div
      data-testid="atlas-stats-pills"
      className="flex flex-wrap justify-center gap-2 mt-6 px-8 max-w-[900px] mx-auto"
    >
      {jurisdictions.map((j) => (
        <span
          key={j.jurisdiction}
          className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-full border border-[var(--color-rule)] text-xs text-[var(--color-ink-secondary)]"
          title={`${j.count.toLocaleString()} documents`}
        >
          <span className="font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
            {jurisdictionDisplay(j.jurisdiction)}
          </span>
          <span className="font-heading text-[var(--color-accent)] tabular-nums">
            {formatCompact(j.count)}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Render a jurisdiction code as its short display label.
 *
 *   'us'     → 'USC+CFR'    (federal statutes + regulations)
 *   'us-ny'  → 'NY'
 *   'us-dc'  → 'DC'
 *   'uk'     → 'UK'
 *   'canada' → 'CA'
 *
 * Exported for tests and as a single source of truth — the jurisdiction
 * column holds the atlas's canonical ids but users read labels.
 */
export function jurisdictionDisplay(jurisdiction: string): string {
  if (jurisdiction === "us") return "USC+CFR";
  if (jurisdiction === "canada") return "CA";
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
 *
 * Exported for tests; pinning the exact thresholds here keeps the
 * stat block visually stable as the corpus grows.
 */
export function formatCompact(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 10_000) return (n / 1_000).toFixed(1) + "K";
  if (n < 1_000_000) return Math.round(n / 1_000) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}
