"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { parseCitation, type ParsedCitation } from "@/lib/atlas/citation";
import { findPrograms, type Program } from "@/lib/atlas/programs";
import { searchRules, type SearchHit } from "@/lib/supabase";
import { trackAtlasEvent } from "@/lib/analytics";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 180;
const SEARCH_MIN_LEN = 2;
const SEARCH_LIMIT = 6;
const PROGRAM_LIMIT = 6;

type Row =
  | { kind: "citation"; parsed: ParsedCitation; href: string }
  | {
      kind: "program-anchor";
      program: Program;
      anchor: Program["anchors"][number];
      href: string;
    }
  | { kind: "search"; hit: SearchHit; href: string };

/**
 * The Atlas command palette — the single fastest-path entry point
 * for finding a rule. Three routing modes run concurrently on every
 * keystroke:
 *
 *   1. Citation parser — typed inputs like "26 USC § 32(b)(1)" or
 *      "UKSI 2013/376 reg 22" resolve deterministically to a
 *      citation_path.
 *   2. Program registry — typed inputs like "SNAP" or "Universal
 *      Credit" surface the program's curated anchors.
 *   3. Full-text search — everything else (debounced) falls through
 *      to the existing search_rules RPC.
 *
 * Arrow-key navigation is global across all three sections; Enter
 * navigates to the focused row's href.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inflight = useRef(0);

  // Reset state when the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSearchHits([]);
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
      setSearchHits([]);
      setSearching(false);
      return;
    }
    const token = ++inflight.current;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const hits = await searchRules(trimmed, { limit: SEARCH_LIMIT });
        if (token !== inflight.current) return;
        setSearchHits(hits);
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
    const programs = findPrograms(trimmed, PROGRAM_LIMIT);

    const all: Row[] = [];
    const sectionRanges: Array<{
      title: string;
      startIndex: number;
      count: number;
      subtitle?: string;
    }> = [];

    if (parsed) {
      sectionRanges.push({
        title: "Citation",
        startIndex: all.length,
        count: 1,
      });
      all.push({
        kind: "citation",
        parsed,
        href: `/atlas/${parsed.citationPath}`,
      });
    }

    if (programs.length > 0) {
      const start = all.length;
      for (const program of programs) {
        for (const anchor of program.anchors) {
          all.push({
            kind: "program-anchor",
            program,
            anchor,
            href: `/atlas/${anchor.citationPath}`,
          });
        }
      }
      sectionRanges.push({
        title: "Programs",
        startIndex: start,
        count: all.length - start,
        subtitle:
          programs.length === 1
            ? `${programs[0].displayName} · ${programs[0].anchors.length} anchors`
            : `${programs.length} programs`,
      });
    }

    if (searchHits.length > 0) {
      const start = all.length;
      for (const hit of searchHits) {
        all.push({
          kind: "search",
          hit,
          href: `/atlas/${hit.citation_path}`,
        });
      }
      sectionRanges.push({
        title: "Search",
        startIndex: start,
        count: all.length - start,
        subtitle: `${searchHits.length} hit${searchHits.length === 1 ? "" : "s"}`,
      });
    }

    return { rows: all, sections: sectionRanges };
  }, [query, searchHits]);

  // Clamp cursor when rows shrink.
  useEffect(() => {
    if (cursor >= rows.length) {
      setCursor(rows.length === 0 ? 0 : rows.length - 1);
    }
  }, [rows.length, cursor]);

  const commit = useCallback(
    (row: Row) => {
      if (row.kind === "citation") {
        trackAtlasEvent("atlas_palette_commit", {
          kind: "citation",
          citation_path: row.parsed.citationPath,
        });
      } else if (row.kind === "program-anchor") {
        trackAtlasEvent("atlas_palette_commit", {
          kind: "program",
          program: row.program.slug,
          role: row.anchor.role,
          citation_path: row.anchor.citationPath,
        });
      } else {
        trackAtlasEvent("atlas_palette_commit", {
          kind: "search",
          citation_path: row.hit.citation_path,
        });
      }
      onClose();
      router.push(row.href);
    },
    [router, onClose]
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
        if (row) commit(row);
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
      aria-label="Atlas command palette"
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
      <div className="relative w-full max-w-[640px] bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md shadow-2xl overflow-hidden">
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
            placeholder="Citation, program, or topic…"
            aria-label="Search"
            className="flex-1 bg-transparent font-body text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] outline-none"
          />
          {searching && (
            <span
              aria-live="polite"
              className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]"
            >
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
                      index={idx}
                      onHover={() => setCursor(idx)}
                      onCommit={() => commit(row)}
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
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            Atlas
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  row,
  focused,
  index,
  onHover,
  onCommit,
}: {
  row: Row;
  focused: boolean;
  index: number;
  onHover: () => void;
  onCommit: () => void;
}) {
  const focusedCls = focused
    ? "bg-[var(--color-accent-light)]"
    : "bg-transparent";
  const baseCls = `w-full flex items-center gap-4 px-5 py-2.5 text-left transition-colors cursor-pointer ${focusedCls}`;

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
        <IconBadge label="→" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--color-ink)] font-medium truncate">
            {row.parsed.displayLabel}
          </div>
          <div className="font-mono text-xs text-[var(--color-ink-muted)] truncate">
            {row.parsed.citationPath}
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] shrink-0">
          Jump
        </span>
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
        <IconBadge label="§" />
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
        </div>
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
      <IconBadge label="⌕" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[var(--color-ink)] truncate">
          {row.hit.heading || row.hit.citation_path}
        </div>
        <div className="font-mono text-xs text-[var(--color-accent)] truncate">
          {row.hit.citation_path}
        </div>
      </div>
      {row.hit.has_rulespec && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] border border-[var(--color-accent)] rounded px-1.5 py-0.5 shrink-0">
          RuleSpec
        </span>
      )}
    </button>
  );
}

function IconBadge({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 w-6 h-6 flex items-center justify-center rounded border border-[var(--color-rule)] font-mono text-xs text-[var(--color-ink-muted)] bg-[var(--color-paper)]"
    >
      {label}
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
      <p className="mb-3">
        Type a citation to jump directly:
      </p>
      <ul className="space-y-1 font-mono text-xs text-[var(--color-ink-secondary)]">
        <li>
          <span className="text-[var(--color-accent)]">26 USC § 32(b)(1)</span>{" "}
          — US Code with subsections
        </li>
        <li>
          <span className="text-[var(--color-accent)]">7 CFR 273.9(c)(1)</span>{" "}
          — Code of Federal Regulations
        </li>
        <li>
          <span className="text-[var(--color-accent)]">UKSI 2013/376 reg 22</span>{" "}
          — UK Statutory Instrument
        </li>
        <li>
          <span className="text-[var(--color-accent)]">C.R.S. § 26-2-703</span>{" "}
          — Colorado Revised Statutes
        </li>
      </ul>
      <p className="mt-4 mb-1">Or a program name:</p>
      <p className="font-mono text-xs text-[var(--color-ink-secondary)]">
        <span className="text-[var(--color-accent)]">SNAP</span>,{" "}
        <span className="text-[var(--color-accent)]">EITC</span>,{" "}
        <span className="text-[var(--color-accent)]">Universal Credit</span>,{" "}
        <span className="text-[var(--color-accent)]">Medicaid</span>…
      </p>
    </div>
  );
}
