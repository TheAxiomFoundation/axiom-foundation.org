"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { JURISDICTIONS, getJurisdictionCounts } from "@/lib/tree-data";
import { trackAtlasEvent } from "@/lib/analytics";

interface CardData {
  slug: string;
  label: string;
  href: string;
  count: number | null;
}

export function JurisdictionPicker() {
  const router = useRouter();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* v8 ignore start -- Supabase-dependent count fetching */
  async function loadCards() {
    setLoading(true);

    const dbIds = JURISDICTIONS.map((j) => j.slug);
    const counts = await getJurisdictionCounts(dbIds);

    const jurisdictionCards: CardData[] = JURISDICTIONS.map((j) => ({
      slug: j.slug,
      label: j.label,
      href: `/atlas/${j.slug}`,
      count: counts.get(j.slug) || 0,
    })).filter((c) => (c.count ?? 0) > 0);

    setCards(jurisdictionCards);
    setLoading(false);
  }
  /* v8 ignore stop */

  return (
    <div>
      <h2 className="font-display text-lg text-[var(--color-ink-secondary)] mb-6 text-center">
        Choose a jurisdiction
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
          Loading...
        </div>
      ) : cards.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
          No jurisdictions found.
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.slug}
              role="button"
              tabIndex={0}
              onClick={() => {
                trackAtlasEvent("atlas_jurisdiction_selected", { jurisdiction: card.slug });
                router.push(card.href);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(card.href);
                }
              }}
              className="p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
            >
              <div className="text-base font-display text-[var(--color-ink)]">
                {card.label}
              </div>
              {card.count !== null && (
                <div className="mt-2 font-mono text-xs text-[var(--color-ink-muted)]">
                  {card.count.toLocaleString()} rules
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
