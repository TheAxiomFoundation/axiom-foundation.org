import { supabaseCorpus, type Rule } from "@/lib/supabase";

/**
 * Tree node for the recursive container-rule renderer. Mirrors the
 * atomic hierarchy of ``corpus.provisions`` under a single root — a section
 * with all its subsections / paragraphs / subparagraphs flattened out
 * into a traversable structure.
 */
export interface RuleTreeNode {
  rule: Rule;
  children: RuleTreeNode[];
}

/**
 * Fetch every descendant of a rule up to ``maxDepth`` levels below,
 * one BFS query per level keyed on ``parent_id``. This relies on the
 * ``parent_id`` index rather than a prefix scan over ``citation_path``
 * — the latter hits statement-timeout on the full corpus because no
 * text_pattern_ops index is available for LIKE prefix matching.
 *
 * The depth cap keeps the round-trip cost bounded (3 queries at
 * depth=3 regardless of subtree shape). Most USC sections bottom out
 * within 2-3 levels of substantive text; deeper sub-subparagraphs are
 * usually available as concatenated text within a level-2 body.
 */
export async function getRuleDescendants(
  rootId: string,
  maxDepth = 3
): Promise<Rule[]> {
  if (!rootId) return [];
  const all: Rule[] = [];
  let frontier: string[] = [rootId];
  for (let depth = 0; depth < maxDepth; depth++) {
    if (frontier.length === 0) break;
    const { data, error } = await supabaseCorpus
      .from("provisions")
      .select("*")
      .in("parent_id", frontier)
      .order("ordinal", { ascending: true, nullsFirst: false });
    if (error || !data || data.length === 0) break;
    const rows = data as Rule[];
    all.push(...rows);
    frontier = rows.map((r) => r.id);
  }
  return all;
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
