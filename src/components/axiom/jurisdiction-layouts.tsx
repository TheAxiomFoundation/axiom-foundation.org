"use client";

import Link from "next/link";
import { formatCompact, jurisdictionDisplay } from "./axiom-stats";

export type JurisdictionItem = {
  slug: string;
  label: string;
  count: number | null;
};

interface LayoutProps {
  items: JurisdictionItem[];
  onNavigateHref?: (href: string) => void;
}

function partitionItems(items: JurisdictionItem[]) {
  const federal: JurisdictionItem[] = [];
  const states: JurisdictionItem[] = [];
  const other: JurisdictionItem[] = [];
  for (const item of items) {
    if (item.slug === "us" || item.slug === "uk" || item.slug === "canada") {
      federal.push(item);
    } else if (item.slug.startsWith("us-")) {
      states.push(item);
    } else {
      other.push(item);
    }
  }
  return { federal, states, other };
}

function statusFor(count: number | null) {
  if (count === null) return "loading" as const;
  if (count === 0) return "pending" as const;
  return "indexed" as const;
}

/**
 * Hero + chips — three large federal cards on top, an alphabetical wall
 * of state chips beneath, and an "Other" chip wall for any uncurated
 * slugs that show up in the stats payload. Pending (count 0) entries
 * render in place but as dashed, non-clickable rows so users see the
 * full footprint without being able to navigate into an empty page.
 */
export function HeroChips({ items, onNavigateHref }: LayoutProps) {
  const { federal, states, other } = partitionItems(items);
  const statesAlpha = [...states].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  return (
    <div className="space-y-10">
      {federal.length > 0 ? (
        <section>
          <HeroChipsSubheader title="Federal & national" />
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
            {federal.map((item) => (
              <li key={item.slug}>
                <HeroFederalCard item={item} onNavigateHref={onNavigateHref} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {statesAlpha.length > 0 ? (
        <section>
          <HeroChipsSubheader title="US states & territories" />
          <ul className="m-0 flex flex-wrap list-none gap-2 p-0">
            {statesAlpha.map((item) => (
              <li key={item.slug}>
                <ChipPill item={item} onNavigateHref={onNavigateHref} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {other.length > 0 ? (
        <section>
          <HeroChipsSubheader title="Other" />
          <ul className="m-0 flex flex-wrap list-none gap-2 p-0">
            {other.map((item) => (
              <li key={item.slug}>
                <ChipPill item={item} onNavigateHref={onNavigateHref} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function HeroChipsSubheader({ title }: { title: string }) {
  return (
    <h3 className="mb-4 font-display text-base font-light tracking-tight text-[var(--color-ink)]">
      {title}
    </h3>
  );
}

function HeroFederalCard({
  item,
  onNavigateHref,
}: {
  item: JurisdictionItem;
  onNavigateHref?: (href: string) => void;
}) {
  const status = statusFor(item.count);
  const isPending = status === "pending";
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)]">
          {jurisdictionDisplay(item.slug)}
        </span>
        <StatusDot status={status} />
      </div>
      <div className="mt-4 font-display text-xl font-light leading-tight text-[var(--color-ink)]">
        {item.label}
      </div>
      <div className="mt-3 flex items-baseline gap-2 border-t border-[var(--color-rule)] pt-3">
        <span className="font-heading text-2xl tabular-nums text-[var(--color-ink)]">
          {isPending ? "—" : formatCompact(item.count ?? 0)}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {isPending ? "pending" : "rules"}
        </span>
      </div>
    </>
  );
  if (isPending) {
    return (
      <div
        aria-disabled="true"
        className="h-full rounded-md border border-dashed border-[var(--color-rule)] bg-transparent p-5 opacity-60"
      >
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/${item.slug}`}
      onClick={(event) => {
        if (!onNavigateHref) return;
        event.preventDefault();
        onNavigateHref(`/${item.slug}`);
      }}
      title={`${item.label} — ${(item.count ?? 0).toLocaleString()} rules`}
      className="group block h-full rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-5 !no-underline transition-all hover:-translate-y-px hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
    >
      {body}
    </Link>
  );
}

function ChipPill({
  item,
  onNavigateHref,
}: {
  item: JurisdictionItem;
  onNavigateHref?: (href: string) => void;
}) {
  const isPending = statusFor(item.count) === "pending";
  const inner = (
    <>
      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
        {jurisdictionDisplay(item.slug)}
      </span>
      <span className="text-[var(--color-ink)]">{item.label}</span>
      {!isPending && (
        <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)]">
          {formatCompact(item.count ?? 0)}
        </span>
      )}
    </>
  );
  const className =
    "inline-flex items-baseline gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors";
  if (isPending) {
    return (
      <span
        aria-disabled="true"
        className={`${className} border-dashed border-[var(--color-rule)] bg-transparent opacity-50`}
      >
        {inner}
      </span>
    );
  }
  return (
    <Link
      href={`/${item.slug}`}
      onClick={(event) => {
        if (!onNavigateHref) return;
        event.preventDefault();
        onNavigateHref(`/${item.slug}`);
      }}
      title={`${item.label} — ${(item.count ?? 0).toLocaleString()} rules`}
      className={`${className} border-[var(--color-rule)] bg-[var(--color-paper-elevated)] !no-underline hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2`}
    >
      {inner}
    </Link>
  );
}

function StatusDot({
  status,
}: {
  status: "indexed" | "pending" | "loading";
}) {
  const cls =
    status === "indexed"
      ? "bg-[var(--color-success)]"
      : status === "pending"
        ? "bg-[var(--color-rule-strong)]"
        : "bg-[var(--color-rule)]";
  return (
    <span
      aria-hidden
      className={`h-1.5 w-1.5 rounded-full transition-colors ${cls}`}
    />
  );
}
