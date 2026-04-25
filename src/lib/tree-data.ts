import { supabase, supabaseAkn, type Rule } from "@/lib/supabase";
import { naturalCompare } from "@/lib/natural-sort";
import {
  JURISDICTIONS_SEED,
  synthesiseJurisdiction,
} from "@/lib/atlas/jurisdictions-seed";

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
  /** Whether this node has a RAC encoding in encoding_runs */
  hasRac?: boolean;
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
 * reference still lands on the rule page instead of the Atlas
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

export type AtlasPhase = "jurisdiction-picker" | "rule";

export interface ResolvedPath {
  phase: AtlasPhase;
  jurisdiction?: Jurisdiction;
  ruleSegments: string[];
}

export function resolveAtlasPath(segments: string[]): ResolvedPath {
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

// ---- Backward compat ----

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
  const parentResult = await supabaseAkn
    .from("rules")
    .select("*")
    .eq("id", rule.parent_id)
    .single();
  const parent = parentResult.data as Rule | null;
  if (!parent) {
    return { rule, parentBody: null, siblings: [rule], targetIndex: 0 };
  }
  const siblingsResult = await supabaseAkn
    .from("rules")
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
      const { count } = await supabaseAkn
        .from("rules")
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
  const { data } = await supabaseAkn
    .from("rules")
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
  const { data: parentRule } = await supabaseAkn
    .from("rules")
    .select("*")
    .eq("citation_path", rootPath)
    .single();

  if (parentRule) {
    const { data } = await supabaseAkn
      .from("rules")
      .select("*")
      .eq("parent_id", parentRule.id)
      .order("ordinal");

    let nodes = ((data || []) as Rule[]).map((r) =>
      ruleToSectionNode(r, encodedPaths)
    );

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

    return nodes;
  }

  const { data } = await supabaseAkn
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
      const { count } = await supabaseAkn
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
  const { data: parentRule } = await supabaseAkn
    .from("rules")
    .select("*")
    .eq("citation_path", pathPrefix)
    .single();

  if (parentRule) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabaseAkn
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
      currentRule: parentRule as Rule,
    };
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count } = await supabaseAkn
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
 * Fetch citation paths of all rules with has_rac=true from akn.rules.
 * Returns paths without jurisdiction prefix, e.g. "statute/26/1/j/2".
 */
export async function getEncodedPaths(): Promise<Set<string>> {
  const { data } = await supabaseAkn
    .from("rules")
    .select("citation_path")
    .eq("has_rac", true);

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

  // Use has_rac from DB directly, or fall back to encoded paths set
  let hasRac = rule.has_rac;
  if (!hasRac && encodedPaths && rule.citation_path) {
    const parts = rule.citation_path.split("/");
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

  const { data, count } = await supabaseAkn
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
      // Many ingested Canadian top-level rules carry an empty
      // ``heading`` field (some are just "[Repealed]" markers).
      // Fall through to the body preview so the picker reads as
      // something other than a column of "Untitled".
      label: pickActLabel(r),
      hasChildren: true,
      rule: r,
      nodeType: "act" as const,
    })),
    hasMore: hasNextPage(page, total),
    total,
  };
}

/**
 * Best-effort human label for an act-level rule. Prefer the
 * ingested heading; fall back to the first ~80 chars of body
 * (covers ``"81[Repealed, 2003, c. 22, s. 285]"`` and similar
 * stubs); fall back to the citation_path's last segment when both
 * are absent; finally to a generic "Untitled" so the row is
 * still selectable.
 */
function pickActLabel(rule: Rule): string {
  const heading = rule.heading?.trim();
  if (heading) return heading;
  const body = rule.body?.trim();
  if (body) {
    const compact = body.replace(/\s+/g, " ");
    return compact.length > 80 ? compact.slice(0, 80).trimEnd() + "…" : compact;
  }
  const tail = rule.citation_path?.split("/").pop()?.trim();
  if (tail) return tail;
  return "Untitled";
}

export async function getChildrenByParentId(
  parentId: string,
  page: number = 0
): Promise<TreeResult> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabaseAkn
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
  const { data, error } = await supabaseAkn
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

  const jurisdiction = getJurisdictionBySlug(segments[0]);
  if (!jurisdiction) return items;

  // Jurisdiction breadcrumb
  items.push({
    label: jurisdiction.label,
    href: `/atlas/${jurisdiction.slug}`,
  });

  // Rule segments start at index 1
  for (let i = 1; i < segments.length; i++) {
    const ruleIndex = i - 1;
    const href = "/atlas/" + segments.slice(0, i + 1).join("/");
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
