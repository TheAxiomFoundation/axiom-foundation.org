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

// ---- Hierarchical jurisdiction config ----

export interface SubJurisdiction {
  /** URL segment: "federal", "oh" */
  slug: string;
  /** Display label: "Federal", "Ohio" */
  label: string;
  /** DB jurisdiction value: "us", "us-oh" */
  dbJurisdictionId: string;
  /** Whether rules use citation_path-based navigation */
  hasCitationPaths: boolean;
}

export interface CountryConfig {
  /** URL segment: "us", "uk", "canada" */
  slug: string;
  /** Display label: "United States" */
  label: string;
  /** Sub-jurisdictions. length===1 → skip sub-jurisdiction picker */
  children: SubJurisdiction[];
}

export const COUNTRIES: CountryConfig[] = [
  {
    slug: "us",
    label: "United States",
    children: [
      {
        slug: "federal",
        label: "Federal",
        dbJurisdictionId: "us",
        hasCitationPaths: true,
      },
      {
        slug: "oh",
        label: "Ohio",
        dbJurisdictionId: "us-oh",
        hasCitationPaths: true,
      },
    ],
  },
  {
    slug: "uk",
    label: "United Kingdom",
    children: [
      {
        slug: "uk",
        label: "United Kingdom",
        dbJurisdictionId: "uk",
        hasCitationPaths: false,
      },
    ],
  },
  {
    slug: "canada",
    label: "Canada",
    children: [
      {
        slug: "canada",
        label: "Canada",
        dbJurisdictionId: "canada",
        hasCitationPaths: false,
      },
    ],
  },
];

export function getCountry(slug: string): CountryConfig | undefined {
  return COUNTRIES.find((c) => c.slug === slug);
}

export function getSubJurisdiction(
  country: CountryConfig,
  slug: string
): SubJurisdiction | undefined {
  return country.children.find((s) => s.slug === slug);
}

// ---- Path resolution ----

export type AtlasPhase = "country-picker" | "sub-jurisdiction-picker" | "rule";

export interface ResolvedPath {
  phase: AtlasPhase;
  country?: CountryConfig;
  subJurisdiction?: SubJurisdiction;
  ruleSegments: string[];
}

export function resolveAtlasPath(segments: string[]): ResolvedPath {
  if (segments.length === 0) {
    return { phase: "country-picker", ruleSegments: [] };
  }

  const country = getCountry(segments[0]);
  if (!country) {
    return { phase: "country-picker", ruleSegments: [] };
  }

  // Single-child country: skip sub-jurisdiction picker
  if (country.children.length === 1) {
    const sub = country.children[0];
    return {
      phase: "rule",
      country,
      subJurisdiction: sub,
      ruleSegments: segments.slice(1),
    };
  }

  // Multi-child country: need sub-jurisdiction segment
  if (segments.length === 1) {
    return {
      phase: "sub-jurisdiction-picker",
      country,
      ruleSegments: [],
    };
  }

  const sub = getSubJurisdiction(country, segments[1]);
  if (!sub) {
    return {
      phase: "sub-jurisdiction-picker",
      country,
      ruleSegments: [],
    };
  }

  return {
    phase: "rule",
    country,
    subJurisdiction: sub,
    ruleSegments: segments.slice(2),
  };
}

// ---- Backward compat ----

/** Derive a flat jurisdiction lookup from COUNTRIES for internal use */
export function getJurisdiction(
  id: string
): { id: string; label: string; hasCitationPaths: boolean } | undefined {
  for (const country of COUNTRIES) {
    for (const sub of country.children) {
      if (sub.dbJurisdictionId === id) {
        return {
          id: sub.dbJurisdictionId,
          label: sub.label,
          hasCitationPaths: sub.hasCitationPaths,
        };
      }
    }
  }
  return undefined;
}

// ---- Pagination ----

const PAGE_SIZE = 100;

// ---- Query functions ----

/* v8 ignore start -- Supabase queries tested via integration/e2e */

function hasNextPage(page: number, total: number): boolean {
  return (page + 1) * PAGE_SIZE < total;
}

