import { supabaseCorpus, type Rule } from "@/lib/supabase";
import type { TreeNode } from "@/lib/tree-data";
import type {
  NavigationDocTypeResult,
  NavigationIndexChildrenParams,
  NavigationIndexChildrenResult,
  NavigationNodeRow,
} from "./types";

const NAVIGATION_PAGE_SIZE = 100;
const NAVIGATION_QUERY_TIMEOUT_MS = 1500;
const DOC_TYPE_DISCOVERY_LIMIT = 5000;

export class NavigationIndexUnavailableError extends Error {
  constructor(message = "Navigation index is temporarily unavailable.") {
    super(message);
    this.name = "NavigationIndexUnavailableError";
  }
}

export class NavigationIndexMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NavigationIndexMissingError";
  }
}

export async function getNavigationDocTypes(
  jurisdiction: string,
  encodedOnly: boolean
): Promise<NavigationDocTypeResult> {
  let query = supabaseCorpus
    .from("navigation_nodes")
    .select("doc_type,path,has_rulespec,encoded_descendant_count")
    .eq("jurisdiction", jurisdiction)
    .is("parent_path", null)
    .order("doc_type")
    .limit(DOC_TYPE_DISCOVERY_LIMIT);

  if (encodedOnly) {
    query = query.or("has_rulespec.eq.true,encoded_descendant_count.gt.0");
  }

  const result = await withTimeout(query, NAVIGATION_QUERY_TIMEOUT_MS);
  if (!result) throw new NavigationIndexUnavailableError();
  if (result.error) throw new NavigationIndexUnavailableError();

  const docTypes = Array.from(
    new Set(
      ((result.data ?? []) as Array<{
        doc_type?: string | null;
        path?: string | null;
      }>)
        .map((row) => navigationRootSegment(row.path, row.doc_type))
        .filter((docType): docType is string => Boolean(docType))
    )
  ).sort();

  if (docTypes.length === 0 && !encodedOnly) {
    throw new NavigationIndexMissingError(
      `Navigation index has no document types for ${jurisdiction}.`
    );
  }

  return { docTypes };
}

export async function getNavigationIndexChildren({
  jurisdiction,
  docType,
  parentPath,
  encodedOnly,
  page,
}: NavigationIndexChildrenParams): Promise<NavigationIndexChildrenResult> {
  const from = page * NAVIGATION_PAGE_SIZE;
  const to = from + NAVIGATION_PAGE_SIZE - 1;

  let query = supabaseCorpus
    .from("navigation_nodes")
    .select("*", { count: "exact" })
    .eq("jurisdiction", jurisdiction)
    .eq("doc_type", docType)
    .order("sort_key")
    .range(from, to);

  query =
    parentPath === null
      ? query.is("parent_path", null)
      : query.eq("parent_path", parentPath);

  if (encodedOnly) {
    query = query.or("has_rulespec.eq.true,encoded_descendant_count.gt.0");
  }

  const result = await withTimeout(query, NAVIGATION_QUERY_TIMEOUT_MS);
  if (!result) throw new NavigationIndexUnavailableError();
  if (result.error) throw new NavigationIndexUnavailableError();

  const rows = (result.data ?? []) as NavigationNodeRow[];
  const total = result.count ?? rows.length;

  return {
    rows,
    total,
    hasMore: (page + 1) * NAVIGATION_PAGE_SIZE < total,
  };
}

export async function getNavigationIndexNode(
  path: string
): Promise<NavigationNodeRow | null> {
  const result = await withTimeout(
    supabaseCorpus
      .from("navigation_nodes")
      .select("*")
      .eq("path", path)
      .maybeSingle(),
    NAVIGATION_QUERY_TIMEOUT_MS
  );
  if (!result) throw new NavigationIndexUnavailableError();
  if (result.error) throw new NavigationIndexUnavailableError();
  return (result.data as NavigationNodeRow | null) ?? null;
}

export async function getProvisionForNavigationNode(
  node: NavigationNodeRow
): Promise<Rule | null> {
  let query = supabaseCorpus.from("provisions").select("*");
  query = node.provision_id
    ? query.eq("id", node.provision_id)
    : query.eq("citation_path", node.path);

  const result = await withTimeout(
    query.maybeSingle(),
    NAVIGATION_QUERY_TIMEOUT_MS
  );
  if (!result) throw new NavigationIndexUnavailableError();
  if (result.error) throw new NavigationIndexUnavailableError();
  return (result.data as Rule | null) ?? null;
}

export function navigationDocTypeToTreeNode(segment: string): TreeNode {
  return {
    segment,
    label:
      segment === "statute"
        ? "Statutes"
        : segment === "regulation"
          ? "Regulations"
          : formatGenericSegmentLabel(segment),
    hasChildren: true,
    nodeType: "doc_type",
  };
}

export function navigationRowToTreeNode(row: NavigationNodeRow): TreeNode {
  const rule = navigationRowToMinimalRule(row);
  return {
    segment: row.segment,
    label: row.label || row.segment,
    hasChildren: row.has_children,
    childCount: row.child_count > 0 ? row.child_count : undefined,
    rule,
    nodeType: "section",
    hasRuleSpec: row.has_rulespec || row.encoded_descendant_count > 0,
  };
}

function navigationRowToMinimalRule(row: NavigationNodeRow): Rule {
  const now = row.updated_at ?? row.created_at ?? "";
  return {
    id: row.provision_id ?? row.id,
    jurisdiction: row.jurisdiction,
    doc_type: row.doc_type,
    parent_id: null,
    level: row.depth,
    ordinal: null,
    heading: row.label,
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: null,
    citation_path: row.citation_path ?? row.path,
    rulespec_path: null,
    has_rulespec: row.has_rulespec,
    created_at: now,
    updated_at: now,
  };
}

function formatGenericSegmentLabel(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function navigationRootSegment(
  path: string | null | undefined,
  docType: string | null | undefined
): string | null {
  const parts = path?.split("/") ?? [];
  if (parts.length === 2) return parts[1] || null;
  return docType || null;
}

function withTimeout<T>(
  work: PromiseLike<T> | T,
  ms: number
): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    Promise.resolve(work).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}
