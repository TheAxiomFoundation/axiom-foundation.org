/**
 * Single source of truth for "which GitHub repo holds the encodings
 * for a given jurisdiction?". Consumed by both the server-side
 * fallback fetcher (``lib/supabase.ts::fetchRuleSpecFromGitHub``), the
 * encoded index, and the client-side "View on GitHub" link. Keeping
 * the map here prevents those surfaces from drifting.
 *
 * Keys are the axiom's canonical jurisdiction slugs as they land in
 * ``jurisdiction`` in corpus provision rows — so ``canada`` (not ``ca``) for Canada.
 *
 * Only jurisdictions with a corresponding ``rules-*`` repo on
 * github.com/TheAxiomFoundation belong here. A jurisdiction that
 * lives in the corpus but has no repo (e.g. New York today) just
 * returns ``null`` — the UI degrades gracefully into "Not yet
 * encoded" without spurious 404s against a missing repo.
 */
const JURISDICTION_TO_REPO: Readonly<Record<string, string>> = Object.freeze({
  us: "rules-us",
  uk: "rules-uk",
  canada: "rules-ca",
  "us-al": "rules-us-al",
  "us-ar": "rules-us-ar",
  "us-ca": "rules-us-ca",
  "us-co": "rules-us-co",
  "us-fl": "rules-us-fl",
  "us-ga": "rules-us-ga",
  "us-md": "rules-us-md",
  "us-nc": "rules-us-nc",
  "us-sc": "rules-us-sc",
  "us-tn": "rules-us-tn",
  "us-tx": "rules-us-tx",
});

export function getRuleSpecRepoForJurisdiction(
  jurisdiction: string
): string | null {
  return JURISDICTION_TO_REPO[jurisdiction] ?? null;
}