/**
 * Fetch aggregate rule count for a list of DB jurisdiction IDs.
 * Used by JurisdictionPicker for count badges.
 */
export async function getJurisdictionCounts(
  dbIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  await Promise.all(
    dbIds.map(async (id) => {
      const { count } = await supabaseArch
        .from("rules")
        .select("*", { count: "exact", head: true })
        .eq("jurisdiction", id);
      counts.set(id, count || 0);
    })
  );
  return counts;
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
  _docType: string,
  encodedPaths?: Set<string>,
  encodedOnly?: boolean
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

  let titles = Array.from(titleSet).sort(naturalCompare);

  // Filter to titles that have at least one encoded descendant
  if (encodedOnly && encodedPaths) {
    titles = titles.filter((title) =>
      hasEncodedDescendant(encodedPaths, `statute/${title}`)
    );
  }

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
  encodedPaths?: Set<string>,
  encodedOnly?: boolean
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

    let nodes = rules.map((r) => ruleToSectionNode(r, encodedPaths));

    // Filter to nodes that are encoded or have encoded descendants
    if (encodedOnly && encodedPaths) {
      nodes = nodes.filter((n) => {
        if (n.hasRac) return true;
        if (n.rule?.citation_path) {
          const parts = n.rule.citation_path.split("/");
          const withoutJurisdiction = parts.slice(1).join("/");
          return hasEncodedDescendant(encodedPaths, withoutJurisdiction);
        }
        return false;
      });
    }

    return {
      nodes,
      hasMore: hasNextPage(page, total),
      total: encodedOnly ? nodes.length : total,
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
  const depthFiltered = rules.filter((r) => {
    if (!r.citation_path) return false;
    // Count slashes + 1 instead of splitting to avoid array allocations
    let depth = 1;
    for (let i = 0; i < r.citation_path.length; i++) {
      if (r.citation_path[i] === "/") depth++;
    }
    return depth === expectedDepth;
  });

  let nodes = depthFiltered.map((r) => ruleToSectionNode(r));

  // Filter to nodes that have encoded descendants
  if (encodedOnly && encodedPaths) {
    nodes = nodes.filter((n) => {
      if (n.rule?.citation_path) {
        const parts = n.rule.citation_path.split("/");
        const withoutJurisdiction = parts.slice(1).join("/");
        return hasEncodedDescendant(encodedPaths, withoutJurisdiction);
      }
      return false;
    });
  }

  return {
    nodes,
    hasMore: hasNextPage(page, total),
    total: encodedOnly ? nodes.length : total,
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

/**
 * Check if any encoded path starts with the given prefix.
 * Used to filter tree branches that contain at least one encoded rule.
 */
export function hasEncodedDescendant(
  encodedPaths: Set<string>,
  prefix: string
): boolean {
  for (const p of encodedPaths) {
    if (p === prefix || p.startsWith(prefix + "/")) return true;
  }
  return false;
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

  if (segments.length === 0) return items;

  const country = getCountry(segments[0]);
  if (!country) return items;

  // Country breadcrumb
  items.push({ label: country.label, href: `/atlas/${country.slug}` });

  let ruleStartIndex: number;

  if (country.children.length === 1) {
    // Single-child: no sub-jurisdiction in URL
    ruleStartIndex = 1;
  } else {
    // Multi-child: sub-jurisdiction segment at index 1
    if (segments.length < 2) return items;
    const sub = getSubJurisdiction(country, segments[1]);
    if (!sub) return items;
    items.push({
      label: sub.label,
      href: `/atlas/${country.slug}/${sub.slug}`,
    });
    ruleStartIndex = 2;
  }

  // Rule segments
  for (let i = ruleStartIndex; i < segments.length; i++) {
    const ruleIndex = i - ruleStartIndex;
    const href = "/atlas/" + segments.slice(0, i + 1).join("/");
    const label = formatRuleSegmentLabel(segments[i], ruleIndex);
    items.push({ label, href });
  }

  return items;
}

function formatRuleSegmentLabel(segment: string, ruleIndex: number): string {
  if (ruleIndex === 0) {
    return segment === "statute" ? "Statutes" : segment;
  }

  if (ruleIndex === 1) {
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
