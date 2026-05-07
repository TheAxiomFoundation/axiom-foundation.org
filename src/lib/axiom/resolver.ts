import { supabaseCorpus, type Rule } from "@/lib/supabase";
import { naturalCompare } from "@/lib/natural-sort";

/**
 * Outcome of resolving a citation_path against ``corpus.current_provisions``.
 *
 * - ``exact``: the full path exists as an atomic rule.
 * - ``ancestor``: the full path does not exist, but some prefix does;
 *   ``rule`` is the deepest ingested ancestor and ``missingTail``
 *   lists the segments below it that aren't in the axiom yet.
 * - ``none``: no prefix of the path is ingested.
 *
 * The Axiom view treats ``ancestor`` the same as a "rule-not-yet-
 * ingested" deep link — it lands on the ancestor so the user gets
 * useful context (and surfaces the missing tail so they understand
 * what's absent). ``none`` falls through to a "no ingested rule
 * matches" empty state.
 */
export type ResolveMatch = "exact" | "ancestor" | "none";

export interface ResolveResult {
  match: ResolveMatch;
  rule: Rule | null;
  missingTail: string[];
  /** The input path after normalisation (lower-cased, no leading slash). */
  citationPath: string;
}

/**
 * Enumerate every prefix of a citation_path from deepest to shallowest.
 *
 *   us/statute/26/32/b/1 →
 *     [
 *       "us/statute/26/32/b/1",
 *       "us/statute/26/32/b",
 *       "us/statute/26/32",
 *       "us/statute/26",
 *       "us/statute",
 *       "us",
 *     ]
 *
 * The root jurisdiction segment is kept for consistency even though
 * no rule lives at that depth; the resolver will simply miss it.
 */
export function citationPathPrefixes(path: string): string[] {
  const parts = path.split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = parts.length; i > 0; i--) {
    out.push(parts.slice(0, i).join("/"));
  }
  return out;
}

function normalise(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
}

/**
 * Resolve a citation_path against the ingested axiom. Single DB query
 * fetches every possible ancestor; we pick the deepest match.
 *
 * This is the load-bearing primitive for the command palette and
 * direct-URL entry: every wayfinding path ultimately resolves an
 * input to an atomic ``rules`` row here.
 */
export async function resolveCitationPath(
  input: string
): Promise<ResolveResult> {
  const citationPath = normalise(input);
  if (!citationPath) {
    return {
      match: "none",
      rule: null,
      missingTail: [],
      citationPath: "",
    };
  }

  const prefixes = citationPathPrefixes(citationPath);
  if (prefixes.length === 0) {
    return { match: "none", rule: null, missingTail: [], citationPath };
  }

  const { data, error } = await supabaseCorpus
    .from("current_provisions")
    .select("*")
    .in("citation_path", prefixes);

  if (error || !data || data.length === 0) {
    return { match: "none", rule: null, missingTail: [], citationPath };
  }

  // Index hits by path so we can pick the deepest in O(1).
  const byPath = new Map<string, Rule>();
  for (const row of data as Rule[]) {
    if (row.citation_path) byPath.set(row.citation_path, row);
  }
  for (const prefix of prefixes) {
    const hit = byPath.get(prefix);
    if (hit) {
      const isExact = prefix === citationPath;
      const missingTail = isExact
        ? []
        : citationPath
            .slice(prefix.length)
            .split("/")
            .filter(Boolean);
      return {
        match: isExact ? "exact" : "ancestor",
        rule: hit,
        missingTail,
        citationPath,
      };
    }
  }

  return { match: "none", rule: null, missingTail: [], citationPath };
}

/**
 * Given a rule, return its siblings at the same depth under the same
 * parent, ordered by ``ordinal``. Used for the rule-view sibling
 * strip and for palette "nearby" hints.
 */
export async function getSiblings(rule: Rule): Promise<Rule[]> {
  if (!rule.parent_id) {
    if (!rule.citation_path) return [rule];

    const parts = rule.citation_path.split("/");
    const parentPath = parts.slice(0, -1).join("/");
    if (!parentPath) return [rule];

    const { data } = await supabaseCorpus
      .from("current_provisions")
      .select("*")
      .gte("citation_path", `${parentPath}/`)
      .lt("citation_path", `${parentPath}~`)
      .is("parent_id", null)
      .order("citation_path")
      .range(0, 999);
    return sortSiblings((data as Rule[] | null) ?? []);
  }
  const { data } = await supabaseCorpus
    .from("current_provisions")
    .select("*")
    .eq("parent_id", rule.parent_id)
    .order("ordinal", { ascending: true, nullsFirst: false });
  return (data as Rule[] | null) ?? [];
}

function sortSiblings(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => {
    const aOrdinal = a.ordinal;
    const bOrdinal = b.ordinal;

    if (aOrdinal != null && bOrdinal != null && aOrdinal !== bOrdinal) {
      return aOrdinal - bOrdinal;
    }
    if (aOrdinal != null && bOrdinal == null) return -1;
    if (aOrdinal == null && bOrdinal != null) return 1;

    return naturalCompare(a.citation_path ?? a.id, b.citation_path ?? b.id);
  });
}
