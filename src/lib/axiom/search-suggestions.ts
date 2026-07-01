/**
 * Curated example searches surfaced on the landing hero and the empty
 * search page.
 *
 * Every entry here is verified against the live hybrid search before
 * shipping: it must return a strong top result (ideally a symbol-level
 * encoded match) so a first-time user's first click demonstrates the
 * product, not a miss. When editing, re-run each query on
 * /axiom/search and check the top hits — and keep the set covering
 * different jurisdictions and lanes (state policy, federal statute,
 * regulation, UK, citation shortcut).
 */
export interface SearchSuggestion {
  query: string;
  /** What the query demonstrates — shown as a tooltip / aria hint. */
  hint: string;
}

export const SEARCH_SUGGESTIONS: readonly SearchSuggestion[] = Object.freeze([
  {
    query: "colorado snap deduction",
    hint: "State policy manual with encoded deduction rules",
  },
  {
    query: "earned income tax credit",
    hint: "Federal statute with encoded formulas (26 USC § 32)",
  },
  {
    query: "snap utility allowance",
    hint: "Encoded utility allowance parameters across states",
  },
  {
    query: "medicaid eligibility",
    hint: "Eligibility regulations with encoded rules (42 CFR 435)",
  },
  {
    query: "premium tax credit",
    hint: "ACA subsidy statute and encoded calculation",
  },
  {
    query: "universal credit work allowance",
    hint: "UK regulations (UKSI 2013/376)",
  },
]);

/** Compact subset for the landing hero caption. */
export const HERO_SUGGESTIONS: readonly SearchSuggestion[] =
  SEARCH_SUGGESTIONS.slice(0, 3);
