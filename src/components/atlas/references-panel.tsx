"use client";

import Link from "next/link";
import type { RuleReference } from "@/lib/supabase";

/**
 * Format a canonical Atlas citation_path into a human-readable label.
 *
 * Examples:
 *   us/statute/7/2014         -> "7 USC § 2014"
 *   us/statute/26/32/a/1      -> "26 USC § 32 (a)(1)"
 *   us/regulation/7/273       -> "7 CFR Part 273"
 *   us/regulation/7/273/9     -> "7 CFR § 273.9"
 *   us/regulation/7/273/subpart-d -> "7 CFR 273 Subpart D"
 *   us-ny/statute/tax/606     -> "NY Tax § 606"
 *   us-dc/statute/47/47-1801  -> "DC § 47-1801"
 */
export function formatCitationLabel(path: string): string {
  const parts = path.split("/");
  if (parts.length >= 4 && parts[1] === "statute") {
    const [jurisdiction, , title, section, ...rest] = parts;
    const restSuffix = rest.length ? ` (${rest.join(")(")})` : "";
    if (jurisdiction === "us") return `${title} USC § ${section}${restSuffix}`;
    if (jurisdiction.startsWith("us-")) {
      const state = jurisdiction.slice(3).toUpperCase();
      return `${state} ${title} § ${section}${restSuffix}`;
    }
  }
  if (parts.length >= 4 && parts[1] === "regulation") {
    const [, , title, part, ...rest] = parts;
    if (!rest.length) return `${title} CFR Part ${part}`;
    const first = rest[0];
    if (first.startsWith("subpart-")) {
      return `${title} CFR ${part} Subpart ${first.slice("subpart-".length).toUpperCase()}`;
    }
    const restSuffix = rest.length > 1 ? ` (${rest.slice(1).join(")(")})` : "";
    return `${title} CFR § ${part}.${first}${restSuffix}`;
  }
  return path;
}

function RefItem({ ref }: { ref: RuleReference }) {
  // Incoming refs carry offsets into the citing rule's body; pass
  // them through as ``?mark=start-end`` so the target page scrolls
  // to and highlights the exact citing passage.
  const markQuery =
    ref.direction === "incoming"
      ? `?mark=${ref.start_offset}-${ref.end_offset}`
      : "";
  const href = `/atlas/${ref.other_citation_path}${markQuery}`;
  const label = formatCitationLabel(ref.other_citation_path);
  const resolved = ref.direction === "incoming" ? true : ref.target_resolved;

  const linkClasses = resolved
    ? "text-[var(--color-accent)] hover:underline"
    : "text-[var(--color-ink-secondary)] cursor-help";
  const title = resolved
    ? ref.other_heading || ref.other_citation_path
    : `${ref.other_citation_path} — not yet ingested`;

  return (
    <li className="py-2 flex items-baseline gap-3">
      <Link href={href} className={`font-mono text-xs ${linkClasses}`} title={title}>
        {label}
      </Link>
      {ref.other_heading && (
        <span className="text-sm text-[var(--color-ink-secondary)] leading-snug">
          {ref.other_heading}
        </span>
      )}
      {!resolved && (
        <span className="font-mono text-[10px] uppercase text-[var(--color-ink-muted)]">
          pending
        </span>
      )}
    </li>
  );
}

function RefGroup({
  title,
  subtitle,
  refs,
  isFirst,
}: {
  title: string;
  subtitle: string;
  refs: RuleReference[];
  isFirst: boolean;
}) {
  if (refs.length === 0) return null;
  return (
    <section className={isFirst ? "" : "mt-6 pt-6 border-t border-[var(--color-rule)]"}>
      <div className="eyebrow mb-2">{title}</div>
      <p className="text-xs text-[var(--color-ink-muted)] mb-3 leading-relaxed">
        {subtitle}
      </p>
      <ul className="divide-y divide-[var(--color-rule-subtle)] m-0 p-0 list-none">
        {refs.map((ref, i) => (
          <RefItem key={`${ref.direction}-${i}-${ref.other_citation_path}`} ref={ref} />
        ))}
      </ul>
    </section>
  );
}

export function ReferencesPanel({
  outgoing,
  incoming,
}: {
  outgoing: RuleReference[];
  incoming: RuleReference[];
}) {
  if (outgoing.length === 0 && incoming.length === 0) return null;

  return (
    <div data-testid="references-panel">
      <RefGroup
        isFirst
        title="References"
        subtitle={`This rule cites ${outgoing.length} other ${outgoing.length === 1 ? "rule" : "rules"}.`}
        refs={outgoing}
      />
      <RefGroup
        isFirst={outgoing.length === 0}
        title="Referenced by"
        subtitle={`${incoming.length} other ${incoming.length === 1 ? "rule cites" : "rules cite"} this one.`}
        refs={incoming}
      />
    </div>
  );
}
