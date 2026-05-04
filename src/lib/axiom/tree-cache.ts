import type { TreeNode } from "@/lib/tree-data";
import type { Rule } from "@/lib/supabase";

export interface InitialTreeNodesState {
  cacheKey: string;
  nodes: TreeNode[];
  hasMore: boolean;
  currentRule: Rule | null;
  leafRule: Rule | null;
}

export function treeNodesCacheKey(
  dbJurisdictionId: string,
  ruleSegments: string[],
  encodedOnly: boolean = false
): string {
  return `${dbJurisdictionId}/${ruleSegments.join("/")}${
    encodedOnly ? ":encoded" : ""
  }`;
}
