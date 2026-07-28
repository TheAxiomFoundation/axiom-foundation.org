"use client";

import { useMemo, useState } from "react";
import { humanizeCitation } from "./citations";
import {
  computeFieldHighlights,
  type CorpusModule,
} from "@/lib/axiom/corpus-field";

/**
 * The launcher's single verb: pick a node → its subgraph opens.
 *
 * Two pieces, composed by the launcher:
 * - SubtreeSearch — a search over EVERY subtree the corpus serves
 *   (matching humanized citation + raw target). Compact mode floats
 *   its results as a dropdown, for the top-right control cluster
 *   over the full-bleed field.
 * - SubtreeDoors — the census's own computed doors (largest / most
 *   intricate subtrees), the list mode's body.
 *
 * Picking anything calls onPick(target); the viewer enters compose
 * mode for exactly that root. No program cards, no registry.
 */

const MAX_RESULTS = 40;

export function SubtreeSearch({
  modules,
  onPick,
  compact = false,
}: {
  modules: CorpusModule[];
  onPick: (target: string) => void;
  /** Floating variant: results drop down over whatever is beneath. */
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");

  // Humanize once — thousands of citations per keystroke is real money.
  const entries = useMemo(
    () =>
      modules.map((module) => {
        const label = humanizeCitation(module.target);
        return {
          module,
          label,
          haystack: `${label} ${module.target}`.toLowerCase(),
        };
      }),
    [modules],
  );

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    const tokens = trimmed.split(/\s+/);
    const hits: typeof entries = [];
    for (const entry of entries) {
      if (tokens.every((token) => entry.haystack.includes(token))) {
        hits.push(entry);
        if (hits.length >= MAX_RESULTS) break;
      }
    }
    return hits;
  }, [entries, query]);

  const searching = query.trim().length > 0;

  return (
    <div className={`subtree-search ${compact ? "is-compact" : ""}`}>
      <input
        type="search"
        className="picker-search"
        data-testid="picker-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${modules.length.toLocaleString("en-US")} provisions…`}
        aria-label="Search every encoded provision"
      />
      {searching && (
        <div
          className={`picker-results ${compact ? "picker-results-floating" : ""}`}
          role="listbox"
          aria-label="Matching provisions"
        >
          {matches.map((entry) => (
            <button
              type="button"
              key={entry.module.target}
              className="picker-result"
              data-testid="picker-result"
              onClick={() => onPick(entry.module.target)}
            >
              <strong>{entry.label}</strong>
              <span className="picker-result-target">
                {entry.module.target}
                {entry.module.ruleCount > 0
                  ? ` · ${entry.module.ruleCount} rules`
                  : ""}
              </span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="picker-empty">
              No provision matches — try a citation fragment like
              “273.10” or “7 usc 2014”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SubtreeDoors({
  modules,
  onPick,
}: {
  modules: CorpusModule[];
  onPick: (target: string) => void;
}) {
  const doors = useMemo(() => computeFieldHighlights(modules), [modules]);
  return (
    <>
      <p className="picker-doors-label">
        the corpus&apos;s deepest subtrees
      </p>
      <div className="picker-doors">
        {doors.map((module, index) => (
          <button
            type="button"
            key={module.target}
            className="picker-door"
            data-testid="picker-door"
            style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
            onClick={() => onPick(module.target)}
          >
            <span className="plane-launcher-chip">
              {module.jurisdiction.toUpperCase()}
            </span>
            <strong>{humanizeCitation(module.target)}</strong>
            <span className="plane-launcher-meta">
              {module.ruleCount} rules · {module.bucket}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
