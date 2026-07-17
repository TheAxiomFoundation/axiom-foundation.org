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
}

/** Browse depth: jurisdiction (1), doc type (2), title (3). */
export const MAX_BROWSE_SEGMENTS = 3;

export async function getBrowsePageData(
  segments: string[]
): Promise<BrowsePageData | null> {
  if (segments.length === 0 || segments.length > MAX_BROWSE_SEGMENTS) {
    return null;
  }
  const resolved = resolveAxiomPath(segments);
  if (!resolved.jurisdiction) return null;

  const result = await loadTreeNodes({
    dbJurisdictionId: resolved.jurisdiction.slug,
    ruleSegments: resolved.ruleSegments,
    hasCitationPaths: resolved.jurisdiction.hasCitationPaths ?? true,
    encodedOnly: false,
    page: 0,
  }).catch(() => null);
  if (!result) return null;

  return {
    segments,
    jurisdictionLabel: resolved.jurisdiction.label,
    breadcrumbs: buildBreadcrumbs(segments),
    currentRule: result.currentRule ?? null,
    nodes: result.nodes,
    hasMore: result.hasMore,
  };
}
