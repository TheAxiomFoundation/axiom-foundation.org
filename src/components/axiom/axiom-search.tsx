"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchRules, type SearchHit } from "@/lib/supabase";
import { trackAxiomEvent } from "@/lib/analytics";

type DocTypeFilter = "all" | "statute" | "regulation";

const DEBOUNCE_MS = 200;
const MIN_QUERY_LEN = 2;
const RESULT_LIMIT = 30;

interface AxiomSearchProps {
  /**
   * Optional jurisdiction filter. When set, results are constrained to a
   * single jurisdiction (e.g. "us"). Leave undefined to search everything.
   */
  jurisdiction?: string;
}

function formatCitationLabel(path: string): string {
  const parts = path.split("/");
  if (parts.length >= 4 && parts[1] === "statute") {
    const [, , title, section, ...rest] = parts;
    const restSuffix = rest.length ? ` (${rest.join(")(")})` : "";
    return `${title} USC § ${section}${restSuffix}`;
  }
  if (parts.length >= 4 && parts[1] === "regulation") {
    const [, , title, part, ...rest] = parts;
    if (!rest.length) return `${title} CFR Part ${part}`;
    const first = rest[0];
    if (first.startsWith("subpart-")) {
      return `${title} CFR ${part} Subpart ${first.slice("subpart-".length).toUpperCase()}`;
    }
    return `${title} CFR § ${part}.${first}`;
  }
  return path;
}

/**
 * Render a ts_headline snippet.
 *
 * ts_headline only emits the exact `<mark>` / `</mark>` markers we asked
 * for; every other character is HTML-escaped by Postgres. We split on the
 * marker pair and render the inner text as text nodes inside a <mark> so
 * React never passes attacker-controlled strings through dangerouslySet
 * APIs.
 */
function Snippet({ html }: { html: string }) {
  const parts: Array<{ type: "plain" | "mark"; text: string }> = [];
  const re = /<mark>([\s\S]*?)<\/mark>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match.index > cursor) {
      parts.push({ type: "plain", text: html.slice(cursor, match.index) });
    }
    parts.push({ type: "mark", text: match[1] });
    cursor = match.index + match[0].length;
  }
  if (cursor < html.length) {
    parts.push({ type: "plain", text: html.slice(cursor) });
  }
  return (
    <>
      {parts.map((part, i) =>
        part.type === "mark" ? (
          <mark
            key={i}
            className="bg-[var(--color-accent-light)] text-[var(--color-ink)] px-0.5 rounded-sm"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

export function AxiomSearch({ jurisdiction }: AxiomSearchProps) {
  const [query, setQuery] = useState("");
  const [docType, setDocType] = useState<DocTypeFilter>("all");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightToken = useRef(0);

  const runSearch = useCallback(
    async (q: string, type: DocTypeFilter) => {
      const trimmed = q.trim();
      if (trimmed.length < MIN_QUERY_LEN) {
        setResults([]);
        setSubmitted(false);
        setLoading(false);
        setError(null);
        return;
      }
      const token = ++inflightToken.current;
      setLoading(true);
      setError(null);
      try {
        const hits = await searchRules(trimmed, {
          jurisdiction,
          docType: type === "all" ? undefined : type,
          limit: RESULT_LIMIT,
        });
        if (token !== inflightToken.current) return;
        setResults(hits);
        setSubmitted(true);
        trackAxiomEvent("axiom_search", {
          query_length: trimmed.length,
          doc_type: type,
          result_count: hits.length,
        });
      } catch (err) {
        if (token !== inflightToken.current) return;
        setResults([]);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (token === inflightToken.current) setLoading(false);
      }
    },
    [jurisdiction]
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      runSearch(query, docType);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, docType, runSearch]);

  const showEmptyState =
    submitted && !loading && results.length === 0 && query.trim().length >= MIN_QUERY_LEN;

  return (
    <div className="mb-12">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query, docType);
        }}
        className="mb-4"
      >
        <label className="sr-only" htmlFor="axiom-search-input">
          Search statutes and regulations
        </label>
        <input
          id="axiom-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search statutes and regulations (e.g. "SNAP standard deduction")'
          className="w-full px-4 py-3 font-body text-base bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          aria-describedby="axiom-search-help"
        />
        <p
          id="axiom-search-help"
          className="mt-2 font-mono text-xs text-[var(--color-ink-muted)] flex items-center gap-2"
        >
          <span>
            Quoted phrases, OR, and −exclude are supported. Ranked by relevance
            across statutes and regulations.
          </span>
          {loading && (
            <span
              className="text-[var(--color-accent)]"
              aria-live="polite"
            >
              Searching…
            </span>
          )}
        </p>
      </form>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(
          [
            { key: "all", label: "All" },
            { key: "statute", label: "Statutes" },
            { key: "regulation", label: "Regulations" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDocType(key)}
            className={`px-3 py-1.5 font-mono text-xs rounded-md border transition-colors ${
              docType === key
                ? "text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                : "text-[var(--color-ink-muted)] border-[var(--color-rule)] bg-transparent hover:border-[var(--color-rule-hover)]"
            }`}
            aria-pressed={docType === key}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md text-sm text-[var(--color-ink-secondary)]"
        >
          {error}
        </div>
      )}

      {showEmptyState && (
        <div className="p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md text-sm text-[var(--color-ink-secondary)]">
          No matches. Try broader terms or switch the filter to &ldquo;All&rdquo;.
        </div>
      )}

      {results.length > 0 && (
        <ul
          className="divide-y divide-[var(--color-rule)] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md overflow-hidden"
          aria-label="Search results"
        >
          {results.map((hit) => {
            const href = `/${hit.citation_path}`;
            return (
              <li key={hit.id}>
                <Link
                  href={href}
                  className="block px-5 py-4 hover:bg-[var(--color-accent-light)] transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-mono text-xs text-[var(--color-accent)]">
                      {formatCitationLabel(hit.citation_path)}
                    </div>
                    {hit.has_rulespec && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                        Encoded
                      </span>
                    )}
                  </div>
                  {hit.heading && (
                    <div className="mt-1 text-base text-[var(--color-ink)]">
                      {hit.heading}
                    </div>
                  )}
                  <p className="mt-1 text-sm text-[var(--color-ink-secondary)] leading-snug">
                    <Snippet html={hit.snippet} />
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
