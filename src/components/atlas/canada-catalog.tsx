"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  findCanadaCatalogEntry,
  getCosilicoBlobUrl,
  getCosilicoRawUrl,
  groupedCanadaCatalog,
  type CanadaCatalogEntry,
} from "@/lib/atlas/canada-catalog";
import { ExpandableCode } from "./expandable-code";

/**
 * /atlas/canada landing — replaces the standard tree navigation
 * (which would surface ~18k mostly-Untitled rule rows from
 * akn.rules whose acts have no ingested encoding) with the eight
 * encoded entries that actually live in rac-ca. The atlas's normal
 * jurisdiction surface returns once the ingestion side covers the
 * Income Tax Act / OAS / EI sections.
 */
export function CanadaCatalog() {
  const groups = groupedCanadaCatalog();

  return (
    <div className="max-w-[920px] mx-auto">
      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.group}>
            <h2 className="font-display text-lg text-[var(--color-ink)] mb-4">
              {group.group}
            </h2>
            <ul className="space-y-3 list-none m-0 p-0">
              {group.entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/atlas/canada/${entry.slug}`}
                    className="block px-5 py-4 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md no-underline hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                  >
                    <div className="flex items-baseline justify-between gap-4 mb-1">
                      <span className="font-mono text-xs text-[var(--color-accent)] uppercase tracking-wider">
                        {entry.citation}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] border border-[var(--color-accent)] rounded px-1.5 py-px">
                        Encoded
                      </span>
                    </div>
                    <div
                      className="text-[1.05rem] text-[var(--color-ink)] mb-1"
                      style={{ fontFamily: "var(--f-serif)" }}
                    >
                      {entry.heading}
                    </div>
                    <p className="m-0 text-sm text-[var(--color-ink-secondary)]">
                      {entry.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * /atlas/canada/<slug> — detail page for a curated entry. Renders
 * the .cosilico file inline (read directly from GitHub raw) plus a
 * link to the authoritative source on laws-lois.justice.gc.ca.
 */
export function CanadaCatalogEntryView({ slug }: { slug: string }) {
  const entry = findCanadaCatalogEntry(slug);
  if (!entry) {
    return (
      <div className="max-w-[720px] mx-auto py-20 text-center text-[var(--color-ink-muted)]">
        <p className="mb-4">No encoded entry matches “{slug}”.</p>
        <Link href="/atlas/canada" className="text-[var(--color-accent)] hover:underline">
          ← Back to Canada catalog
        </Link>
      </div>
    );
  }
  return <CanadaEntryDetail entry={entry} />;
}

function CanadaEntryDetail({ entry }: { entry: CanadaCatalogEntry }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    fetch(getCosilicoRawUrl(entry.filePath))
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entry.filePath]);

  return (
    <div className="max-w-[1280px] mx-auto px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 mb-6 font-mono text-sm"
      >
        <Link
          href="/atlas"
          className="text-[var(--color-accent)] no-underline hover:underline"
        >
          Atlas
        </Link>
        <span className="text-[var(--color-ink-muted)]">/</span>
        <Link
          href="/atlas/canada"
          className="text-[var(--color-accent)] no-underline hover:underline"
        >
          Canada
        </Link>
        <span className="text-[var(--color-ink-muted)]">/</span>
        <span aria-current="page" className="text-[var(--color-ink-secondary)]">
          {entry.citation}
        </span>
      </nav>

      <header className="mb-8 px-8 py-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md">
        <div className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
          <span>CA</span>
          <span aria-hidden="true" className="text-[var(--color-ink-muted)]">·</span>
          <span className="text-[var(--color-ink-muted)]">Statute</span>
          <span aria-hidden="true" className="text-[var(--color-ink-muted)]">·</span>
          <span>Encoded</span>
        </div>
        <h1 className="heading-section text-[var(--color-ink)] m-0 break-words">
          {entry.citation}
        </h1>
        <p
          className="mt-3 text-[1.05rem] leading-snug text-[var(--color-ink-secondary)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {entry.heading}
        </p>
        <p className="mt-3 text-sm text-[var(--color-ink-secondary)]">
          {entry.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-[var(--color-accent)] no-underline hover:underline"
          >
            View source on laws-lois.justice.gc.ca →
          </a>
          <a
            href={getCosilicoBlobUrl(entry.filePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-[var(--color-accent)] no-underline hover:underline"
          >
            View encoding on GitHub →
          </a>
        </div>
      </header>

      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <span className="eyebrow">Cosilico encoding</span>
          <code className="font-mono text-xs text-[var(--color-ink-muted)] break-all">
            {entry.filePath}
          </code>
        </div>
        {error && (
          <div
            role="alert"
            className="p-4 bg-[rgba(196,61,61,0.08)] border border-[rgba(196,61,61,0.2)] rounded-md text-sm text-[var(--color-error)]"
          >
            Couldn’t load encoding ({error}).{" "}
            <a
              href={getCosilicoBlobUrl(entry.filePath)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Open on GitHub
            </a>
            .
          </div>
        )}
        {!error && content == null && (
          <div
            role="status"
            aria-live="polite"
            className="p-6 text-center text-sm text-[var(--color-ink-muted)] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md"
          >
            Loading encoding…
          </div>
        )}
        {content && (
          <ExpandableCode
            code={content}
            language="plain"
            label={entry.filePath}
          />
        )}
      </section>
    </div>
  );
}
