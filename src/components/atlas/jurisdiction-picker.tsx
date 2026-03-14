"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CountryConfig, SubJurisdiction } from "@/lib/tree-data";
import { COUNTRIES, getJurisdictionCounts } from "@/lib/tree-data";
import { trackAtlasEvent } from "@/lib/analytics";

interface CountryPickerProps {
  mode: "country";
}

interface SubJurisdictionPickerProps {
  mode: "sub-jurisdiction";
  country: CountryConfig;
}

type JurisdictionPickerProps = CountryPickerProps | SubJurisdictionPickerProps;

interface CardData {
  slug: string;
  label: string;
  href: string;
  count: number | null;
}

export function JurisdictionPicker(props: JurisdictionPickerProps) {
  const router = useRouter();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode, "country" in props ? undefined : undefined]);

  /* v8 ignore start -- Supabase-dependent count fetching */
  async function loadCards() {
    setLoading(true);

    if (props.mode === "country") {
      // Collect all dbJurisdictionIds grouped by country
      const dbIds = COUNTRIES.flatMap((c) =>
        c.children.map((s) => s.dbJurisdictionId)
      );
      const counts = await getJurisdictionCounts(dbIds);

      const countryCards: CardData[] = COUNTRIES.map((country) => {
        const total = country.children.reduce(
          (sum, s) => sum + (counts.get(s.dbJurisdictionId) || 0),
          0
        );
        return {
          slug: country.slug,
          label: country.label,
          href: `/atlas/${country.slug}`,
          count: total,
        };
      }).filter((c) => c.count > 0);

      setCards(countryCards);
    } else {
      const country = props.country;
      const dbIds = country.children.map((s) => s.dbJurisdictionId);
      const counts = await getJurisdictionCounts(dbIds);

      const subCards: CardData[] = country.children.map(
        (sub: SubJurisdiction) => ({
          slug: sub.slug,
          label: sub.label,
          href: `/atlas/${country.slug}/${sub.slug}`,
          count: counts.get(sub.dbJurisdictionId) || 0,
        })
      );

      setCards(subCards);
    }

    setLoading(false);
  }
  /* v8 ignore stop */

  const heading =
    props.mode === "country"
      ? "Choose a jurisdiction"
      : "Choose a sub-jurisdiction";

  return (
    <div>
      <h2 className="font-[family-name:var(--f-display)] text-lg text-[var(--color-text-secondary)] mb-6 text-center">
        {heading}
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
          Loading...
        </div>
      ) : cards.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
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
              className="p-6 bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-xl cursor-pointer hover:border-[var(--color-precision)] hover:bg-[rgba(59,130,246,0.05)] transition-colors"
            >
              <div className="text-base font-[family-name:var(--f-display)] text-[var(--color-text)]">
                {card.label}
              </div>
              {card.count !== null && (
                <div className="mt-2 font-[family-name:var(--f-mono)] text-xs text-[var(--color-text-muted)]">
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
