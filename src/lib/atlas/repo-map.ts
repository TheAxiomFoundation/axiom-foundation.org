/**
 * Single source of truth for "which GitHub repo holds the encodings
 * for a given jurisdiction?". Consumed by both the server-side
 * fallback fetcher (``lib/supabase.ts::fetchRacFromGitHub``) and the
 * client-side "View on GitHub" link (``encoding-tab.tsx``). Keeping
 * the map here prevents the pair from drifting.
 *
 * Keys are the atlas's canonical jurisdiction slugs as they land in
 * ``akn.rules.jurisdiction`` — so ``canada`` (not ``ca``) for Canada.
 */
const JURISDICTION_TO_REPO: Readonly<Record<string, string>> = Object.freeze({
  us: "rac-us",
  "us-co": "rac-us-co",
  "us-ca": "rac-us-ca",
  "us-ny": "rac-us-ny",
  canada: "rac-ca",
  uk: "rac-uk",
});

export function getRacRepoForJurisdiction(
  jurisdiction: string
): string | null {
  return JURISDICTION_TO_REPO[jurisdiction] ?? null;
}
