"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommandPalette } from "./command-palette-provider";
import { HERO_SUGGESTIONS } from "@/lib/axiom/search-suggestions";

/**
 * The landing-page search bar — a real input, not a palette trigger.
 * Typing + Enter lands on the full unified search page with the query
 * carried along; the ⌘K chip still opens the quick-jump palette for
 * keyboard users.
 */

/**
 * The full search page lives at /axiom/search. On the app subdomain
 * the proxy serves it at /search and 308-redirects the internal form,
 * so link straight to the canonical path per host.
 */
function fullSearchPath(query: string): string {
  const onAppHost =
    typeof window !== "undefined" &&
    window.location.host.startsWith("app.");
  const base = onAppHost ? "/search" : "/axiom/search";
  const q = query.trim();
  return q ? `${base}?q=${encodeURIComponent(q)}` : base;
}

export function HeroSearchBar() {
  const router = useRouter();
  const { open } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent));
  }, []);

  return (
    <div className="w-full max-w-[640px]">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length === 0) return;
          router.push(fullSearchPath(query));
        }}
        className="group flex w-full items-center gap-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-5 py-4 shadow-sm transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-md hover:border-[var(--color-accent)]"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
          className="w-5 h-5 shrink-0 text-[var(--color-ink-muted)] group-focus-within:text-[var(--color-accent)] transition-colors"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" strokeLinecap="round" />
        </svg>
        <label className="sr-only" htmlFor="axiom-hero-search">
          Search Axiom
        </label>
        <input
          id="axiom-hero-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Axiom — citation, program, or topic…"
          className="flex-1 min-w-0 bg-transparent font-body text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] outline-none"
        />
        <button
          type="button"
          onClick={open}
          aria-label="Open quick-jump palette"
          className="hidden sm:inline-flex shrink-0 cursor-pointer rounded border border-[var(--color-rule)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          {isMac ? "⌘K" : "Ctrl K"}
        </button>
      </form>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        <span>Try</span>
        {HERO_SUGGESTIONS.map((suggestion, i) => (
          <span key={suggestion.query} className="inline-flex items-center gap-x-2">
            <button
              type="button"
              title={suggestion.hint}
              onClick={() => router.push(fullSearchPath(suggestion.query))}
              className="cursor-pointer border-b border-dotted border-[var(--color-accent)] text-[var(--color-accent)] normal-case tracking-normal transition-colors hover:border-solid"
            >
              {suggestion.query}
            </button>
            {i < HERO_SUGGESTIONS.length - 1 && <span aria-hidden>·</span>}
          </span>
        ))}
      </p>
    </div>
  );
}
