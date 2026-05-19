import { supabaseCorpus, type Rule } from "@/lib/supabase";
import type { TreeNode } from "@/lib/tree-data";
import type {
  NavigationDocTypeResult,
  NavigationIndexChildrenParams,
  NavigationIndexChildrenResult,
  NavigationIndexPrefixRowsParams,
  NavigationNodeRow,
} from "./types";

const NAVIGATION_PAGE_SIZE = 100;
const NAVIGATION_QUERY_TIMEOUT_MS = 5000;
const DOC_TYPE_DISCOVERY_LIMIT = 5000;
const SUPABASE_REST_MAX_ROWS = 1000;
const DOC_TYPE_DISCOVERY_CANDIDATES = [
  "form",
  "guidance",
  "legislation",
  "policy",
  "regulation",
  "rulemaking",
  "statute",
];

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

  const rows = (result.data ?? []) as Array<{
    doc_type?: string | null;
    path?: string | null;
  }>;
  const docTypeSet = new Set(
    rows
      .map((row) => navigationRootSegment(row.path, row.doc_type))
      .filter((docType): docType is string => Boolean(docType))
  );

  if (rows.length >= SUPABASE_REST_MAX_ROWS) {
    for (const docType of await probeNavigationDocTypes(
      jurisdiction,
      encodedOnly
    )) {
      docTypeSet.add(docType);
    }
  }

  const docTypes = Array.from(docTypeSet).sort();

  if (docTypes.length === 0 && !encodedOnly) {
    throw new NavigationIndexMissingError(
      `Navigation index has no document types for ${jurisdiction}.`
    );
  }

  return { docTypes };
}

async function probeNavigationDocTypes(
  jurisdiction: string,
  encodedOnly: boolean
): Promise<string[]> {
  return (
    await Promise.all(
      DOC_TYPE_DISCOVERY_CANDIDATES.map(async (docType) => {
        let query = supabaseCorpus
          .from("navigation_nodes")
          .select("doc_type,path,has_rulespec,encoded_descendant_count")
          .eq("jurisdiction", jurisdiction)
          .eq("doc_type", docType)
          .is("parent_path", null)
          .limit(1);

        if (encodedOnly) {
          query = query.or("has_rulespec.eq.true,encoded_descendant_count.gt.0");
        }

        const result = await withTimeout(query, NAVIGATION_QUERY_TIMEOUT_MS);
        if (!result) throw new NavigationIndexUnavailableError();
        if (result.error) throw new NavigationIndexUnavailableError();

        const [row] = (result.data ?? []) as Array<{
          doc_type?: string | null;
          path?: string | null;
        }>;
        return row ? navigationRootSegment(row.path, row.doc_type) : null;
      })
    )
  ).filter((docType): docType is string => Boolean(docType));
}

