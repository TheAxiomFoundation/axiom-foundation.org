/**
 * The launcher list's rows: the COMPLETE corpus the field shows
 * (same filterViewModules set), humanized once. Pure module — the
 * list component renders it in slabs; tests exercise it directly.
 *
 * Row anatomy mirrors the doors: humanized headline rule as the
 * title where the census names one (citation demoted to subtitle),
 * humanized citation as the title otherwise, and a
 * "N rules · bucket" meta line. No raw "us-fl · policies/…" slugs
 * survive — every target passes through humanizeCitation.
 */

import { humanizeCitation, humanizeRuleName } from "./citations";
import type { CorpusModule } from "@/lib/axiom/corpus-field";

export interface CorpusListEntry {
  target: string;
  /** Humanized headline rule, else the humanized citation. */
  title: string;
  /** The citation, only when the title was a headline — a row never
   *  repeats itself. */
  subtitle: string | null;
  /** "24 rules · statutes" — the same fields the doors show. */
  meta: string;
  /** Lower-cased search text: title + citation + raw target. */
  haystack: string;
}

/** Rows render in slabs of this size, appended as the reader scrolls
 *  (2,900 rows of DOM at once is a real jank tax). */
export const LIST_SLAB_SIZE = 200;

export function buildListEntries(
  modules: CorpusModule[],
): CorpusListEntry[] {
  const entries = modules.map((module) => {
    const citation = humanizeCitation(module.target);
    const headline = module.headlineRule
      ? humanizeRuleName(module.headlineRule)
      : null;
    return {
      target: module.target,
      title: headline ?? citation,
      subtitle: headline ? citation : null,
      meta: `${module.ruleCount} rule${module.ruleCount === 1 ? "" : "s"} · ${module.bucket}`,
      haystack:
        `${headline ?? ""} ${citation} ${module.target}`.toLowerCase(),
      // Sort key rides along, then drops.
      _rules: module.ruleCount,
    };
  });
  // Biggest subtrees first (the doors' own ordering instinct), then
  // by target for a stable, deterministic list.
  entries.sort(
    (a, b) => b._rules - a._rules || a.target.localeCompare(b.target),
  );
  return entries.map(({ _rules: _dropped, ...entry }) => entry);
}

/** The same every-token-matches search the dropdown uses, applied to
 *  the full list — typing filters it live. */
export function filterListEntries(
  entries: CorpusListEntry[],
  query: string,
): CorpusListEntry[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return entries;
  return entries.filter((entry) =>
    tokens.every((token) => entry.haystack.includes(token)),
  );
}
