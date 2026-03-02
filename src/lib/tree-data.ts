import { supabase, supabaseArch, type Rule } from "@/lib/supabase";
import { naturalCompare } from "@/lib/natural-sort";

export type NodeType =
  | "jurisdiction"
  | "doc_type"
  | "title"
  | "section"
  | "act";

export interface TreeNode {
  /** URL segment: "us", "statute", "26", "1" */
  segment: string;
  /** Display label: "United States", "Title 26", "§ 1 — Tax imposed" */
  label: string;
  hasChildren: boolean;
  /** For count badges */
  childCount?: number;
  /** The underlying DB rule, if this node maps to one */
  rule?: Rule;
  nodeType: NodeType;
  /** Whether this node has a RAC encoding in encoding_runs */
  hasRac?: boolean;
}

export interface TreeResult {
  nodes: TreeNode[];
  hasMore: boolean;
  total: number;
  /** Set when a citation-path resolves to a rule with no children (leaf node) */
  leafRule?: Rule;
}

// ---- Jurisdiction config ----

interface JurisdictionConfig {
  id: string;
  label: string;
  hasCitationPaths: boolean;
}

export const JURISDICTIONS: JurisdictionConfig[] = [
  { id: "us", label: "United States", hasCitationPaths: true },
  { id: "uk", label: "United Kingdom", hasCitationPaths: false },
  { id: "canada", label: "Canada", hasCitationPaths: false },
  { id: "us-oh", label: "Ohio", hasCitationPaths: true },
];

export function getJurisdiction(id: string): JurisdictionConfig | undefined {
  return JURISDICTIONS.find((j) => j.id === id);
}

// ---- Pagination ----

const PAGE_SIZE = 100;

// ---- Query functions ----

/* v8 ignore start -- Supabase queries tested via integration/e2e */

function hasNextPage(page: number, total: number): boolean {
  return (page + 1) * PAGE_SIZE < total;
}

export async function getJurisdictionNodes(): Promise<TreeNode[]> {
  const counts = await Promise.all(
    JURISDICTIONS.map(async (j) => {
      const { count } = await supabaseArch
        .from("rules")
        .select("*", { count: "exact", head: true })
        .eq("jurisdiction", j.id);
      return { ...j, count: count || 0 };
    })
  );

  return counts
    .filter((j) => j.count > 0)
    .map((j) => ({
      segment: j.id,
      label: j.label,
      hasChildren: true,
      childCount: j.count,
      nodeType: "jurisdiction" as const,
    }));
}

export async function getDocTypeNodes(
  _jurisdiction: string
): Promise<TreeNode[]> {
  return [
    {
      segment: "statute",
      label: "Statutes",
      hasChildren: true,
      nodeType: "doc_type" as const,
    },
  ];
}

export async function getTitleNodes(
  jurisdiction: string,
  _docType: string
): Promise<TreeNode[]> {
  const { data } = await supabaseArch
    .from("rules")
    .select("citation_path")
    .eq("jurisdiction", jurisdiction)
    .not("citation_path", "is", null)
    .is("parent_id", null)
    .limit(1000);

  if (!data || data.length === 0) return [];

  const titleSet = new Set<string>();
  for (const row of data) {
    if (!row.citation_path) continue;
    const parts = row.citation_path.split("/");
    if (parts.length >= 3) {
      titleSet.add(parts[2]);
    }
  }

  const titles = Array.from(titleSet).sort(naturalCompare);

  const nodes = await Promise.all(
    titles.map(async (title) => {
      const prefix = `${jurisdiction}/statute/${title}`;
      const { count } = await supabaseArch
        .from("rules")
        .select("*", { count: "exact", head: true })
        .like("citation_path", `${prefix}/%`)
        .is("parent_id", null);

      return {
        segment: title,
        label: `Title ${title}`,
        hasChildren: true,
        childCount: count || 0,
        nodeType: "title" as const,
      };
    })
  );

  return nodes;
}

