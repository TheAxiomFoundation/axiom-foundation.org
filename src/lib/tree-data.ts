import { supabaseCorpus, type Rule } from "@/lib/supabase";
import { naturalCompare } from "@/lib/natural-sort";
import {
  JURISDICTIONS_SEED,
  synthesiseJurisdiction,
} from "@/lib/axiom/jurisdictions-seed";

export type NodeType =
  | "jurisdiction"
  | "doc_type"
  | "title"
  | "section"
  | "act";

export interface TreeNode {
  /** URL segment: "us", "statute", "26", "1" */
  segment: string;
  /** Display label: "US Federal", "Title 26", "§ 1 — Tax imposed" */
  label: string;
  hasChildren: boolean;
  /** For count badges */
  childCount?: number;
  /** The underlying DB rule, if this node maps to one */
  rule?: Rule;
  nodeType: NodeType;
  /** Whether this node has a RuleSpec encoding in encodings.encoding_runs */
  hasRuleSpec?: boolean;
}

export interface TreeResult {
  nodes: TreeNode[];
  hasMore: boolean;
  total: number;
  /** Set when a citation-path resolves to a rule with no children (leaf node) */
  leafRule?: Rule;
  /** Set when a citation-path resolves to a rule that still has child nodes */
  currentRule?: Rule;
}

// ---- Flat jurisdiction config ----

export interface Jurisdiction {
  /** URL segment and DB jurisdiction ID: "us", "us-oh", "uk", "canada" */
  slug: string;
  /** Display label: "US Federal", "Ohio", "United Kingdom" */
  label: string;
  /** Whether rules use citation_path-based navigation */
  hasCitationPaths: boolean;
}

export const JURISDICTIONS: Jurisdiction[] = JURISDICTIONS_SEED;

/**
 * Resolve a URL slug into a Jurisdiction record. Falls through to a
 * synthesised record for well-formed but uncurated slugs (e.g. a new
 * US state we haven't labelled yet) so a direct URL or an incoming
 * reference still lands on the rule page instead of the Axiom
 * landing.
 */
export function getJurisdictionBySlug(
  slug: string
): Jurisdiction | undefined {
  const curated = JURISDICTIONS.find((j) => j.slug === slug);
  if (curated) return curated;
  return synthesiseJurisdiction(slug) ?? undefined;
}

// ---- Path resolution ----

export type AxiomPhase = "jurisdiction-picker" | "rule";

export interface ResolvedPath {
  phase: AxiomPhase;
  jurisdiction?: Jurisdiction;
  ruleSegments: string[];
}

export function resolveAxiomPath(segments: string[]): ResolvedPath {
  if (segments.length === 0) {
    return { phase: "jurisdiction-picker", ruleSegments: [] };
  }

  const jurisdiction = getJurisdictionBySlug(segments[0]);
  if (!jurisdiction) {
    return { phase: "jurisdiction-picker", ruleSegments: [] };
  }

  return {
    phase: "rule",
    jurisdiction,
    ruleSegments: segments.slice(1),
  };
}

// ---- Jurisdiction lookup ----

/** Look up jurisdiction config by DB ID (same as slug in flat model) */
export function getJurisdiction(
  id: string
): { id: string; label: string; hasCitationPaths: boolean } | undefined {
  const j = getJurisdictionBySlug(id);
  if (!j) return undefined;
  return { id: j.slug, label: j.label, hasCitationPaths: j.hasCitationPaths };
}

// ---- Display context for leaf nodes ----

export interface DisplayContext {
  rule: Rule;
  parentBody: string | null;
  siblings: Rule[];
  targetIndex: number;
}

export async function resolveDisplayContext(rule: Rule): Promise<DisplayContext> {
  if (!rule.parent_id) {
    return { rule, parentBody: null, siblings: [rule], targetIndex: 0 };
  }
  const parentResult = await supabaseCorpus
    .from("provisions")
    .select("*")
    .eq("id", rule.parent_id)
    .single();
  const parent = parentResult.data as Rule | null;
  if (!parent) {
    return { rule, parentBody: null, siblings: [rule], targetIndex: 0 };
  }
  const siblingsResult = await supabaseCorpus
    .from("provisions")
    .select("*")
    .eq("parent_id", rule.parent_id)
    .order("ordinal");
  const siblings = (siblingsResult.data || []) as Rule[];
  const targetIndex = siblings.findIndex((s) => s.id === rule.id);
  return {
    rule,
    parentBody: parent.body || null,
    siblings,
    targetIndex: targetIndex >= 0 ? targetIndex : 0,
  };
}

