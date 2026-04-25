import { supabaseAkn, type Rule } from "@/lib/supabase";

/**
 * Fetch every rule in a jurisdiction whose ``has_rac`` flag is set
 * — the canonical "this rule is encoded" predicate. Sorted by
 * citation_path so callers can present a stable, scannable list and
 * group by parent document via the path prefix.
 *
 * Returns up to ``limit`` rows; the current corpus is comfortably
 * under 1,000 per jurisdiction (US: 120, UK: 146, US-CO: smaller),
 * so a single query is enough today. Bumping the limit is the only
 * change needed if a jurisdiction ever exceeds 1,000 encoded rules.
 */
export async function getEncodedRulesForJurisdiction(
  jurisdiction: string,
  limit = 1000
): Promise<Rule[]> {
  const { data, error } = await supabaseAkn
    .from("rules")
    .select("*")
    .eq("jurisdiction", jurisdiction)
    .eq("has_rac", true)
    .not("citation_path", "is", null)
    .order("citation_path", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as Rule[];
}

/**
 * Group encoded rules by their parent document. The parent doc is
 * the citation_path prefix that identifies the legal instrument
 * (e.g. ``uk/legislation/uksi/2002/1792`` for the Universal Credit
 * Regulations 2013) — everything beneath is a paragraph or clause
 * within that instrument. Heuristic: take the first 5 segments of
 * the citation_path, which covers UK SIs / PGAs and US Title+section
 * shapes alike.
 */
export interface EncodedRuleGroup {
  /** Citation-path prefix, e.g. ``uk/legislation/uksi/2002/1792``. */
  prefix: string;
  /** Human label for the group (the prefix as-is when no metadata). */
  label: string;
  rules: Rule[];
}

export function groupEncodedRules(rules: Rule[]): EncodedRuleGroup[] {
  const buckets = new Map<string, Rule[]>();
  for (const rule of rules) {
    const path = rule.citation_path ?? "";
    const parts = path.split("/").filter(Boolean);
    // 5 segments captures the document address: jurisdiction +
    // doc-type + 3 doc-id segments (e.g. uksi/<year>/<no>) or
    // statute/<title>/<section>.
    const prefix = parts.slice(0, Math.min(parts.length, 5)).join("/");
    const arr = buckets.get(prefix);
    if (arr) arr.push(rule);
    else buckets.set(prefix, [rule]);
  }
  return Array.from(buckets.entries())
    .map(([prefix, rules]) => ({
      prefix,
      label: prefix,
      rules,
    }))
    .sort((a, b) => b.rules.length - a.rules.length);
}
