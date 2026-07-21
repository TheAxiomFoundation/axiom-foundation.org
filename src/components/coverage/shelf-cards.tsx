"use client";

import { useMemo, useState } from "react";
import type { JurisdictionCoverage } from "@/lib/axiom/coverage-page";

/**
 * Shelf cards — every jurisdiction as its own miniature shelf. The
 * mini-shelf illustrates the document-type mix (same validated hues
 * as the big case); the printed figures beside it are the record.
 * Client component only for sort + filter; cards themselves are
 * plain markup with CSS hover behavior.
 */

const SPINE_HUES: Record<string, string[]> = {
  statute: ["#C75B50", "#D97C70", "#A94A41"],
  regulation: ["#7C83E0", "#9BA1EA", "#6068C9"],
  other: ["#2E9E85", "#4FB89F", "#25806C"],
  encoding: ["#BD7A24", "#DA9A3E", "#9A6119"],
};

export interface MiniSpine {
  type: string;
}

/**
 * Allocate a card's mini-shelf: spine count scales with the square
 * root of the document total (a packed shelf still means more law,
 * but Illinois doesn't need 4,700 spines on a card), split across
 * types by largest remainder with every present type visible. The
 * printed counts carry the exact numbers.
 */
export function miniShelf(j: JurisdictionCoverage): MiniSpine[] {
  const statute = j.documents.statute ?? 0;
  const regulation = j.documents.regulation ?? 0;
  const other = j.documentTotal - statute - regulation;
  const parts = [
    { type: "statute", count: statute },
    { type: "regulation", count: regulation },
    { type: "other", count: other },
  ].filter((p) => p.count > 0);
  if (parts.length === 0) return [];

  const total = Math.min(
    36,
    Math.max(4, Math.round(3 * Math.sqrt(j.documentTotal)))
  );
  const exact = parts.map((p) => ({
    type: p.type,
    share: (p.count / j.documentTotal) * total,
  }));
  const spines = exact.map((p) => ({
    type: p.type,
    n: Math.max(1, Math.floor(p.share)),
  }));
  let used = spines.reduce((s, p) => s + p.n, 0);
  const remainders = exact
    .map((p, i) => ({ i, frac: p.share - Math.floor(p.share) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of remainders) {
    if (used >= total) break;
    spines[i].n += 1;
    used += 1;
  }
  return spines.flatMap((p) => Array.from({ length: p.n }, () => ({ type: p.type })));
}

function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const numberFormat = new Intl.NumberFormat("en-US");
const n = (value: number) => numberFormat.format(value);

type SortKey = "provisions" | "documents" | "encodings" | "name";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "provisions", label: "Provisions" },
  { key: "documents", label: "Documents" },
  { key: "encodings", label: "Encodings" },
  { key: "name", label: "A–Z" },
];

function sortRows(
  rows: JurisdictionCoverage[],
  sort: SortKey
): JurisdictionCoverage[] {
  const bySize = (
    pick: (j: JurisdictionCoverage) => number
  ): JurisdictionCoverage[] =>
    [...rows].sort(
      (a, b) => pick(b) - pick(a) || a.label.localeCompare(b.label)
    );
  switch (sort) {
    case "provisions":
      return bySize((j) => j.provisionCount);
    case "documents":
      return bySize((j) => j.documentTotal);
    case "encodings":
      return bySize((j) => j.encodingFileCount);
    case "name":
      return [...rows].sort((a, b) => a.label.localeCompare(b.label));
  }
}

