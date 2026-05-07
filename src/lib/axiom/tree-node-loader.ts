import type { Rule } from "@/lib/supabase";
import type { TreeNode } from "@/lib/tree-data";
import {
  listEncodedFiles,
  type EncodedFile,
} from "@/lib/axiom/rulespec/repo-listing";
import {
  synthesisedRuleId,
  synthesiseRuleFromCitationPath,
} from "@/lib/axiom/rulespec/synth-rule";
import {
  getNavigationDocTypes,
  getNavigationIndexChildren,
  getNavigationIndexNode,
  getNavigationIndexPrefixRows,
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
 * old broad provisions scans; source-index gaps should stay visible. The
 * one exception is RuleSpec-only branches from the canonical rules-* repos:
 * those are surfaced as synthetic encoded leaves so checked-in encodings are
 * not hidden just because the source corpus has not ingested the document.
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
    const encodedDocTypes = await getEncodedDocTypes(dbJurisdictionId);
    return {
      nodes: mergeDocTypes(docTypes, encodedDocTypes).map(
        navigationDocTypeToTreeNode
      ),
      hasMore: false,
      encodedPaths: existingEncodedPaths,
    };
  }

  const [docType] = segs;
  const scopePath = navigationPath(dbJurisdictionId, [docType]);
  const scopeRoot = await getNavigationIndexNode(scopePath);
  const queryDocType = scopeRoot?.doc_type ?? docType;
  const parentPath =
    segs.length === 1
      ? scopeRoot?.has_children
        ? scopePath
        : null
      : navigationPath(dbJurisdictionId, segs);
  const childResult = await getNavigationIndexChildren({
    jurisdiction: dbJurisdictionId,
    docType: queryDocType,
    parentPath,
    encodedOnly,
    page,
  });

  if (segs.length === 1) {
    if (childResult.rows.length === 0 && page === 0) {
      const rulespecOnly = await loadRulespecOnlyTreeNodes(
        dbJurisdictionId,
        segs,
        page
      );
      if (rulespecOnly) return rulespecOnly;
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
      const sparsePrefix = await loadSparsePrefixTreeNodes({
        jurisdiction: dbJurisdictionId,
        docType: queryDocType,
        currentPath,
        segs,
        encodedOnly,
      });
      if (sparsePrefix) return sparsePrefix;
      const rulespecOnly = await loadRulespecOnlyTreeNodes(
        dbJurisdictionId,
        segs,
        page
      );
      if (rulespecOnly) return rulespecOnly;
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

async function getEncodedDocTypes(jurisdiction: string): Promise<string[]> {
  const files = await listEncodedFiles(jurisdiction);
  return Array.from(
    new Set(
      files
        .map((file) => file.citationPath.split("/")[1])
        .filter((docType): docType is string => Boolean(docType))
    )
  );
}

function mergeDocTypes(docTypes: string[], encodedDocTypes: string[]): string[] {
  return Array.from(new Set([...docTypes, ...encodedDocTypes])).sort();
}

async function loadSparsePrefixTreeNodes({
  jurisdiction,
  docType,
  currentPath,
  segs,
  encodedOnly,
}: {
  jurisdiction: string;
  docType: string;
  currentPath: string;
  segs: string[];
  encodedOnly: boolean;
}): Promise<TreeNodeLoadResult | null> {
  const rows = await getNavigationIndexPrefixRows({
    jurisdiction,
    docType,
    pathPrefix: currentPath,
    encodedOnly,
  });
  if (rows.length === 0) return null;

  return {
    nodes: sparsePrefixChildren(jurisdiction, segs, rows),
    hasMore: false,
    currentRule: null,
  };
}

function sparsePrefixChildren(
  jurisdiction: string,
  segs: string[],
  rows: NavigationNodeRow[]
): TreeNode[] {
  const childIndex = segs.length + 1;
  const bySegment = new Map<
    string,
    {
      exact?: NavigationNodeRow;
      descendantCount: number;
      hasDeeper: boolean;
    }
  >();

  for (const row of rows) {
    const parts = row.path.split("/");
    const segment = parts[childIndex];
    if (!segment) continue;
    const entry =
      bySegment.get(segment) ??
      {
        descendantCount: 0,
        hasDeeper: false,
      };
    entry.descendantCount += 1;
    if (parts.length === childIndex + 1) entry.exact = row;
    if (parts.length > childIndex + 1) entry.hasDeeper = true;
    bySegment.set(segment, entry);
  }

  return Array.from(bySegment.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([segment, entry]) => {
      if (entry.exact && !entry.hasDeeper) {
        return navigationRowToTreeNode(entry.exact);
      }
      const exactNode = entry.exact
        ? navigationRowToTreeNode(entry.exact)
        : null;
      return {
        segment,
        label: exactNode?.label ?? formatRulespecOnlySegment(segment),
        hasChildren: true,
        childCount: entry.descendantCount,
        nodeType: "section",
        ...(exactNode?.rule && { rule: exactNode.rule }),
        ...(exactNode?.hasRuleSpec && { hasRuleSpec: true }),
      } satisfies TreeNode;
    });
}

async function loadRulespecOnlyTreeNodes(
  jurisdiction: string,
  segs: string[],
  page: number
): Promise<TreeNodeLoadResult | null> {
  if (page > 0 || segs.length === 0) return null;
  const files = await listEncodedFiles(jurisdiction);
  if (files.length === 0) return null;

  const currentPath = navigationPath(jurisdiction, segs);
  const exact = files.find((file) => file.citationPath === currentPath);
  const descendants = files.filter((file) =>
    file.citationPath.startsWith(`${currentPath}/`)
  );

  if (!exact && descendants.length === 0) return null;

  if (descendants.length === 0 && exact) {
    const leafRule = await synthesiseRuleFromCitationPath(
      jurisdiction,
      currentPath
    );
    if (!leafRule) return null;
    return {
      nodes: [],
      hasMore: false,
      leafRule,
    };
  }

  return {
    nodes: rulespecOnlyChildren(jurisdiction, segs, descendants),
    hasMore: false,
    currentRule: null,
  };
}

function rulespecOnlyChildren(
  jurisdiction: string,
  segs: string[],
  descendants: EncodedFile[]
): TreeNode[] {
  const childIndex = segs.length + 1;
  const bySegment = new Map<
    string,
    {
      citationPath: string;
      exact?: EncodedFile;
      descendantCount: number;
      hasDeeper: boolean;
    }
  >();

  for (const file of descendants) {
    const parts = file.citationPath.split("/");
    const segment = parts[childIndex];
    if (!segment) continue;
    const citationPath = [jurisdiction, ...segs, segment].join("/");
    const entry =
      bySegment.get(segment) ??
      {
        citationPath,
        descendantCount: 0,
        hasDeeper: false,
      };
    entry.descendantCount += 1;
    if (parts.length === childIndex + 1) entry.exact = file;
    if (parts.length > childIndex + 1) entry.hasDeeper = true;
    bySegment.set(segment, entry);
  }

  return Array.from(bySegment.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([segment, entry]) => {
      const exactOnly = Boolean(entry.exact) && !entry.hasDeeper;
      return {
        segment,
        label: formatRulespecOnlySegment(segment),
        hasChildren: entry.hasDeeper,
        childCount: entry.hasDeeper ? entry.descendantCount : undefined,
        nodeType: "section",
        hasRuleSpec: true,
        ...(exactOnly && {
          rule: rulespecOnlyMinimalRule(
            jurisdiction,
            [...segs, segment],
            entry.citationPath,
            entry.exact
          ),
        }),
      } satisfies TreeNode;
    });
}

function rulespecOnlyMinimalRule(
  jurisdiction: string,
  segs: string[],
  citationPath: string,
  file?: EncodedFile
): Rule {
  const now = "";
  return {
    id: synthesisedRuleId(citationPath),
    jurisdiction,
    doc_type: segs[0] ?? "policy",
    parent_id: null,
    level: segs.length,
    ordinal: null,
    heading: formatRulespecOnlySegment(segs[segs.length - 1] ?? citationPath),
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: null,
    citation_path: citationPath,
    rulespec_path: file?.filePath ?? null,
    has_rulespec: true,
    created_at: now,
    updated_at: now,
  };
}

function formatRulespecOnlySegment(segment: string): string {
  const acronyms = new Set(["fns", "irs", "usda", "snap", "fy", "cola"]);
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) =>
      acronyms.has(part.toLowerCase())
        ? part.toUpperCase()
        : /^fy\d+$/i.test(part)
          ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}
