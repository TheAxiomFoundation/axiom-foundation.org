/**
 * Single source of truth for "which GitHub repo holds the encodings
 * for a given jurisdiction?". Consumed by both the server-side
 * fallback fetcher (``lib/supabase.ts::fetchRuleSpecFromGitHub``) and the
 * client-side "View on GitHub" link (``encoding-tab.tsx``). Keeping
 * the map here prevents the pair from drifting.
 *
 * Keys are the atlas's canonical jurisdiction slugs as they land in
 * ``arch.rules.jurisdiction`` — so ``canada`` (not ``ca``) for Canada.
 */
const JURISDICTION_TO_REPO: Readonly<Record<string, string>> = Object.freeze({
  us: "rules-us",
  "us-co": "rules-us-co",
  "us-ca": "rules-us-ca",
  "us-ny": "rules-us-ny",
  canada: "rules-ca",
  uk: "rules-uk",
});

export function getRuleSpecRepoForJurisdiction(
  jurisdiction: string
): string | null {
  return JURISDICTION_TO_REPO[jurisdiction] ?? null;
}
