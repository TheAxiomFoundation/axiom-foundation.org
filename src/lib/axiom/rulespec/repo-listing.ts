import { getRuleSpecRepoForJurisdiction } from "@/lib/axiom/repo-map";
import { cachedRawFetch } from "./raw-cache";

/**
 * Fetch the list of RuleSpec encoding files in a jurisdiction's
 * ``rules-*`` GitHub repo. Filters down to ``.yaml`` files that are
 * actual encodings (not ``.test.yaml`` test fixtures, not
 * ``.meta.yaml`` source-target overlays).
 *
 * The atlas's encoded-rules surface uses this to render a directory
 * of every encoding that exists in the canonical repos today —
 * independent of the corpus DB's ``has_rulespec`` flag, which is
 * out-of-date for most jurisdictions during the rolling migration.
 */
export interface EncodedFile {
  /** Repo-relative path, e.g. ``statutes/26/3101/a.yaml``. */
  filePath: string;
  /** Citation path, e.g. ``us/statute/26/3101/a``. Bucket-renamed
   *  back to the singular form the rest of the atlas speaks. */
  citationPath: string;
  /** Top-level bucket: ``statutes`` | ``regulations`` | ``policies``
   *  | other. Useful for grouping in the index UI. */
  bucket: string;
}

const REPO_TO_CITATION_BUCKET: Readonly<Record<string, string>> = Object.freeze({
  statutes: "statute",
  regulations: "regulation",
  policies: "policy",
});

interface GitHubTreeEntry {
  path: string;
  type: string;
}

interface GitHubTreeResponse {
  tree?: GitHubTreeEntry[];
  truncated?: boolean;
}

const REVALIDATE_SECONDS = 600;

/**
 * Fetch and filter the file tree for one jurisdiction. Returns an
 * empty list when the jurisdiction has no repo or the API call
 * fails — the caller renders that as "no encodings yet" instead of
 * surfacing the network error.
 */
export async function listEncodedFiles(
  jurisdiction: string
): Promise<EncodedFile[]> {
  const repo = getRuleSpecRepoForJurisdiction(jurisdiction);
  if (!repo) return [];
  const url = `https://api.github.com/repos/TheAxiomFoundation/${repo}/git/trees/main?recursive=1`;
  let body: GitHubTreeResponse | null = null;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: REVALIDATE_SECONDS },
    } as RequestInit);
    if (!res.ok) return [];
    body = (await res.json()) as GitHubTreeResponse;
  } catch {
    return [];
  }
  return parseTreeEntries(body, jurisdiction);
}

/**
 * Pure transform from a GitHub tree response to encoded-file
 * records. Exposed for testing.
 */
export function parseTreeEntries(
  body: GitHubTreeResponse | null,
  jurisdiction: string
): EncodedFile[] {
  if (!body || !Array.isArray(body.tree)) return [];
  const out: EncodedFile[] = [];
  for (const entry of body.tree) {
    if (entry.type !== "blob") continue;
    if (!isEncodingFile(entry.path)) continue;
    const stripped = entry.path.replace(/\.yaml$/, "");
    const segs = stripped.split("/");
    const repoBucket = segs[0];
    const citationBucket = REPO_TO_CITATION_BUCKET[repoBucket] ?? repoBucket;
    const tail = normaliseTitleSegment(
      segs.slice(1),
      jurisdiction,
      repoBucket
    );
    out.push({
      filePath: entry.path,
      citationPath: tail
        ? `${jurisdiction}/${citationBucket}/${tail}`
        : `${jurisdiction}/${citationBucket}`,
      bucket: repoBucket,
    });
  }
  out.sort((a, b) => a.citationPath.localeCompare(b.citationPath));
  return out;
}

/**
 * Some rules-* repos include a publication-system suffix on the
 * regulation title that the corpus citation_path drops. ``rules-us``
 * stores federal regulations under ``regulations/7-cfr/…``, but the
 * corpus carries the bare ``us/regulation/7/…``. Normalise here so
 * the citation paths line up across the two stores.
 */
function normaliseTitleSegment(
  tailSegs: string[],
  jurisdiction: string,
  repoBucket: string
): string {
  if (
    jurisdiction === "us" &&
    repoBucket === "regulations" &&
    tailSegs.length > 0
  ) {
    tailSegs = [...tailSegs];
    tailSegs[0] = tailSegs[0].replace(/-cfr$/, "");
  }
  return tailSegs.join("/");
}

function isEncodingFile(path: string): boolean {
  if (!path.endsWith(".yaml")) return false;
  if (path.endsWith(".test.yaml")) return false;
  if (path.endsWith(".meta.yaml")) return false;
  return true;
}

/**
 * Find every encoded descendant of ``citationPath`` — i.e. YAML files
 * whose citation_path lives strictly under it. Used by the rule-detail
 * rail to point readers from a container page (e.g. ``us/statute/26/3101``)
 * down to the subsections that actually have encodings (``…/a``,
 * ``…/b/1``, ``…/b/2``).
 */
export async function findEncodedDescendants(
  citationPath: string
): Promise<EncodedFile[]> {
  const jurisdiction = citationPath.split("/")[0];
  if (!jurisdiction) return [];
  const all = await listEncodedFiles(jurisdiction);
  const prefix = `${citationPath}/`;
  return all.filter((f) => f.citationPath.startsWith(prefix));
}

/**
 * Resolve a citation path back to the repo-relative file path. Reverse
 * of the transform in ``parseTreeEntries``, so the viewer page can
 * fetch the YAML for a given citation.
 */
export function citationPathToFilePath(citationPath: string): string | null {
  const parts = citationPath.split("/");
  if (parts.length < 2) return null;
  const [jurisdiction, citationBucket, ...rest] = parts;
  const repoBucket = citationBucketToRepoBucket(citationBucket);
  // Inverse of the title-segment normalisation in parseTreeEntries —
  // the corpus drops the ``-cfr`` suffix that the rules-us repo
  // carries on federal-regulation titles.
  if (
    jurisdiction === "us" &&
    citationBucket === "regulation" &&
    rest.length > 0 &&
    !rest[0].endsWith("-cfr")
  ) {
    rest[0] = `${rest[0]}-cfr`;
  }
  return `${repoBucket}/${rest.join("/")}.yaml`;
}

function citationBucketToRepoBucket(citationBucket: string): string {
  if (citationBucket === "statute") return "statutes";
  if (citationBucket === "regulation") return "regulations";
  if (citationBucket === "policy") return "policies";
  return citationBucket;
}

/**
 * Fetch the raw YAML from the canonical ``rules-*`` repo for a given
 * citation path. Returns null when the repo or file is missing.
 */
export async function fetchEncodedFile(
  citationPath: string
): Promise<{ filePath: string; content: string } | null> {
  const parts = citationPath.split("/");
  const jurisdiction = parts[0];
  const repo = getRuleSpecRepoForJurisdiction(jurisdiction);
  if (!repo) return null;
  const filePath = citationPathToFilePath(citationPath);
  if (!filePath) return null;
  const url = `https://raw.githubusercontent.com/TheAxiomFoundation/${repo}/main/${filePath}`;
  const res = await cachedRawFetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  } as RequestInit);
  if (!res.ok) return null;
  return { filePath, content: res.body };
}