// ---- Pagination ----

const PAGE_SIZE = 100;
const PREFIX_SCAN_PAGE_SIZE = 1000;
const PREFIX_SCAN_MAX_ROWS = 10000;

// ---- Query functions ----

/* v8 ignore start -- Supabase queries tested via integration/e2e */

function hasNextPage(page: number, total: number): boolean {
  return (page + 1) * PAGE_SIZE < total;
}

function citationPrefixLowerBound(pathPrefix: string): string {
  return `${pathPrefix}/`;
}

function citationPrefixUpperBound(pathPrefix: string): string {
  return `${pathPrefix}~`;
}

function citationDepth(citationPath: string): number {
  let depth = 1;
  for (let i = 0; i < citationPath.length; i++) {
    if (citationPath[i] === "/") depth++;
  }
  return depth;
}

function sortRulesByOrdinalThenCitation(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => {
    const aOrdinal = a.ordinal;
    const bOrdinal = b.ordinal;

    if (aOrdinal != null && bOrdinal != null && aOrdinal !== bOrdinal) {
      return aOrdinal - bOrdinal;
    }
    if (aOrdinal != null && bOrdinal == null) return -1;
    if (aOrdinal == null && bOrdinal != null) return 1;

    return naturalCompare(a.citation_path ?? a.id, b.citation_path ?? b.id);
  });
}

async function fetchDirectRootChildrenByCitationPrefix(
  pathPrefix: string
): Promise<{ rows: Rule[]; truncated: boolean }> {
  const expectedDepth = citationDepth(pathPrefix) + 1;
  const rows: Rule[] = [];
  let offset = 0;

  while (offset < PREFIX_SCAN_MAX_ROWS) {
    const { data, error } = await supabaseCorpus
      .from("provisions")
      .select("*")
      .gte("citation_path", citationPrefixLowerBound(pathPrefix))
      .lt("citation_path", citationPrefixUpperBound(pathPrefix))
      .is("parent_id", null)
      .order("citation_path")
      .range(offset, offset + PREFIX_SCAN_PAGE_SIZE - 1);

    if (error || !data || data.length === 0) {
      return { rows, truncated: false };
    }

    for (const row of data as Rule[]) {
      if (
        row.citation_path &&
        citationDepth(row.citation_path) === expectedDepth
      ) {
        rows.push(row);
      }
    }

    if (data.length < PREFIX_SCAN_PAGE_SIZE) {
      return { rows, truncated: false };
    }

    offset += PREFIX_SCAN_PAGE_SIZE;
  }

  return { rows, truncated: true };
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
      const { count } = await supabaseCorpus
        .from("provisions")
        .select("*", { count: "exact", head: true })
        .eq("jurisdiction", id);
      counts.set(id, count || 0);
    })
  );
  return counts;
}

export async function getDocTypeNodes(
  jurisdiction: string
): Promise<TreeNode[]> {
  const { data } = await supabaseCorpus
    .from("provisions")
    .select("citation_path")
    .eq("jurisdiction", jurisdiction)
    .not("citation_path", "is", null)
    .is("parent_id", null)
    .limit(1000);

  const docTypes = new Set<string>();
  for (const row of data || []) {
    if (!row.citation_path) continue;
    const parts = row.citation_path.split("/");
    if (parts.length >= 2) {
      docTypes.add(parts[1]);
    }
  }

  return Array.from(docTypes)
    .sort(naturalCompare)
    .map((segment) => ({
      segment,
      label:
        segment === "statute"
          ? "Statutes"
          : segment === "regulation"
            ? "Regulations"
            : formatGenericSegmentLabel(segment),
      hasChildren: true,
      nodeType: "doc_type" as const,
    }));
}