export async function getProvisionCoveredDocTypes(
  jurisdiction: string,
  docTypes: string[]
): Promise<Set<string>> {
  if (docTypes.length === 0) return new Set();

  const covered = new Set<string>();

  const checks = await Promise.all(
    docTypes.map(async (docType) => {
      const docTypeResult = await withTimeout(
        supabaseCorpus
          .from("current_provisions")
          .select("doc_type")
          .eq("jurisdiction", jurisdiction)
          .eq("doc_type", docType)
          .limit(1),
        NAVIGATION_QUERY_TIMEOUT_MS
      );
      if (!docTypeResult) throw new NavigationIndexUnavailableError();
      if (docTypeResult.error) throw new NavigationIndexUnavailableError();

      const docTypeRows = (docTypeResult.data ?? []) as Array<{
        doc_type: string | null;
      }>;
      if (docTypeRows.some((row) => row.doc_type === docType)) {
        return docType;
      }

      const path = `${jurisdiction}/${docType}`;
      const result = await withTimeout(
        supabaseCorpus
          .from("current_provisions")
          .select("citation_path")
          .eq("jurisdiction", jurisdiction)
          .or(
            `citation_path.eq.${path},and(citation_path.gte.${path}/,citation_path.lt.${path}~)`
          )
          .limit(1),
        NAVIGATION_QUERY_TIMEOUT_MS
      );
      if (!result) throw new NavigationIndexUnavailableError();
      if (result.error) throw new NavigationIndexUnavailableError();

      const rows = (result.data ?? []) as Array<{
        citation_path: string | null;
      }>;
      return rows.some((row) => row.citation_path?.split("/")[1] === docType)
        ? docType
        : null;
    })
  );

  for (const docType of checks) {
    if (docType) covered.add(docType);
  }
  return covered;
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

export async function getNavigationIndexPrefixRows({
  jurisdiction,
  docType,
  pathPrefix,
  encodedOnly,
}: NavigationIndexPrefixRowsParams): Promise<NavigationNodeRow[]> {
  let query = supabaseCorpus
    .from("navigation_nodes")
    .select("*")
    .eq("jurisdiction", jurisdiction)
    .eq("doc_type", docType)
    .gte("path", `${pathPrefix}/`)
    .lt("path", `${pathPrefix}~`)
    .order("path")
    .limit(DOC_TYPE_DISCOVERY_LIMIT);

  if (encodedOnly) {
    query = query.or("has_rulespec.eq.true,encoded_descendant_count.gt.0");
  }

  const result = await withTimeout(query, NAVIGATION_QUERY_TIMEOUT_MS);
  if (!result) throw new NavigationIndexUnavailableError();
  if (result.error) throw new NavigationIndexUnavailableError();
  return (result.data ?? []) as NavigationNodeRow[];
}

export async function getProvisionForNavigationNode(
  node: NavigationNodeRow
): Promise<Rule | null> {
  let query = supabaseCorpus.from("current_provisions").select("*");
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

export async function getResolvableNavigationNodeIds(
  rows: NavigationNodeRow[]
): Promise<Set<string>> {
  if (rows.length === 0) return new Set();

  const provisionIds = Array.from(
    new Set(
      rows
        .map((row) => row.provision_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const citationPaths = Array.from(
    new Set(
      rows
        .map((row) => row.citation_path ?? row.path)
        .filter((path): path is string => Boolean(path))
    )
  );
  const matchedProvisionIds = new Set<string>();
  const matchedCitationPaths = new Set<string>();

  if (provisionIds.length > 0) {
    const result = await withTimeout(
      supabaseCorpus
        .from("current_provisions")
        .select("id")
        .in("id", provisionIds),
      NAVIGATION_QUERY_TIMEOUT_MS
    );
    if (!result) throw new NavigationIndexUnavailableError();
    if (result.error) throw new NavigationIndexUnavailableError();
    for (const row of (result.data ?? []) as Array<{ id: string | null }>) {
      if (row.id) matchedProvisionIds.add(row.id);
    }
  }

  if (citationPaths.length > 0) {
    const citationFilters = [
      ...citationPaths.map((path) => `citation_path.eq.${path}`),
      ...rows
        .filter((row) => row.has_children)
        .map((row) => {
          const path = row.citation_path ?? row.path;
          return `and(citation_path.gte.${path}/,citation_path.lt.${path}~)`;
        }),
    ].join(",");
    const result = await withTimeout(
      supabaseCorpus
        .from("current_provisions")
        .select("citation_path")
        .or(citationFilters),
      NAVIGATION_QUERY_TIMEOUT_MS
    );
    if (!result) throw new NavigationIndexUnavailableError();
    if (result.error) throw new NavigationIndexUnavailableError();
    for (const row of (result.data ?? []) as Array<{
      citation_path: string | null;
    }>) {
      if (row.citation_path) matchedCitationPaths.add(row.citation_path);
    }
  }

  const resolvable = new Set<string>();
  for (const row of rows) {
    const citationPath = row.citation_path ?? row.path;
    if (
      (row.provision_id && matchedProvisionIds.has(row.provision_id)) ||
      matchedCitationPaths.has(citationPath) ||
      Array.from(matchedCitationPaths).some((path) =>
        path.startsWith(`${citationPath}/`)
      )
    ) {
      resolvable.add(row.id);
    }
  }
  return resolvable;
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
