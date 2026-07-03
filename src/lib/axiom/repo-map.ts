/**
 * Single source of truth for "where do a jurisdiction's RuleSpec
 * encodings live on GitHub?". Consumed by the server-side fallback
 * fetcher (``lib/supabase.ts::fetchRuleSpecFromGitHub``), the encoded
 * index, the encoded-file listing, and the client-side "View on
 * GitHub" links. Keeping the layout here prevents those surfaces from
 * drifting.
 *
 * Layout: most ``rulespec-*`` repos are monorepos keyed by jurisdiction
 * directory at the top level — federal and every state share
 * ``rulespec-us`` under ``us/``, ``us-ca/``, ``us-al/``, …; UK and its
 * localities share ``rulespec-uk`` under ``uk/``, ``uk-…/``; Belgium
 * and its regional/community modules share ``rulespec-be`` under
 * ``be/``, ``be-bru/``, ``be-vlg/``, ``be-wal/``, …. Some repos
 * hold a single jurisdiction with the buckets at the repo root instead:
 * ``rulespec-ca`` keeps Canada's encodings directly under
 * ``statutes/`` | ``regulations/`` | ``policies/`` with no ``ca/``
 * prefix (see its ``.axiom/repository-structure.yaml``). Either way the
 * bucket-rooted path is the shape the rest of the Axiom app speaks once
 * any prefix is stripped.
 *
 * Keys are the axiom's canonical jurisdiction slugs as they land in
 * ``jurisdiction`` on corpus provision rows — so ``ca`` for Canada
 * (short codes per the corpus citation-path schema). A jurisdiction whose family has no published
 * repo returns ``null``; a jurisdiction that maps to a repo but has no
 * directory there yet just resolves to an empty file listing, so the
 * UI degrades gracefully into "Not yet encoded" without a hard-coded
 * allow-list that drifts as new states are encoded.
 */

const GITHUB_ORG = "TheAxiomFoundation";

export interface RuleSpecRepoLocation {
  /** GitHub repo name, e.g. ``rulespec-us``. */
  repo: string;
  /**
   * Top-level directory within the monorepo holding this
   * jurisdiction's encodings — the jurisdiction slug for
   * jurisdiction-dir monorepos, or ``""`` for single-jurisdiction
   * repos whose buckets sit at the repo root (``rulespec-ca``).
   */
  prefix: string;
}

/**
 * Repos that hold exactly one jurisdiction with the buckets at the
 * repo root (no jurisdiction-directory prefix). Mirrors
 * ``jurisdictionFromRepoName`` in ``scripts/sync-rulespec-index.mjs``.
 */
const ROOT_LAYOUT_REPO_JURISDICTIONS: Readonly<Record<string, string>> =
  Object.freeze({
    "rulespec-ca": "ca",
  });

/**
 * The jurisdiction a root-layout repo holds, or ``null`` for
 * jurisdiction-dir monorepos.
 */
export function ruleSpecRepoRootJurisdiction(repo: string): string | null {
  return ROOT_LAYOUT_REPO_JURISDICTIONS[repo] ?? null;
}

function repoForJurisdiction(jurisdiction: string): string | null {
  if (jurisdiction === "us" || jurisdiction.startsWith("us-")) {
    return "rulespec-us";
  }
  if (jurisdiction === "uk" || jurisdiction.startsWith("uk-")) {
    return "rulespec-uk";
  }
  if (jurisdiction === "be" || jurisdiction.startsWith("be-")) {
    return "rulespec-be";
  }
  if (jurisdiction === "ca") {
    return "rulespec-ca";
  }
  return null;
}

export function getRuleSpecRepoForJurisdiction(
  jurisdiction: string
): string | null {
  return repoForJurisdiction(jurisdiction);
}

export function getRuleSpecRepoLocation(
  jurisdiction: string
): RuleSpecRepoLocation | null {
  const repo = repoForJurisdiction(jurisdiction);
  if (!repo) return null;
  const prefix =
    ruleSpecRepoRootJurisdiction(repo) === jurisdiction ? "" : jurisdiction;
  return { repo, prefix };
}

/** Join a location's prefix onto a bucket-rooted path (no leading slash). */
function prefixedPath(loc: RuleSpecRepoLocation, path: string): string {
  return loc.prefix ? `${loc.prefix}/${path}` : path;
}