export async function getTitleNodes(
  jurisdiction: string,
  _docType: string,
  encodedPaths?: Set<string>,
  encodedOnly?: boolean
): Promise<TreeNode[]> {
  const rootPath = `${jurisdiction}/${_docType}`;
  const { data: parentRule } = await supabaseCorpus
    .from("provisions")
    .select("*")
    .eq("citation_path", rootPath)
    .maybeSingle();

  if (parentRule) {
    const { data } = await supabaseCorpus
      .from("provisions")
      .select("*")
      .eq("parent_id", parentRule.id)
      .order("ordinal");

    let nodes = ((data || []) as Rule[]).map((r) =>
      ruleToSectionNode(r, encodedPaths)
    );

    if (encodedOnly && encodedPaths) {
      nodes = nodes.filter((n) => {
        if (n.hasRuleSpec) return true;
        if (n.rule?.citation_path) {
          const parts = n.rule.citation_path.split("/");
          const withoutJurisdiction = parts.slice(1).join("/");
          return hasEncodedDescendant(encodedPaths, withoutJurisdiction);
        }
        return false;
      });
    }

    return nodes;
  }

  const { data } = await supabaseCorpus
    .from("provisions")
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
    if (parts.length >= 3 && parts[1] === _docType) {
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
      const prefix = `${jurisdiction}/${_docType}/${title}`;
      const { count } = await supabaseCorpus
        .from("provisions")
        .select("*", { count: "exact", head: true })
        .gte("citation_path", citationPrefixLowerBound(prefix))
        .lt("citation_path", citationPrefixUpperBound(prefix))
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
  const { data: parentRule } = await supabaseCorpus
    .from("provisions")
    .select("*")
    .eq("citation_path", pathPrefix)
    .maybeSingle();

  if (parentRule) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabaseCorpus
      .from("provisions")
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
        if (n.hasRuleSpec) return true;
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
      currentRule: parentRule as Rule,
    };
  }

  const { rows, truncated } =
    await fetchDirectRootChildrenByCitationPrefix(pathPrefix);
  const sortedRules = sortRulesByOrdinalThenCitation(rows);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  const pageRules = sortedRules.slice(from, to);

  let nodes = pageRules.map((r) => ruleToSectionNode(r));

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
    hasMore: truncated || to < sortedRules.length,
    total: encodedOnly ? nodes.length : sortedRules.length,
  };
}

/**
 * Fetch citation paths of all rules with has_rulespec=true from corpus.provisions.
 * Returns paths without jurisdiction prefix, e.g. "statute/26/1/j/2".
 */