function Card({
  j,
  seedBase,
  entranceMs,
}: {
  j: JurisdictionCoverage;
  seedBase: number;
  entranceMs: number;
}) {
  const spines = miniShelf(j);
  const inCorpus = j.provisionCount > 0;
  const statute = j.documents.statute ?? 0;
  const regulation = j.documents.regulation ?? 0;
  const other = j.documentTotal - statute - regulation;

  const docsLine = inCorpus
    ? [
        statute > 0 ? `${n(statute)} stat` : null,
        regulation > 0 ? `${n(regulation)} reg` : null,
        other > 0 ? `${n(other)} other` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "encodings published ahead of corpus ingestion";

  const body = (
    <>
      <div className="cov-card-head">
        <span className="cov-card-name">{j.label}</span>
        {inCorpus && (
          <span className="cov-card-arrow" aria-hidden>
            ↗
          </span>
        )}
      </div>
      <div className="cov-card-shelf" aria-hidden>
        <div className="cov-card-books">
          {(spines.length > 0
            ? spines
            : Array.from(
                { length: Math.min(12, Math.max(3, Math.round(2 * Math.sqrt(j.encodingFileCount)))) },
                () => ({ type: "encoding" })
              )
          ).map((spine, i) => {
            const seed = seedBase * 97 + i;
            const tones = SPINE_HUES[spine.type];
            const tone = tones[Math.floor(jitter(seed + 2) * 3)];
            const lean =
              jitter(seed + 3) > 0.88 ? (jitter(seed + 4) > 0.5 ? 5 : -5) : 0;
            return (
              <span
                key={i}
                className="cov-card-spine"
                style={
                  {
                    height: `${16 + Math.floor(jitter(seed) * 4) * 3}px`,
                    width: `${5 + Math.floor(jitter(seed + 1) * 2) * 2}px`,
                    background: `linear-gradient(90deg, ${tone} 0%, ${tone} 60%, rgba(0,0,0,0.3) 100%)`,
                    "--i": i,
                    ...(lean ? { "--lean": `${lean}deg` } : {}),
                    ...(spine.type === "encoding"
                      ? {
                          boxShadow:
                            "inset 0 2px 0 rgba(250, 227, 173, 0.85)",
                        }
                      : {}),
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
        <div className="cov-card-board" />
      </div>
      <div className="cov-card-figures">
        {inCorpus && (
          <span className="cov-card-provisions">
            {n(j.provisionCount)}{" "}
            {j.provisionCount === 1 ? "provision" : "provisions"}
          </span>
        )}
        <span className="cov-card-docs">{docsLine}</span>
        <span
          className={
            j.encodingFileCount > 0
              ? "cov-card-encoded"
              : "cov-card-encoded cov-card-encoded-none"
          }
        >
          {j.encodingFileCount > 0
            ? `${n(j.encodingFileCount)} encoding ${
                j.encodingFileCount === 1 ? "file" : "files"
              }`
            : "not yet encoded"}
        </span>
      </div>
    </>
  );

  const style = { animationDelay: `${entranceMs}ms` } as React.CSSProperties;
  return inCorpus ? (
    <a
      href={`/${j.slug}`}
      className="cov-card"
      style={style}
      aria-label={`${j.label}: ${n(j.provisionCount)} provisions, ${n(
        j.documentTotal
      )} documents, ${n(j.encodingFileCount)} encoding files. Browse ${
        j.label
      }.`}
    >
      {body}
    </a>
  ) : (
    <div className="cov-card cov-card-static" style={style}>
      {body}
    </div>
  );
}

export function ShelfCards({
  jurisdictions,
}: {
  jurisdictions: JurisdictionCoverage[];
}) {
  const [sort, setSort] = useState<SortKey>("provisions");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? jurisdictions.filter(
          (j) =>
            j.label.toLowerCase().includes(q) ||
            j.slug.toLowerCase().includes(q)
        )
      : jurisdictions;
    return sortRows(filtered, sort);
  }, [jurisdictions, sort, query]);

  return (
    <div>
      <div className="cov-controls">
        <div
          className="cov-sorts"
          role="group"
          aria-label="Sort jurisdictions"
        >
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={sort === s.key ? "cov-sort cov-sort-on" : "cov-sort"}
              aria-pressed={sort === s.key}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter jurisdictions…"
          aria-label="Filter jurisdictions"
          className="cov-filter"
        />
      </div>
      {rows.length === 0 ? (
        <p className="cov-empty">
          No jurisdiction matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="cov-grid">
          {rows.map((j, i) => (
            <Card
              key={j.slug}
              j={j}
              seedBase={j.slug
                .split("")
                .reduce((s, c) => s + c.charCodeAt(0), 0)}
              entranceMs={Math.min(i * 25, 500)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
