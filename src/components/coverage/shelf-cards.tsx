"use client";

import { useMemo, useState } from "react";
import type { JurisdictionCoverage } from "@/lib/axiom/coverage-page";

/**
 * Jurisdiction cards — clean metric cards: name + slug chip, one
 * headline figure, a flat segmented bar showing the document-type
 * mix (same validated hues as the stacks case, revalidated against
 * the light card surface), and the encodings figure in amber.
 * Client component only for sort + filter; hover behavior is CSS.
 */

const MIX_HUES: Record<string, string> = {
  statute: "#C75B50",
  regulation: "#7C83E0",
  other: "#2E9E85",
  encoding: "#BD7A24",
};

export interface MixSegment {
  type: string;
  count: number;
}

/** Document-mix segments for the composition bar, largest first
 *  within the fixed statute → regulation → other order. */
export function docMix(j: JurisdictionCoverage): MixSegment[] {
  const statute = j.documents.statute ?? 0;
  const regulation = j.documents.regulation ?? 0;
  const other = j.documentTotal - statute - regulation;
  return [
    { type: "statute", count: statute },
    { type: "regulation", count: regulation },
    { type: "other", count: other },
  ].filter((segment) => segment.count > 0);
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

const DOC_SHORT: Record<string, [string, string]> = {
  statute: ["statute", "statutes"],
  regulation: ["regulation", "regulations"],
  other: ["other doc", "other docs"],
};

function mixLine(segments: MixSegment[]): string {
  return segments
    .map(
      ({ type, count }) => `${n(count)} ${DOC_SHORT[type][count === 1 ? 0 : 1]}`
    )
    .join(" · ");
}

function Card({
  j,
  entranceMs,
}: {
  j: JurisdictionCoverage;
  entranceMs: number;
}) {
  const inCorpus = j.provisionCount > 0;
  const segments = inCorpus
    ? docMix(j)
    : [{ type: "encoding", count: j.encodingFileCount }];

  const body = (
    <>
      <div className="cov-card-head">
        <span className="cov-card-name">{j.label}</span>
        <span className="cov-card-slug">{j.slug}</span>
      </div>
      <div className="cov-card-metric">
        <span className="cov-card-value">
          {n(inCorpus ? j.provisionCount : j.encodingFileCount)}
        </span>
        <span className="cov-card-metric-label">
          {inCorpus
            ? j.provisionCount === 1
              ? "provision"
              : "provisions"
            : j.encodingFileCount === 1
              ? "encoding file"
              : "encoding files"}
        </span>
      </div>
      <div className="cov-card-mix" aria-hidden>
        {segments.map((segment) => (
          <span
            key={segment.type}
            className="cov-card-mix-seg"
            style={{
              flexGrow: segment.count,
              background: MIX_HUES[segment.type],
            }}
          />
        ))}
      </div>
      <span className="cov-card-docs">
        {inCorpus
          ? mixLine(segments)
          : "encodings published ahead of corpus ingestion"}
      </span>
      <div className="cov-card-foot">
        {inCorpus ? (
          <span
            className={
              j.encodingFileCount > 0
                ? "cov-card-encoded"
                : "cov-card-encoded cov-card-encoded-none"
            }
          >
            {j.encodingFileCount > 0 ? (
              <>
                <span className="cov-card-dot" aria-hidden />
                {n(j.encodingFileCount)} encoding{" "}
                {j.encodingFileCount === 1 ? "file" : "files"}
              </>
            ) : (
              "not yet encoded"
            )}
          </span>
        ) : (
          <span className="cov-card-encoded cov-card-encoded-none">
            not yet browsable
          </span>
        )}
        {inCorpus && (
          <span className="cov-card-arrow" aria-hidden>
            Browse ↗
          </span>
        )}
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
            <Card key={j.slug} j={j} entranceMs={Math.min(i * 25, 500)} />
          ))}
        </div>
      )}
    </div>
  );
}
