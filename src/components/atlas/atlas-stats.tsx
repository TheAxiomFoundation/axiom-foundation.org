"use client";

import { useEffect, useState } from "react";
import { getAtlasStats, type AtlasStats } from "@/lib/supabase";

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
      className="flex justify-center gap-12 mb-10 pb-10 border-b border-[var(--color-rule)]"
    >
      <Stat value={stats.rules_count} label="documents indexed" />
      <Stat value={stats.references_count} label="citations extracted" />
      <Stat value={stats.jurisdictions_count} label="jurisdictions" />
    </div>
  );
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
