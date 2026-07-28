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

import {
  humanizeCitation,
  humanizeRuleName,
  jurisdictionLabel,
} from "./citations";
import type { CorpusModule } from "@/lib/axiom/corpus-field";

export interface CorpusListEntry {
  target: string;
  /** The module's jurisdiction ("us", "us-co") — scope filtering and
   *  the row's data attribute. */
  jurisdiction: string;
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

/* ── Jurisdiction scope: All · Nationwide · States ──
 * A coarse cut composed WITH the text search: Nationwide is the
 * federal corpus (`us`), States is every `us-XX` corpus. Applies to
 * the complete list and the "start here" band alike. */
export type JurisdictionScope = "all" | "nationwide" | "states";

export const JURISDICTION_SCOPES: ReadonlyArray<{
  id: JurisdictionScope;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "nationwide", label: "Nationwide" },
  { id: "states", label: "States" },
];

/** "all states", or one `us-XX` code under the States scope. */
export const ALL_STATES = "all";

export function matchesScope(
  jurisdiction: string,
  scope: JurisdictionScope,
  state: string = ALL_STATES,
): boolean {
  if (scope === "nationwide") return jurisdiction === "us";
  if (scope === "states") {
    return (
      jurisdiction.startsWith("us-") &&
      (state === ALL_STATES || jurisdiction === state)
    );
  }
  return true;
}

/** Scope over raw modules — the doors band filters BEFORE the
 *  highlight computation so featured picks respect the scope (and
 *  the chosen state) too. */
export function filterModulesByScope(
  modules: CorpusModule[],
  scope: JurisdictionScope,
  state: string = ALL_STATES,
): CorpusModule[] {
  if (scope === "all") return modules;
  return modules.filter((module) =>
    matchesScope(module.jurisdiction, scope, state),
  );
}

/** The states actually present in a module set, as real names from
 *  the citations map ("Iowa", never "us-ia"), sorted by name — the
 *  state picker's option list. */
export function statesInModules(
  modules: CorpusModule[],
): Array<{ id: string; label: string }> {
  const seen = new Set<string>();
  for (const module of modules) {
    if (module.jurisdiction.startsWith("us-")) seen.add(module.jurisdiction);
  }
  return [...seen]
    .map((id) => ({ id, label: jurisdictionLabel(id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

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
      jurisdiction: module.jurisdiction,
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
 *  the full list — typing filters it live, composed with the
 *  jurisdiction scope and (under States) the chosen state. */
export function filterListEntries(
  entries: CorpusListEntry[],
  query: string,
  scope: JurisdictionScope = "all",
  state: string = ALL_STATES,
): CorpusListEntry[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(
    (entry) =>
      matchesScope(entry.jurisdiction, scope, state) &&
      tokens.every((token) => entry.haystack.includes(token)),
  );
}
