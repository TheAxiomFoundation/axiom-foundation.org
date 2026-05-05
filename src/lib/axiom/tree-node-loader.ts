import type { Rule } from "@/lib/supabase";
import type { TreeNode, TreeResult } from "@/lib/tree-data";
import {
  getActNodes,
  getChildrenByParentId,
  getDocTypeNodes,
  getEncodedPaths,
  getRuleById,
  getSectionNodes,
  getTitleNodes,
  isUUID,
} from "@/lib/tree-data";
import { synthesiseRuleFromCitationPath } from "@/lib/axiom/rulespec/synth-rule";

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

export async function loadTreeNodes({
  dbJurisdictionId,
  ruleSegments: segs,
  hasCitationPaths,
  encodedOnly,
  page,
  encodedPaths: existingEncodedPaths,
}: TreeNodeLoadParams): Promise<TreeNodeLoadResult> {
  if (segs.length === 0) {
    if (hasCitationPaths) {
      const nodes = await getDocTypeNodes(dbJurisdictionId);
      return { nodes, hasMore: false, encodedPaths: existingEncodedPaths };
    }
    const r: TreeResult = await getActNodes(dbJurisdictionId, page);
    return {
      nodes: r.nodes,
      hasMore: r.hasMore,
      encodedPaths: existingEncodedPaths,
    };
  }

  if (hasCitationPaths) {
    let encodedPaths = existingEncodedPaths;
    if (encodedOnly && !encodedPaths) {
      encodedPaths = await getEncodedPaths(dbJurisdictionId);
    }

    if (segs.length === 1) {
      const nodes = await getTitleNodes(
        dbJurisdictionId,
        segs[0],
        encodedPaths,
        encodedOnly
      );
      return { nodes, hasMore: false, encodedPaths };
    }

    const pathPrefix = `${dbJurisdictionId}/${segs.join("/")}`;
    const r: TreeResult = await getSectionNodes(
      pathPrefix,
      page,
      encodedPaths,
      encodedOnly
    );
    if (r.leafRule) {
      return {
        nodes: [],
        hasMore: false,
        leafRule: r.leafRule,
        encodedPaths,
      };
    }
    if (r.nodes.length === 0 && !r.currentRule && segs.length >= 2) {
      const synth = await synthesiseRuleFromCitationPath(
        dbJurisdictionId,
        pathPrefix
      );
      if (synth) {
        return {
          nodes: [],
          hasMore: false,
          leafRule: synth,
          encodedPaths,
        };
      }
    }

    return {
      nodes: r.nodes,
      hasMore: r.hasMore,
      currentRule: r.currentRule ?? null,
      encodedPaths,
    };
  }

  const lastSegment = segs[segs.length - 1];
  if (isUUID(lastSegment)) {
    const r: TreeResult = await getChildrenByParentId(lastSegment, page);
    if (r.nodes.length === 0) {
      const rule = await getRuleById(lastSegment);
      return {
        nodes: [],
        hasMore: false,
        leafRule: rule,
        encodedPaths: existingEncodedPaths,
      };
    }
    return {
      nodes: r.nodes,
      hasMore: r.hasMore,
      encodedPaths: existingEncodedPaths,
    };
  }

  return { nodes: [], hasMore: false, encodedPaths: existingEncodedPaths };
}
