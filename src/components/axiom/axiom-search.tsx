"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { parseCitation, type ParsedCitation } from "@/lib/axiom/citation";
import type { AxiomSearchResults, EncodedSearchResult } from "@/lib/axiom/search";
import {
  buildUnifiedResults,
  type ProgramContext,
  type UnifiedResult,
} from "@/lib/axiom/unified-results";
import {
  EXTRA_JURISDICTION_LABELS,
  JURISDICTIONS_SEED,
} from "@/lib/axiom/jurisdictions-seed";
import { SEARCH_SUGGESTIONS } from "@/lib/axiom/search-suggestions";
import type { SearchHit } from "@/lib/supabase";
import { trackAxiomEvent } from "@/lib/analytics";

type DocTypeFilter = "all" | "policy" | "statute" | "regulation" | "rulemaking";

const DEBOUNCE_MS = 200;
const MIN_QUERY_LEN = 2;
const RESULT_LIMIT = 30;
const EMPTY_RESULTS: AxiomSearchResults = {
  query: "",
  programs: [],
  encoded: [],
  corpus: [],
};

/**
 * The jurisdiction picker groups ~57 entries so the national ones a
 * user most likely wants aren't buried under fifty states.
 */
const JURISDICTION_GROUPS: ReadonlyArray<{
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}> = (() => {
  const bySlug = new Map(JURISDICTIONS_SEED.map((j) => [j.slug, j.label]));
  const national = ["us", "uk", "canada"]
    .filter((slug) => bySlug.has(slug))
    .map((slug) => ({ value: slug, label: bySlug.get(slug)! }));
  national.push({ value: "nz", label: EXTRA_JURISDICTION_LABELS["nz"] });
  const states = JURISDICTIONS_SEED.filter((j) => j.slug.startsWith("us-")).map(
    (j) => ({ value: j.slug, label: j.label })
  );
  return [
    { label: "Federal & national", options: national },
    { label: "US states & territories", options: states },
    {
      label: "UK local authorities",
      options: [
        {
          value: "uk-kingston-upon-thames",
          label: EXTRA_JURISDICTION_LABELS["uk-kingston-upon-thames"],
        },
      ],
    },
  ];
})();

interface AxiomSearchProps {
  /**
   * Optional jurisdiction filter. When set, results are constrained to a
   * single jurisdiction (e.g. "us") and the jurisdiction picker is
   * hidden. Leave undefined to search everything.
   */
  jurisdiction?: string;
  /**
   * Query to run on mount — lets other surfaces (the landing hero,
   * shared links) deep-link into /axiom/search?q=….
   */
  initialQuery?: string;
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

export function AxiomSearch({ jurisdiction, initialQuery }: AxiomSearchProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [docType, setDocType] = useState<DocTypeFilter>("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [results, setResults] = useState<AxiomSearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightToken = useRef(0);
  const parsedCitation = useMemo(
    () => parseCitation(query.trim()),
    [query]
  );
  const effectiveJurisdiction = jurisdiction ?? (jurisdictionFilter || undefined);

  const runSearch = useCallback(
    async (q: string, type: DocTypeFilter, jurisdictionIn: string | undefined) => {
      const trimmed = q.trim();
      if (trimmed.length < MIN_QUERY_LEN) {
        setResults(EMPTY_RESULTS);
        setSubmitted(false);
        setLoading(false);
        setError(null);
        return;
      }
      const token = ++inflightToken.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: String(RESULT_LIMIT),
        });
        if (jurisdictionIn) params.set("jurisdiction", jurisdictionIn);
        if (type !== "all") params.set("docType", type);
        const response = await fetch(`/api/axiom/search?${params.toString()}`);
        if (!response.ok) throw new Error("Search failed");
        const hits = (await response.json()) as AxiomSearchResults;
        if (token !== inflightToken.current) return;
        setResults(hits);
        setSubmitted(true);
        trackAxiomEvent("axiom_search", {
          query: trimmed,
          query_length: trimmed.length,
          doc_type: type,
          jurisdiction: jurisdictionIn ?? "all",
          result_count:
            hits.programs.length + hits.encoded.length + hits.corpus.length,
        });
      } catch (err) {
        if (token !== inflightToken.current) return;
        setResults(EMPTY_RESULTS);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (token === inflightToken.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      runSearch(query, docType, effectiveJurisdiction);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, docType, effectiveJurisdiction, runSearch]);

  // Keep ?q= shareable: reflect the live query into the URL without
  // adding history entries.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const trimmed = query.trim();
    if ((url.searchParams.get("q") ?? "") === trimmed) return;
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [query]);

  const unified = useMemo(() => buildUnifiedResults(results), [results]);

  const trackClick = useCallback(
    (row: { kind: "citation" | "program" | "encoded" | "corpus"; citationPath: string }, position: number) => {
      trackAxiomEvent("axiom_search_click", {
        query: query.trim(),
        citation_path: row.citationPath,
        kind: row.kind,
        position,
      });
    },
    [query]
  );