export async function getEncodedPaths(): Promise<Set<string>> {
  const { data } = await supabaseCorpus
    .from("provisions")
    .select("citation_path")
    .eq("has_rulespec", true);

  const paths = new Set<string>();
  if (data) {
    for (const row of data) {
      if (row.citation_path) {
        // Strip jurisdiction prefix (e.g. "us/statute/26/1" → "statute/26/1")
        const parts = row.citation_path.split("/");
        paths.add(parts.slice(1).join("/"));
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
  const parts = rule.citation_path?.split("/") ?? [];

  let label: string;
  if (rule.jurisdiction === "us-co" && parts[1] === "statute") {
    if (parts.length === 3) {
      label = rule.heading || "Colorado Revised Statutes";
    } else if (parts.length === 4) {
      label = rule.heading ? `§ ${segment} — ${rule.heading}` : `§ ${segment}`;
    } else {
      label = rule.heading ? `(${segment}) — ${rule.heading}` : `(${segment})`;
    }
  } else if (rule.jurisdiction === "us-co" && parts[1] === "regulation") {
    if (parts.length === 3) {
      label = rule.heading || segment.replace("-CCR-", " CCR ");
    } else if (parts.length === 4) {
      label = rule.heading ? `§ ${segment} — ${rule.heading}` : `§ ${segment}`;
    } else {
      label = rule.heading ? `(${segment}) — ${rule.heading}` : `(${segment})`;
    }
  } else {
    const isStatutePath = rule.citation_path?.includes("/statute/");
    label = isStatutePath
      ? rule.heading
        ? `§ ${segment} — ${rule.heading}`
        : `§ ${segment}`
      : rule.heading || formatGenericSegmentLabel(segment);
  }

  // Use has_rulespec from DB directly, or fall back to encoded paths set
  let hasRuleSpec = rule.has_rulespec;
  if (!hasRuleSpec && encodedPaths && rule.citation_path) {
    const parts = rule.citation_path.split("/");
    const withoutJurisdiction = parts.slice(1).join("/");
    hasRuleSpec = encodedPaths.has(withoutJurisdiction);
  }

  return {
    segment,
    label,
    hasChildren: true,
    rule,
    nodeType: "section" as const,
    ...(hasRuleSpec && { hasRuleSpec }),
  };
}

export async function getActNodes(
  jurisdiction: string,
  page: number = 0
): Promise<TreeResult> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabaseCorpus
    .from("provisions")
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

  const { data, count } = await supabaseCorpus
    .from("provisions")
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
  const { data, error } = await supabaseCorpus
    .from("provisions")
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
  const items: BreadcrumbItem[] = [{ label: "Axiom", href: "/" }];

  if (segments.length === 0) return items;

  const jurisdiction = getJurisdictionBySlug(segments[0]);
  if (!jurisdiction) return items;

  // Jurisdiction breadcrumb
  items.push({
    label: jurisdiction.label,
    href: `/${jurisdiction.slug}`,
  });

  // Rule segments start at index 1
  for (let i = 1; i < segments.length; i++) {
    const ruleIndex = i - 1;
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = formatRuleSegmentLabel(
      segments[i],
      ruleIndex,
      jurisdiction.slug,
      segments[i - 1],
      segments
    );
    items.push({ label, href });
  }

  return items;
}

function formatGenericSegmentLabel(segment: string): string {
  switch (segment) {
    case "legislation":
      return "Legislation";
    case "uksi":
      return "UK Statutory Instruments";
    case "ssi":
      return "Scottish Statutory Instruments";
    case "regulation":
    case "schedule":
    case "paragraph":
    case "article":
    case "section":
    case "part":
    case "chapter":
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    default:
      return segment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
  }
}

function formatRuleSegmentLabel(
  segment: string,
  ruleIndex: number,
  jurisdiction: string,
  previousSegment?: string,
  allSegments?: string[]
): string {
  if (jurisdiction === "us-co") {
    if (ruleIndex === 0) {
      if (segment === "statute") return "Statutes";
      if (segment === "regulation") return "Regulations";
      return formatGenericSegmentLabel(segment);
    }

    if (previousSegment === "statute" && segment === "crs") {
      return "Colorado Revised Statutes";
    }

    if (previousSegment === "regulation") {
      return segment.replace("-CCR-", " CCR ");
    }

    if (previousSegment?.includes("-CCR-")) {
      return `§ ${segment}`;
    }

    if (previousSegment === "crs") {
      return `§ ${segment}`;
    }

    if (previousSegment && /^\d[\d.-]*$/.test(previousSegment)) {
      return `(${segment})`;
    }

    return formatGenericSegmentLabel(segment);
  }

  if (jurisdiction === "uk") {
    if (ruleIndex === 0) {
      return formatGenericSegmentLabel(segment);
    }

    if (
      previousSegment &&
      ["regulation", "schedule", "paragraph", "article", "section", "part", "chapter"].includes(previousSegment)
    ) {
      return segment;
    }

    return formatGenericSegmentLabel(segment);
  }

  // Default path (us federal and similar): handle statute and regulation lanes
  const isRegulationLane =
    Array.isArray(allSegments) && allSegments[1] === "regulation";
  const isSubpart =
    typeof segment === "string" && segment.startsWith("subpart-");

  if (ruleIndex === 0) {
    if (segment === "statute") return "Statutes";
    if (segment === "regulation") return "Regulations";
    return segment;
  }

  if (ruleIndex === 1) {
    return `Title ${segment}`;
  }

  if (isRegulationLane) {
    if (ruleIndex === 2) return `Part ${segment}`;
    if (isSubpart) {
      return `Subpart ${segment.replace(/^subpart-/, "").toUpperCase()}`;
    }
    if (ruleIndex === 3) {
      // Section under part: e.g. us/regulation/7/273/9 → "§ 273.9"
      const partNum = allSegments?.[3] ?? "";
      return `§ ${partNum}.${segment}`;
    }
    if (ruleIndex === 4 && previousSegment?.startsWith("subpart-")) {
      // Section under subpart: e.g. us/regulation/7/273/subpart-d/9 → "§ 273.9"
      const partNum = allSegments?.[3] ?? "";
      return `§ ${partNum}.${segment}`;
    }
    return `(${segment})`;
  }

  // Statute lane
  if (ruleIndex === 2) {
    return `§ ${segment}`;
  }

  if (ruleIndex > 2) {
    return `(${segment})`;
  }

  return `§ ${segment}`;
}

// ---- UUID detection ----

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(s: string): boolean {
  return UUID_RE.test(s);
}