export async function getSectionNodes(
  pathPrefix: string,
  page: number = 0,
  encodedPaths?: Set<string>
): Promise<TreeResult> {
  const { data: parentRule } = await supabaseArch
    .from("rules")
    .select("*")
    .eq("citation_path", pathPrefix)
    .single();

  if (parentRule) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabaseArch
      .from("rules")
      .select("*", { count: "exact" })
      .eq("parent_id", parentRule.id)
      .order("ordinal")
      .range(from, to);

    const rules = (data || []) as Rule[];
    const total = count || 0;

    // Leaf node: parentRule exists but has no children
    if (total === 0) {
      return {
        nodes: [],
        hasMore: false,
        total: 0,
        leafRule: parentRule as Rule,
      };
    }

    return {
      nodes: rules.map((r) => ruleToSectionNode(r, encodedPaths)),
      hasMore: hasNextPage(page, total),
      total,
    };
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count } = await supabaseArch
    .from("rules")
    .select("*", { count: "exact" })
    .like("citation_path", `${pathPrefix}/%`)
    .is("parent_id", null)
    .order("ordinal")
    .range(from, to);

  const rules = (data || []) as Rule[];
  const total = count || 0;

  const expectedDepth = pathPrefix.split("/").length + 1;
  const filtered = rules.filter((r) => {
    if (!r.citation_path) return false;
    // Count slashes + 1 instead of splitting to avoid array allocations
    let depth = 1;
    for (let i = 0; i < r.citation_path.length; i++) {
      if (r.citation_path[i] === "/") depth++;
    }
    return depth === expectedDepth;
  });

  return {
    nodes: filtered.map((r) => ruleToSectionNode(r)),
    hasMore: hasNextPage(page, total),
    total,
  };
}

/**
 * Fetch all encoded file_paths from encoding_runs and convert to citation paths.
 * e.g. "statute/26/1/j/2.rac" → "statute/26/1/j/2"
 */
export async function getEncodedPaths(): Promise<Set<string>> {
  const { data } = await supabase
    .from("encoding_runs")
    .select("file_path");

  const paths = new Set<string>();
  if (data) {
    for (const row of data) {
      if (row.file_path) {
        // Strip .rac suffix
        paths.add(row.file_path.replace(/\.rac$/, ""));
      }
    }
  }
  return paths;
}

function ruleToSectionNode(rule: Rule, encodedPaths?: Set<string>): TreeNode {
  const segment = rule.citation_path
    ? rule.citation_path.split("/").pop() || rule.id
    : rule.id;

  const label = rule.heading
    ? `§ ${segment} — ${rule.heading}`
    : `§ ${segment}`;

  // Check if this rule's citation_path (minus jurisdiction prefix) matches an encoded path
  let hasRac = false;
  if (encodedPaths && rule.citation_path) {
    const parts = rule.citation_path.split("/");
    // Strip jurisdiction prefix (e.g. "us/statute/26/1" → "statute/26/1")
    const withoutJurisdiction = parts.slice(1).join("/");
    hasRac = encodedPaths.has(withoutJurisdiction);
  }

  return {
    segment,
    label,
    hasChildren: true,
    rule,
    nodeType: "section" as const,
    ...(hasRac && { hasRac }),
  };
}

export async function getActNodes(
  jurisdiction: string,
  page: number = 0
): Promise<TreeResult> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabaseArch
    .from("rules")
    .select("*", { count: "exact" })
    .eq("jurisdiction", jurisdiction)
    .is("parent_id", null)
    .order("heading")
    .range(from, to);

  const rules = (data || []) as Rule[];
  const total = count || 0;

  return {
    nodes: rules.map((r) => ({
      segment: r.id,
      label: r.heading || "Untitled",
      hasChildren: true,
      rule: r,
      nodeType: "act" as const,
    })),
    hasMore: hasNextPage(page, total),
    total,
  };
}

export async function getChildrenByParentId(
  parentId: string,
  page: number = 0
): Promise<TreeResult> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabaseArch
    .from("rules")
    .select("*", { count: "exact" })
    .eq("parent_id", parentId)
    .order("ordinal")
    .range(from, to);

  const rules = (data || []) as Rule[];
  const total = count || 0;

  return {
    nodes: rules.map((r) => ({
      segment: r.id,
      label: r.heading || r.body?.slice(0, 80) || "Untitled",
      hasChildren: true,
      rule: r,
      nodeType: "section" as const,
    })),
    hasMore: hasNextPage(page, total),
    total,
  };
}

export async function getRuleById(id: string): Promise<Rule | null> {
  const { data, error } = await supabaseArch
    .from("rules")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Rule;
}

/* v8 ignore stop */

// ---- Breadcrumb helpers ----

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function buildBreadcrumbs(segments: string[]): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Atlas", href: "/atlas" }];

  for (let i = 0; i < segments.length; i++) {
    const href = "/atlas/" + segments.slice(0, i + 1).join("/");
    const label = formatSegmentLabel(segments, i);
    items.push({ label, href });
  }

  return items;
}

function formatSegmentLabel(segments: string[], index: number): string {
  const segment = segments[index];

  if (index === 0) {
    const jur = getJurisdiction(segment);
    return jur ? jur.label : segment;
  }

  if (index === 1) {
    return segment === "statute" ? "Statutes" : segment;
  }

  if (index === 2) {
    return `Title ${segment}`;
  }

  return `§ ${segment}`;
}

// ---- UUID detection ----

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(s: string): boolean {
  return UUID_RE.test(s);
}