  const showEmptyState =
    submitted &&
    !loading &&
    unified.length === 0 &&
    !parsedCitation &&
    query.trim().length >= MIN_QUERY_LEN;

  return (
    <div className="mb-12">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query, docType, effectiveJurisdiction);
        }}
        className="mb-4"
      >
        <label className="sr-only" htmlFor="axiom-search-input">
          Search statutes, regulations, and rulemaking
        </label>
        <input
          id="axiom-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search statutes, regulations, and rulemaking (e.g. "SNAP standard deduction")'
          className="w-full px-4 py-3 font-body text-base bg-[var(--color-paper-elevated)] border border-[var(--color-rule-strong)] rounded-md placeholder:text-[var(--color-ink-muted)] focus:outline-2 focus:outline-[var(--color-focus-ring)] focus:outline-offset-2 focus:border-[var(--color-accent)] transition-colors"
        />
        {loading && (
          <p
            className="mt-2 font-mono text-xs inline-flex items-center gap-1.5 text-[var(--color-accent)]"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border border-[var(--color-accent)] border-t-transparent animate-spin"
            />
            Searching…
          </p>
        )}
      </form>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(
          [
            { key: "all", label: "All" },
            { key: "policy", label: "Policies" },
            { key: "statute", label: "Statutes" },
            { key: "regulation", label: "Regulations" },
            { key: "rulemaking", label: "Rulemaking" },
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
        {!jurisdiction && (
          <select
            aria-label="Jurisdiction"
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="ml-auto px-3 py-1.5 font-mono text-xs rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] text-[var(--color-ink-secondary)] focus:outline-2 focus:outline-[var(--color-focus-ring)]"
          >
            <option value="">All jurisdictions</option>
            {JURISDICTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
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

      {(query.trim().length < MIN_QUERY_LEN || showEmptyState) && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
            Try one of these
          </p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.query}
                type="button"
                title={suggestion.hint}
                onClick={() => setQuery(suggestion.query)}
                className="px-3 py-1.5 font-body text-sm rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] text-[var(--color-ink-secondary)] transition-colors cursor-pointer hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {suggestion.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {(unified.length > 0 || parsedCitation) && (
        <div className="space-y-4" aria-label="Search results">
          <CitationResult
            parsed={parsedCitation}
            onNavigate={(citationPath) =>
              trackClick({ kind: "citation", citationPath }, 0)
            }
          />
          <Section title="Results" count={unified.length}>
            {unified.map((row, position) => (
              <UnifiedRow
                key={`${row.kind}:${row.href}`}
                row={row}
                onNavigate={() =>
                  trackClick(
                    { kind: row.kind, citationPath: row.href.slice(1) },
                    position
                  )
                }
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function CitationResult({
  parsed,
  onNavigate,
}: {
  parsed: ParsedCitation | null;
  onNavigate: (citationPath: string) => void;
}) {
  if (!parsed) return null;
  return (
    <Section title="Citation" count={1}>
      <li>
        <Link
          href={`/${parsed.citationPath}`}
          onClick={() => onNavigate(parsed.citationPath)}
          className="block px-5 py-4 hover:bg-[var(--color-accent-light)] transition-colors"
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-xs text-[var(--color-accent)]">
              {formatCitationLabel(parsed.citationPath)}
            </div>
            <Badge>Direct</Badge>
          </div>
          <div className="mt-1 text-base text-[var(--color-ink)]">
            Open exact citation
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--color-ink-secondary)] leading-snug break-words">
            {parsed.citationPath}
          </p>
        </Link>
      </li>
    </Section>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
          {title}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {count}
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-rule)] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md overflow-hidden">
        {children}
      </ul>
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] shrink-0">
      {children}
    </span>
  );
}

function UnifiedRow({
  row,
  onNavigate,
}: {
  row: UnifiedResult;
  onNavigate: () => void;
}) {
  // Encoded rows carry independently-clickable rule symbols, so they
  // manage their own links instead of one card-wide anchor.
  if (row.kind === "encoded") {
    return (
      <li>
        <EncodedRow
          hit={row.hit}
          programContext={row.programContext}
          href={row.href}
          onNavigate={onNavigate}
        />
      </li>
    );
  }
  return (
    <li>
      <Link
        href={row.href}
        onClick={onNavigate}
        className="block px-5 py-4 hover:bg-[var(--color-accent-light)] transition-colors"
      >
        {row.kind === "program" && (
          <ProgramRowBody
            context={{ program: row.program, anchor: row.anchor }}
          />
        )}
        {row.kind === "corpus" && <CorpusRowBody hit={row.hit} />}
      </Link>
    </li>
  );
}

function ProgramRowBody({ context }: { context: ProgramContext }) {
  const { program, anchor } = context;
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-mono text-xs text-[var(--color-accent)]">
          {anchor.displayCitation ?? formatCitationLabel(anchor.citationPath)}
        </div>
        <Badge>Program</Badge>
      </div>
      <div className="mt-1 text-base text-[var(--color-ink)]">
        {program.displayName}: {anchor.label}
      </div>
      <p className="mt-1 text-sm text-[var(--color-ink-secondary)] leading-snug">
        {program.summary}
      </p>
    </>
  );
}

/**
 * Anchor on the rule page for a matched symbol. RuleSpecTab renders
 * each rule card with id="rule-<name>"; formula references anchor to
 * the rule whose formula mentioned them (their `source`).
 */
function symbolAnchor(symbol: EncodedSearchResult["symbolMatches"][number]): string {
  const target =
    symbol.kind === "formula_ref" && symbol.source ? symbol.source : symbol.name;
  return `#rule-${target}`;
}

function EncodedRow({
  hit,
  programContext,
  href,
  onNavigate,
}: {
  hit: EncodedSearchResult;
  programContext?: ProgramContext;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <div className="px-5 py-4">
      <Link
        href={href}
        onClick={onNavigate}
        className="block -mx-2 rounded px-2 py-1 hover:bg-[var(--color-accent-light)] transition-colors"
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mono text-xs text-[var(--color-accent)]">
            {hit.jurisdictionLabel} / {hit.bucket}
          </div>
          <Badge>Encoded</Badge>
        </div>
        <div className="mt-1 text-base text-[var(--color-ink)]">{hit.label}</div>
        {programContext && (
          <p className="mt-1 text-sm text-[var(--color-ink-secondary)] leading-snug">
            {programContext.program.displayName}: {programContext.anchor.label}
          </p>
        )}
        {hit.fileSummary && (
          <div className="mt-1 text-sm text-[var(--color-ink-secondary)] leading-snug">
            <span className="font-mono text-xs text-[var(--color-ink-muted)]">
              {hit.fileSummary.ruleCount} rules
              {hit.fileSummary.importCount > 0
                ? ` · ${hit.fileSummary.importCount} imports`
                : ""}
            </span>
            {hit.fileSummary.summary && (
              <p className="mt-1">{hit.fileSummary.summary}</p>
            )}
          </div>
        )}
        <p className="mt-1 font-mono text-xs text-[var(--color-ink-secondary)] leading-snug break-words">
          {hit.citationPath}
        </p>
      </Link>
      {/* Rule chips: matched symbols when the query hit rule names,
          otherwise a preview of the file's headline rules. Matched
          chips carry the formula as a tooltip — kinds ("derived",
          "source_relation") are RuleSpec internals and stay off the
          card; the rule page explains them in context. */}
      {hit.symbolMatches.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {hit.symbolMatches.map((symbol) => (
            <Link
              key={symbol.name}
              href={`${href}${symbolAnchor(symbol)}`}
              onClick={onNavigate}
              title={symbol.formula ? `= ${symbol.formula}` : undefined}
              className="font-mono text-[11px] text-[var(--color-accent)] border border-[var(--color-accent)] bg-[var(--color-paper)] rounded px-2 py-1 transition-colors hover:bg-[var(--color-accent-light)]"
            >
              {symbol.name}
            </Link>
          ))}
        </div>
      ) : (
        hit.fileSummary &&
        hit.fileSummary.previewRules.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hit.fileSummary.previewRules.slice(0, 6).map((rule) => (
              <Link
                key={rule.name}
                href={`${href}#rule-${rule.name}`}
                onClick={onNavigate}
                title={rule.formula ? `= ${rule.formula}` : undefined}
                className="font-mono text-[11px] text-[var(--color-ink-secondary)] border border-[var(--color-rule)] bg-[var(--color-paper)] rounded px-2 py-1 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {rule.name}
              </Link>
            ))}
          </div>
        )
      )}
      {hit.fileSummary && hit.fileSummary.imports.length > 0 && (
        <p className="mt-2 font-mono text-[11px] text-[var(--color-ink-muted)] leading-snug break-words">
          imports {hit.fileSummary.imports.slice(0, 3).join(", ")}
        </p>
      )}
    </div>
  );
}

function CorpusRowBody({ hit }: { hit: SearchHit }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-mono text-xs text-[var(--color-accent)]">
          {formatCitationLabel(hit.citation_path)}
        </div>
        <Badge>{hit.has_rulespec ? "Encoded" : "Source"}</Badge>
      </div>
      {hit.heading && (
        <div className="mt-1 text-base text-[var(--color-ink)]">
          {hit.heading}
        </div>
      )}
      <p className="mt-1 text-sm text-[var(--color-ink-secondary)] leading-snug">
        <Snippet html={hit.snippet} />
      </p>
    </>
  );
}
