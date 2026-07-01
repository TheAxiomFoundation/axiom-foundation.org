"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { parseCitation, type ParsedCitation } from "@/lib/axiom/citation";
import { findPrograms, type Program } from "@/lib/axiom/programs";
import type {
  AxiomSearchResults,
  EncodedSearchResult,
  ProgramSearchResult,
} from "@/lib/axiom/search";
import type { SearchHit } from "@/lib/supabase";
import { trackAxiomEvent } from "@/lib/analytics";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 180;
const SEARCH_MIN_LEN = 2;
const SEARCH_LIMIT = 6;
const PROGRAM_LIMIT = 6;
const EMPTY_SEARCH_RESULTS: AxiomSearchResults = {
  query: "",
  programs: [],
  encoded: [],
  corpus: [],
};

type Row =
  | { kind: "citation"; parsed: ParsedCitation; href: string }
  | {
      kind: "program-anchor";
      program: Program;
      anchor: Program["anchors"][number];
      href: string;
    }
  | { kind: "encoded"; hit: EncodedSearchResult; href: string }
  | { kind: "search"; hit: SearchHit; href: string };

interface SectionRange {
  title: string;
  startIndex: number;
  count: number;
  subtitle?: string;
  featured?: boolean;
}

/**
 * The Axiom command palette — the single fastest-path entry point
 * for finding a rule. Three routing modes run concurrently on every
 * keystroke:
 *
 *   1. Citation parser — typed inputs like "26 USC § 32(b)(1)" or
 *      "UKSI 2013/376 reg 22" resolve deterministically to a
 *      citation_path.
 *   2. Program registry — typed inputs like "SNAP" or "Universal
 *      Credit" surface the program's curated anchors.
 *   3. Hybrid search — debounced search groups live encoded RuleSpecs
 *      ahead of corpus text matches.
 *
 * Arrow-key navigation is global across all three sections; Enter
 * navigates to the focused row's href.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] =
    useState<AxiomSearchResults>(EMPTY_SEARCH_RESULTS);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inflight = useRef(0);

  // Reset state when the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSearchResults(EMPTY_SEARCH_RESULTS);
      setCursor(0);
      setSearching(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll-lock the page behind the palette while it's open.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Debounced full-text search.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LEN) {
      setSearchResults(EMPTY_SEARCH_RESULTS);
      setSearching(false);
      return;
    }
    const token = ++inflight.current;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: String(SEARCH_LIMIT),
        });
        const response = await fetch(`/api/axiom/search?${params.toString()}`);
        if (!response.ok) throw new Error("Search failed");
        const hits = (await response.json()) as AxiomSearchResults;
        if (token !== inflight.current) return;
        setSearchResults(hits);
      } catch {
        if (token !== inflight.current) return;
        setSearchResults(EMPTY_SEARCH_RESULTS);
      } finally {
        if (token === inflight.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, open]);

  // Build the flat row list the cursor indexes into.
  const { rows, sections } = useMemo(() => {
    const trimmed = query.trim();
    const parsed = trimmed ? parseCitation(trimmed) : null;
    const programResults: ProgramSearchResult[] =
      searchResults.programs.length > 0
        ? searchResults.programs
        : findPrograms(trimmed, PROGRAM_LIMIT).map((program) => ({
            program,
            anchors: program.anchors,
          }));
    const hasSpecificEncodedHit = searchResults.encoded.some(
      (hit) => hit.matchKind === "symbol"
    );

    const citationRows: Row[] = [];
    const programRows: Row[] = [];
    const encodedRows: Row[] = [];
    const corpusRows: Row[] = [];

    if (parsed) {
      citationRows.push({
        kind: "citation",
        parsed,
        href: `/${parsed.citationPath}`,
      });
    }

    for (const result of programResults) {
      for (const anchor of result.anchors) {
        programRows.push({
          kind: "program-anchor",
          program: result.program,
          anchor,
          href: `/${anchor.citationPath}`,
        });
      }
    }

    for (const hit of searchResults.encoded) {
      encodedRows.push({
        kind: "encoded",
        hit,
        href: `/${hit.citationPath}`,
      });
    }

    for (const hit of searchResults.corpus) {
      corpusRows.push({
        kind: "search",
        hit,
        href: `/${hit.citation_path}`,
      });
    }

    const bestRow =
      citationRows[0] ??
      (hasSpecificEncodedHit ? encodedRows[0] : null) ??
      (!hasSpecificEncodedHit && programRows.length > 0 ? programRows[0] : null) ??
      encodedRows[0] ??
      corpusRows[0] ??
      null;
    const bestKey = bestRow ? rowKey(bestRow) : null;

    const all: Row[] = [];
    const sectionRanges: SectionRange[] = [];
    const withoutBest = (items: Row[]) =>
      bestKey ? items.filter((row) => rowKey(row) !== bestKey) : items;
    const pushSection = (
      title: string,
      items: Row[],
      subtitle?: string,
      featured = false
    ) => {
      if (items.length === 0) return;
      const start = all.length;
      all.push(...items);
      sectionRanges.push({
        title,
        startIndex: start,
        count: items.length,
        subtitle,
        featured,
      });
    };

    if (bestRow) {
      pushSection("Best match", [bestRow], rowDescriptor(bestRow), true);
    }

    if (!hasSpecificEncodedHit) {
      const items = withoutBest(programRows);
      pushSection(
        "Program / pathway",
        items,
        `${items.length} shortcut${items.length === 1 ? "" : "s"}`
      );
    }

    const remainingEncoded = withoutBest(encodedRows);
    pushSection(
      "Executable RuleSpecs",
      remainingEncoded,
      `${remainingEncoded.length} encoded node${
        remainingEncoded.length === 1 ? "" : "s"
      }`
    );

    if (hasSpecificEncodedHit) {
      const items = withoutBest(programRows);
      pushSection(
        "Program / pathway",
        items,
        `${items.length} shortcut${items.length === 1 ? "" : "s"}`
      );
    }

    const remainingCorpus = withoutBest(corpusRows);
    pushSection(
      "Source text",
      remainingCorpus,
      `${remainingCorpus.length} hit${remainingCorpus.length === 1 ? "" : "s"}`
    );

    return { rows: all, sections: sectionRanges };
  }, [query, searchResults]);

  // Clamp cursor when rows shrink.
  useEffect(() => {
    if (cursor >= rows.length) {
      setCursor(rows.length === 0 ? 0 : rows.length - 1);
    }
  }, [rows.length, cursor]);

  const commit = useCallback(
    async (row: Row, position: number) => {
      const base = { query: query.trim(), position };
      if (row.kind === "citation") {
        trackAxiomEvent("axiom_palette_commit", {
          ...base,
          kind: "citation",
          citation_path: row.parsed.citationPath,
        });
      } else if (row.kind === "program-anchor") {
        trackAxiomEvent("axiom_palette_commit", {
          ...base,
          kind: "program",
          program: row.program.slug,
          role: row.anchor.role,
          citation_path: row.anchor.citationPath,
        });
      } else if (row.kind === "encoded") {
        trackAxiomEvent("axiom_palette_commit", {
          ...base,
          kind: "search",
          citation_path: row.hit.citationPath,
        });
      } else {
        trackAxiomEvent("axiom_palette_commit", {
          ...base,
          kind: "search",
          citation_path: row.hit.citation_path,
        });
      }
      onClose();
      const href =
        row.kind === "search" || row.kind === "encoded"
          ? row.href
          : await resolveNavigableHref(row.href);
      router.push(href);
    },
    [router, onClose, query]
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (rows.length === 0) return;
        setCursor((c) => (c + 1) % rows.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (rows.length === 0) return;
        setCursor((c) => (c - 1 + rows.length) % rows.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const row = rows[cursor];
        if (row) commit(row, cursor);
        return;
      }
    },
    [rows, cursor, commit, onClose]
  );

  // Keep the focused row scrolled into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(
      `[data-palette-row="${cursor}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  const trimmed = query.trim();
  const showEmpty =
    rows.length === 0 &&
    !searching &&
    trimmed.length >= SEARCH_MIN_LEN;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Axiom command palette"
      onKeyDown={onKey}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />

      {/* Palette card */}
      <div className="relative w-full max-w-[720px] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-rule)]">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="w-5 h-5 text-[var(--color-ink-muted)] shrink-0"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Citation, program, source, or encoded rule…"
            aria-label="Search"
            className="flex-1 bg-transparent font-body text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] outline-none"
          />
          {searching && (
            <span
              aria-live="polite"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]"
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-[var(--color-ink-muted)] border-t-transparent animate-spin"
              />
              searching…
            </span>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="max-h-[60vh] overflow-y-auto"
        >
          {trimmed.length === 0 && <EmptyState />}

          {showEmpty && (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-muted)]">
              No citations, programs, or rules matched.
            </div>
          )}

          {sections.map((section) => (
            <div key={section.title} className="py-2">
              <div className="flex items-baseline justify-between px-5 mt-1 mb-2">
                <span className="eyebrow">{section.title}</span>
                {section.subtitle && (
                  <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                    {section.subtitle}
                  </span>
                )}
              </div>
              {rows
                .slice(section.startIndex, section.startIndex + section.count)
                .map((row, localIdx) => {
                  const idx = section.startIndex + localIdx;
                  return (
                    <Row
                      key={idx}
                      row={row}
                      focused={idx === cursor}
                      featured={section.featured}
                      index={idx}
                      onHover={() => setCursor(idx)}
                      onCommit={() => commit(row, idx)}
                    />
                  );
                })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between px-5 py-2 border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            <span>
              <Kbd>↑↓</Kbd> navigate
            </span>
            <span>
              <Kbd>↵</Kbd> open
            </span>
            <span>
              <Kbd>esc</Kbd> close
            </span>
          </div>
          <a
            href="/axiom/search"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            Full search →
          </a>
        </div>
      </div>
    </div>
  );
}

async function resolveNavigableHref(href: string): Promise<string> {
  const path = href.replace(/^\/+/, "");
  if (!path) return href;

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(`/api/axiom/resolve/${encodedPath}`);
    if (!response.ok) return href;
    const payload = (await response.json()) as { href?: unknown };
    return typeof payload.href === "string" && payload.href
      ? payload.href
      : href;
  } catch {
    return href;
  }
}

function Row({
  row,
  focused,
  featured = false,
  index,
  onHover,
  onCommit,
}: {
  row: Row;
  focused: boolean;
  featured?: boolean;
  index: number;
  onHover: () => void;
  onCommit: () => void;
}) {
  const focusedCls = focused
    ? "bg-[var(--color-accent-light)]"
    : "bg-transparent";
  const featuredCls = featured
    ? "border-l-2 border-l-[var(--color-accent)] py-3.5"
    : "border-l-2 border-l-transparent py-2.5";
  const baseCls = `w-full flex items-center gap-4 px-5 text-left transition-colors cursor-pointer ${featuredCls} ${focusedCls}`;

  if (row.kind === "citation") {
    return (
      <button
        type="button"
        data-palette-row={index}
        role="option"
        aria-selected={focused}
        onMouseEnter={onHover}
        onClick={onCommit}
        className={baseCls}
      >
        <IconBadge label="→" tone="citation" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--color-ink)] font-medium truncate">
            {row.parsed.displayLabel}
          </div>
          <div className="font-mono text-xs text-[var(--color-ink-muted)] truncate">
            {row.parsed.citationPath}
          </div>
        </div>
        <ResultBadge>Direct</ResultBadge>
      </button>
    );
  }

  if (row.kind === "program-anchor") {
    return (
      <button
        type="button"
        data-palette-row={index}
        role="option"
        aria-selected={focused}
        onMouseEnter={onHover}
        onClick={onCommit}
        className={baseCls}
      >
        <IconBadge label="§" tone="program" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 text-sm text-[var(--color-ink)]">
            <span className="font-medium truncate">
              {row.program.displayName}
            </span>
            <span className="text-[var(--color-ink-muted)] shrink-0">·</span>
            <span className="text-[var(--color-ink-secondary)] truncate">
              {row.anchor.label}
            </span>
          </div>
          <div className="font-mono text-xs text-[var(--color-accent)] truncate">
            {row.anchor.displayCitation ?? row.anchor.citationPath}
          </div>
          {featured && (
            <p className="mt-1 text-xs text-[var(--color-ink-muted)] leading-snug line-clamp-2">
              {row.program.summary}
            </p>
          )}
        </div>
        <ResultBadge>Pathway</ResultBadge>
      </button>
    );
  }

  if (row.kind === "encoded") {
    return (
      <button
        type="button"
        data-palette-row={index}
        role="option"
        aria-selected={focused}
        onMouseEnter={onHover}
        onClick={onCommit}
        className={baseCls}
      >
        <IconBadge label="λ" tone="encoded" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 text-sm text-[var(--color-ink)]">
            <span className="font-medium truncate">{row.hit.label}</span>
            <span className="text-[var(--color-ink-muted)] shrink-0">·</span>
            <span className="text-[var(--color-ink-secondary)] truncate">
              {row.hit.jurisdictionLabel}
            </span>
          </div>
          <div className="font-mono text-xs text-[var(--color-accent)] truncate">
            {row.hit.citationPath}
          </div>
          {row.hit.symbolMatches.length > 0 && (
            <div className="mt-0.5 font-mono text-[11px] text-[var(--color-ink-secondary)] truncate">
              {row.hit.symbolMatches.map((symbol) => symbol.name).join(", ")}
            </div>
          )}
          {featured && row.hit.symbolMatches[0]?.formula && (
            <div className="mt-1 font-mono text-[11px] text-[var(--color-ink-muted)] truncate">
              {row.hit.symbolMatches[0].formula}
            </div>
          )}
          {row.hit.symbolMatches.length === 0 && row.hit.fileSummary && (
            <div className="mt-0.5 font-mono text-[11px] text-[var(--color-ink-secondary)] truncate">
              {row.hit.fileSummary.ruleCount} rules
              {row.hit.fileSummary.importCount > 0
                ? ` · ${row.hit.fileSummary.importCount} imports`
                : ""}
              {row.hit.fileSummary.previewRules.length > 0
                ? ` · ${row.hit.fileSummary.previewRules
                    .slice(0, 3)
                    .map((rule) => rule.name)
                    .join(", ")}`
                : ""}
            </div>
          )}
        </div>
        <ResultBadge>Executable</ResultBadge>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-palette-row={index}
      role="option"
      aria-selected={focused}
      onMouseEnter={onHover}
      onClick={onCommit}
      className={baseCls}
    >
      <IconBadge label="⌕" tone="source" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[var(--color-ink)] truncate">
          {row.hit.heading || row.hit.citation_path}
        </div>
        <div className="font-mono text-xs text-[var(--color-accent)] truncate">
          {row.hit.citation_path}
        </div>
      </div>
      <ResultBadge>{row.hit.has_rulespec ? "Encoded source" : "Source"}</ResultBadge>
    </button>
  );
}

