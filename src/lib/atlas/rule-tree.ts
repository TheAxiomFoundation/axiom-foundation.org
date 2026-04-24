import { supabaseAkn, type Rule } from "@/lib/supabase";

/**
 * Tree node for the recursive container-rule renderer. Mirrors the
 * atomic hierarchy of ``akn.rules`` under a single root — a section
 * with all its subsections / paragraphs / subparagraphs flattened out
 * into a traversable structure.
 */
export interface RuleTreeNode {
  rule: Rule;
  children: RuleTreeNode[];
}

/**
 * Fetch every descendant of a rule via citation_path prefix, capped
 * at ``limit`` rows so a surprisingly large subtree (say thousands)
 * can't wedge the browser. The result is a flat list — use
 * ``buildRuleTree`` to shape it into the recursive structure.
 *
 * We query by citation_path (not parent_id recursion) because
 * ``rules.citation_path`` carries the full hierarchical address and
 * a single indexed LIKE scan is cheaper than a multi-round trip.
 * Ordering by level + ordinal means the caller can build the tree
 * deterministically without a sort pass.
 */
export async function getRuleDescendants(
  rootCitationPath: string,
  limit = 500
): Promise<Rule[]> {
  if (!rootCitationPath) return [];
  // Escape LIKE metacharacters so weird citation paths can't break
  // the prefix match.
  const escaped = rootCitationPath
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const { data, error } = await supabaseAkn
    .from("rules")
    .select("*")
    .like("citation_path", `${escaped}/%`)
    .order("level", { ascending: true })
    .order("ordinal", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return data as Rule[];
}

/**
 * Assemble a flat descendant list into a tree rooted at ``root``.
 * Missing-parent rows (e.g. when the limit cut the subtree short)
 * are attached to the nearest ancestor present in the list.
 */
export function buildRuleTree(root: Rule, descendants: Rule[]): RuleTreeNode {
  const byParentId = new Map<string, Rule[]>();
  for (const d of descendants) {
    if (!d.parent_id) continue;
    const arr = byParentId.get(d.parent_id);
    if (arr) arr.push(d);
    else byParentId.set(d.parent_id, [d]);
  }

  function build(parent: Rule): RuleTreeNode {
    const kids = byParentId.get(parent.id) ?? [];
    // Already ordinal-sorted by the query, but resort defensively in
    // case a new query shape changes the guarantee.
    kids.sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
    return {
      rule: parent,
      children: kids.map(build),
    };
  }

  return build(root);
}

/**
 * Strip the leading "(id) heading" prefix from a rule body so the
 * rendered text doesn't repeat the label we're already showing
 * alongside. Returns the trimmed body; empty string if nothing
 * substantive is left after stripping.
 */
export function stripBodyLabel(rule: Rule): string {
  const raw = rule.body?.trim();
  if (!raw) return "";
  const tail = rule.citation_path?.split("/").pop() ?? "";
  let stripped = raw;
  if (tail) {
    const re = new RegExp(
      `^\\(\\s*${tail.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\)\\s*`,
      "i"
    );
    stripped = stripped.replace(re, "");
  }
  const heading = rule.heading?.trim();
  if (heading && stripped.toLowerCase().startsWith(heading.toLowerCase())) {
    stripped = stripped.slice(heading.length);
  }
  return stripped.replace(/^[\s—–-]+/, "").trim();
}

/**
 * Does the rule have substantive content of its own (beyond a bare
 * "(id) heading" label)?
 */
export function hasSubstantiveBody(rule: Rule): boolean {
  return stripBodyLabel(rule).length >= 20;
}
