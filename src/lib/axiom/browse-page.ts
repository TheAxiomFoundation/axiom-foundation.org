import {
  resolveAxiomPath,
  buildBreadcrumbs,
  type BreadcrumbItem,
  type TreeNode,
} from "@/lib/tree-data";
import { loadTreeNodes } from "@/lib/axiom/tree-node-loader";
import type { Rule } from "@/lib/supabase";

/**
 * Data assembly for v2 browse pages — the levels above a section
 * (jurisdiction root, doc type, title), server-rendered in the
 * reader's visual language. Same navigation-index-backed loader the
 * v1 tree browser uses, fetched server-side.
 */

export interface BrowsePageData {
  /** Path segments as given ("us", "statute", "26"). */
  segments: string[];
  jurisdictionLabel: string;
  breadcrumbs: BreadcrumbItem[];
  /** The node being browsed, when the level maps to a corpus row. */
  currentRule: Rule | null;
  nodes: TreeNode[];
  /** True when the level has more children than one page shows. */
  hasMore: boolean;
  page: number;
}

/** Repo plumbing files (release scopes, bulk manifests) that the
 *  rulespec-only merge can surface as phantom browse nodes. */
function isPlumbingNode(node: TreeNode): boolean {
  return /^release[\s-]scope/i.test(node.label) || /^release-scope/.test(node.segment);
}

/** The index has shipped duplicate rows per path (axiom-corpus#400);
 *  keep the first occurrence of each segment. */
function dedupeBySegment(nodes: TreeNode[]): TreeNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.segment)) return false;
    seen.add(node.segment);
    return true;
  });
}

/** Browse depth: jurisdiction (1), doc type (2), title (3). */
export const MAX_BROWSE_SEGMENTS = 3;

export async function getBrowsePageData(
  segments: string[],
  page = 0
): Promise<BrowsePageData | "unavailable" | null> {
  if (segments.length === 0 || segments.length > MAX_BROWSE_SEGMENTS) {
    return null;
  }
  const resolved = resolveAxiomPath(segments);
  if (!resolved.jurisdiction) return null;

  // A backend failure must not become a 404: transient
  // navigation-index outages are common enough that v1 had an error
  // banner + retry for exactly this.
  const result = await loadTreeNodes({
    dbJurisdictionId: resolved.jurisdiction.slug,
    ruleSegments: resolved.ruleSegments,
    hasCitationPaths: resolved.jurisdiction.hasCitationPaths ?? true,
    encodedOnly: false,
    page,
  }).catch(() => "unavailable" as const);
  if (result === "unavailable") return "unavailable";
  if (!result) return null;

  // Mis-parented index rows (a section row claiming the doc type as
  // its parent — another #400-class duplication artifact) betray
  // themselves by their own citation path not matching the position
  // they'd occupy here.
  const expectedPrefix = segments.join("/");
  const positioned = result.nodes
    .filter((node) => {
      const path = node.rule?.citation_path;
      return !path || path === `${expectedPrefix}/${node.segment}`;
    })
    .map((node) => {
      // Container labels citing a section ("26 U.S.C. § 85 …" as the
      // label for all of Title 26) are index corruption from the
      // duplicate-row class; fall back to a generic title.
      if (segments[1] === "statute" && /§/.test(node.label)) {
        return { ...node, label: `Title ${node.segment}` };
      }
      return node;
    });

  return {
    segments,
    jurisdictionLabel: resolved.jurisdiction.label,
    breadcrumbs: buildBreadcrumbs(segments),
    currentRule: result.currentRule ?? null,
    nodes: dedupeBySegment(positioned.filter((n) => !isPlumbingNode(n))),
    hasMore: result.hasMore,
    page,
  };
}
