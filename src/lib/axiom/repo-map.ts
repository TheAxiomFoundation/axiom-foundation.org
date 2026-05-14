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
 * Only jurisdictions with a corresponding ``rulespec-*`` repo on
 * github.com/TheAxiomFoundation belong here. A jurisdiction that
 * lives in the corpus but has no repo just
 * returns ``null`` — the UI degrades gracefully into "Not yet
 * encoded" without spurious 404s against a missing repo.
 */
const JURISDICTION_TO_REPO: Readonly<Record<string, string>> = Object.freeze({
  us: "rulespec-us",
  uk: "rulespec-uk",
  canada: "rulespec-ca",
  "us-al": "rulespec-us-al",
  "us-ar": "rulespec-us-ar",
  "us-ca": "rulespec-us-ca",
  "us-co": "rulespec-us-co",
  "us-fl": "rulespec-us-fl",
  "us-ga": "rulespec-us-ga",
  "us-md": "rulespec-us-md",
  "us-nc": "rulespec-us-nc",
  "us-ny": "rulespec-us-ny",
  "us-sc": "rulespec-us-sc",
  "us-tn": "rulespec-us-tn",
  "us-tx": "rulespec-us-tx",
});

export function getRuleSpecRepoForJurisdiction(
  jurisdiction: string
): string | null {
  return JURISDICTION_TO_REPO[jurisdiction] ?? null;
}
