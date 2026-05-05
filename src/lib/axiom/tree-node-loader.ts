import type { Rule } from "@/lib/supabase";
import type { TreeNode } from "@/lib/tree-data";
import {
  getNavigationDocTypes,
  getNavigationIndexChildren,
  getNavigationIndexNode,
  getProvisionForNavigationNode,
  navigationDocTypeToTreeNode,
  navigationRowToTreeNode,
  NavigationIndexMissingError,
} from "@/lib/axiom/navigation-index/read";
import type { NavigationNodeRow } from "@/lib/axiom/navigation-index/types";

export interface TreeNodeLoadParams {
  dbJurisdictionId: string;
  ruleSegments: string[];
  hasCitationPaths: boolean;
  encodedOnly: boolean;
  page: number;
  encodedPaths?: Set<string>;
}

export interface TreeNodeLoadResult {
  nodes: TreeNode[];
  hasMore: boolean;
  currentRule?: Rule | null;
  leafRule?: Rule | null;
  encodedPaths?: Set<string>;
}

/**
 * Load browse-tree nodes from the precomputed corpus.navigation_nodes index.
 *
 * The legal text still lives in corpus.provisions. This loader only uses
 * provisions for the exact current/leaf rule detail after the navigation
 * index has resolved the route. It intentionally does not fall back to the
 * old broad provisions scans; missing index coverage should be visible.
 */
export async function loadTreeNodes({
  dbJurisdictionId,
  ruleSegments: segs,
  encodedOnly,
  page,
  encodedPaths: existingEncodedPaths,
}: TreeNodeLoadParams): Promise<TreeNodeLoadResult> {
  if (segs.length === 0) {
    const { docTypes } = await getNavigationDocTypes(
      dbJurisdictionId,
      encodedOnly
    );
    return {
      nodes: docTypes.map(navigationDocTypeToTreeNode),
      hasMore: false,
      encodedPaths: existingEncodedPaths,
    };
  }

  const [docType] = segs;
  const parentPath =
    segs.length === 1 ? null : navigationPath(dbJurisdictionId, segs);
  const childResult = await getNavigationIndexChildren({
    jurisdiction: dbJurisdictionId,
    docType,
    parentPath,
    encodedOnly,
    page,
  });

  if (segs.length === 1) {
    if (childResult.rows.length === 0 && page === 0) {
      if (encodedOnly) {
        return {
          nodes: [],
          hasMore: false,
          encodedPaths: existingEncodedPaths,
        };
      }
      throw new NavigationIndexMissingError(
        `Navigation index has no rows for ${dbJurisdictionId}/${docType}.`
      );
    }
    return {
      nodes: childResult.rows.map(navigationRowToTreeNode),
      hasMore: childResult.hasMore,
      encodedPaths: existingEncodedPaths,
    };
  }

  const currentPath = navigationPath(dbJurisdictionId, segs);
  const currentNode = await getNavigationIndexNode(currentPath);

  if (childResult.rows.length === 0) {
    if (!currentNode) {
      throw new NavigationIndexMissingError(
        `Navigation index has no node for ${currentPath}.`
      );
    }
    const rule = await requireProvisionForNode(currentNode);
    if (currentNode.has_children) {
      return {
        nodes: [],
        hasMore: false,
        currentRule: rule,
        encodedPaths: existingEncodedPaths,
      };
    }
    return {
      nodes: [],
      hasMore: false,
      leafRule: rule,
      encodedPaths: existingEncodedPaths,
    };
  }

  const currentRule = currentNode
    ? await getProvisionForNavigationNode(currentNode)
    : null;

  return {
    nodes: childResult.rows.map(navigationRowToTreeNode),
    hasMore: childResult.hasMore,
    currentRule,
    encodedPaths: existingEncodedPaths,
  };
}

function navigationPath(jurisdiction: string, ruleSegments: string[]): string {
  return `${jurisdiction}/${ruleSegments.join("/")}`;
}

async function requireProvisionForNode(
  node: NavigationNodeRow
): Promise<Rule> {
  const rule = await getProvisionForNavigationNode(node);
  if (!rule) {
    throw new NavigationIndexMissingError(
      `Navigation node ${node.path} does not resolve to a corpus provision.`
    );
  }
  return rule;
}