/**
 * Build a ``raw.githubusercontent.com`` URL for a bucket-rooted repo
 * path (e.g. ``statutes/26/32.yaml``). Injects the jurisdiction-dir
 * prefix that the monorepo layout requires. Returns ``null`` when the
 * jurisdiction has no published repo.
 */
export function ruleSpecRawFileUrl(
  jurisdiction: string,
  bucketRootedPath: string
): string | null {
  const loc = getRuleSpecRepoLocation(jurisdiction);
  if (!loc) return null;
  return `https://raw.githubusercontent.com/${GITHUB_ORG}/${loc.repo}/main/${prefixedPath(loc, bucketRootedPath)}`;
}

/**
 * Build a ``github.com/…/blob/main`` URL for a bucket-rooted repo path
 * — the human-facing "View on GitHub" link. Returns ``null`` when the
 * jurisdiction has no published repo.
 */
export function ruleSpecBlobUrl(
  jurisdiction: string,
  bucketRootedPath: string
): string | null {
  const loc = getRuleSpecRepoLocation(jurisdiction);
  if (!loc) return null;
  return `https://github.com/${GITHUB_ORG}/${loc.repo}/blob/main/${prefixedPath(loc, bucketRootedPath)}`;
}

/**
 * Build a ``github.com/…/tree/main`` URL pointing at the
 * jurisdiction's directory within its monorepo — used by the encoded
 * index to link a jurisdiction group to its source on GitHub.
 */
export function ruleSpecRepoTreeUrl(jurisdiction: string): string | null {
  const loc = getRuleSpecRepoLocation(jurisdiction);
  if (!loc) return null;
  return loc.prefix
    ? `https://github.com/${GITHUB_ORG}/${loc.repo}/tree/main/${loc.prefix}`
    : `https://github.com/${GITHUB_ORG}/${loc.repo}/tree/main`;
}

/**
 * Build the GitHub git-trees API URL for a single jurisdiction's
 * subtree (``git/trees/main:<jurisdiction>``). Scoping to the
 * jurisdiction directory keeps each response small enough to sit
 * inside Next's fetch-cache size limit — the whole-monorepo recursive
 * tree is several MB and cannot be cached, which would re-hit GitHub on
 * every browse and blow the unauthenticated rate limit.
 */
export function ruleSpecRepoSubtreeApiUrl(
  repo: string,
  prefix: string
): string {
  // Root-layout repos (empty prefix) list the whole repo tree — they
  // hold a single jurisdiction, so the response stays small enough for
  // the fetch cache, unlike the multi-jurisdiction monorepos.
  const ref = prefix ? `main:${prefix}` : "main";
  return `https://api.github.com/repos/${GITHUB_ORG}/${repo}/git/trees/${ref}?recursive=1`;
}

/**
 * Build the GitHub git-trees API URL for a repo's top-level (non
 * recursive) tree — used to discover which jurisdiction directories a
 * monorepo actually contains, so the encoded index lists only
 * populated jurisdictions instead of probing every conceivable slug.
 */
export function ruleSpecRepoRootTreeApiUrl(repo: string): string {
  return `https://api.github.com/repos/${GITHUB_ORG}/${repo}/git/trees/main`;
}

/** The monorepos the Axiom app reads encodings from. */
export const RULESPEC_REPOS = [
  "rulespec-us",
  "rulespec-uk",
  "rulespec-be",
  "rulespec-ca",
] as const;

/**
 * Headers for GitHub git-trees API requests. Unauthenticated requests
 * are capped at 60/hour per IP — tight for the encoded index, which
 * reads several jurisdiction subtrees. When ``GITHUB_TOKEN`` is set
 * (recommended in production) the calls authenticate and the limit
 * rises to 5,000/hour; without it the behaviour is unchanged.
 */
export function gitHubApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const token =
    cleanTokenValue(process.env.AXIOM_GITHUB_TOKEN) ??
    cleanTokenValue(process.env.GITHUB_TOKEN) ??
    cleanTokenValue(process.env.GH_TOKEN);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Vercel-managed secrets sometimes carry a trailing newline (stored
 * verbatim, escaped to a literal ``\n`` by ``vercel env pull``). Either
 * form corrupts the Authorization header into a guaranteed 401, which
 * is worse than sending no token at all — so strip both before use.
 */
function cleanTokenValue(value: string | undefined): string | undefined {
  const cleaned = value?.replaceAll("\\n", "").trim();
  return cleaned || undefined;
}