function rowKey(row: Row): string {
  if (row.kind === "citation") return `citation:${row.parsed.citationPath}`;
  if (row.kind === "program-anchor") {
    return `program:${row.program.slug}:${row.anchor.citationPath}`;
  }
  if (row.kind === "encoded") return `encoded:${row.hit.citationPath}`;
  return `source:${row.hit.id}`;
}

function rowDescriptor(row: Row): string {
  if (row.kind === "citation") return "exact citation";
  if (row.kind === "program-anchor") return "program pathway";
  if (row.kind === "encoded") {
    return row.hit.matchKind === "symbol" ? "executable symbol" : "RuleSpec package";
  }
  return row.hit.has_rulespec ? "encoded source text" : "source text";
}

function IconBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "citation" | "program" | "encoded" | "source";
}) {
  const toneCls =
    tone === "encoded"
      ? "border-[var(--color-accent)] text-[var(--color-accent)]"
      : tone === "citation"
        ? "border-[var(--color-focus-ring)] text-[var(--color-ink)]"
        : "border-[var(--color-rule)] text-[var(--color-ink-muted)]";
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 w-6 h-6 flex items-center justify-center rounded border font-mono text-xs bg-[var(--color-paper)] ${toneCls}`}
    >
      {label}
    </span>
  );
}

function ResultBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] border border-[var(--color-rule)] rounded px-1.5 py-0.5 shrink-0">
      {children}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5em] h-[1.5em] px-1 rounded border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] text-[var(--color-ink-secondary)] font-mono normal-case">
      {children}
    </kbd>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-8 text-sm text-[var(--color-ink-muted)] leading-relaxed">
      <p className="mb-3">Type a citation to jump directly:</p>
      <ul className="space-y-1 font-mono text-xs text-[var(--color-ink-secondary)]">
        <li>
          <span className="text-[var(--color-accent)]">26 USC § 3101(a)</span>{" "}
          — OASDI wage tax rate
        </li>
        <li>
          <span className="text-[var(--color-accent)]">26 USC § 63(c)</span>{" "}
          — Standard deduction
        </li>
        <li>
          <span className="text-[var(--color-accent)]">7 CFR 273.3</span>{" "}
          — SNAP residency rule
        </li>
        <li>
          <span className="text-[var(--color-accent)]">10 CCR 2506-1 § 4.401</span>{" "}
          — Colorado SNAP income eligibility
        </li>
      </ul>
      <p className="mt-4 mb-1">Or a program, source, or encoded rule:</p>
      <p className="font-mono text-xs text-[var(--color-ink-secondary)]">
        <span className="text-[var(--color-accent)]">Arizona SNAP</span>,{" "}
        <span className="text-[var(--color-accent)]">premium tax credit poverty line</span>,{" "}
        <span className="text-[var(--color-accent)]">kingston council tax reduction</span>
      </p>
    </div>
  );
}
