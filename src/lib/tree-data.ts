import { supabaseCorpus, type Rule } from "@/lib/supabase";
import { naturalCompare } from "@/lib/natural-sort";
import {
  JURISDICTIONS_SEED,
  synthesiseJurisdiction,
} from "@/lib/axiom/jurisdictions-seed";
import { splitBodyIntoSubsections } from "@/lib/axiom/body-subsections";
import { chapterlessSectionAlias } from "@/lib/axiom/citation-path-aliases";

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
const ROOT_SCAN_PAGE_SIZE = 1000;
const ROOT_SCAN_MAX_ROWS = 10000;

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
  // Filtering ``citation_path is not null`` server-side adds a check
  // that intermittently triggers Postgres' statement timeout for
  // jurisdictions with many provisions (us-co, us-tx, …). When that
  // happens the call resolves with ``data: null`` and the picker
  // collapses to "No items found". Pull the parent_id=null roots
  // unfiltered — the index on ``(jurisdiction, parent_id)`` returns
  // them in ~tens of ms — and skip null citation_paths in JS.
  const docTypes = new Set<string>();

  for (let offset = 0; offset < ROOT_SCAN_MAX_ROWS; offset += ROOT_SCAN_PAGE_SIZE) {
    const { data } = await supabaseCorpus
      .from("provisions")
      .select("citation_path")
      .eq("jurisdiction", jurisdiction)
      .is("parent_id", null)
      .order("citation_path", { ascending: true, nullsFirst: false })
      .range(offset, offset + ROOT_SCAN_PAGE_SIZE - 1);

    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!row.citation_path) continue;
      const parts = row.citation_path.split("/");
      if (parts.length >= 2) {
        docTypes.add(parts[1]);
      }
    }

    if (docTypes.size >= 3 || data.length < ROOT_SCAN_PAGE_SIZE) break;
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
    // When the encoded-only filter is on, narrow the query to the
    // exact set of children whose citation paths are encoded
    // ancestors. Otherwise a parent like "Code of Colorado
    // Regulations" (~1k children) can push the encoded entry past
    // the default 1000-row limit and the filter ends up matching
    // nothing.
    if (encodedOnly && encodedPaths) {
      const wantedTitles = new Set<string>();
      const docTypePrefix = `${_docType}/`;
      for (const p of encodedPaths) {
        if (!p.startsWith(docTypePrefix)) continue;
        const tail = p.slice(docTypePrefix.length);
        const firstSeg = tail.split("/")[0];
        if (firstSeg) wantedTitles.add(firstSeg);
      }
      if (wantedTitles.size === 0) return [];
      const wantedPaths = Array.from(wantedTitles).map(
        (t) => `${jurisdiction}/${_docType}/${t}`
      );
      const { data } = await supabaseCorpus
        .from("provisions")
        .select("*")
        .eq("parent_id", parentRule.id)
        .in("citation_path", wantedPaths)
        .order("ordinal");
      return ((data || []) as Rule[]).map((r) =>
        ruleToSectionNode(r, encodedPaths)
      );
    }

    const { data } = await supabaseCorpus
      .from("provisions")
      .select("*")
      .eq("parent_id", parentRule.id)
      .order("ordinal");

    return ((data || []) as Rule[]).map((r) =>
      ruleToSectionNode(r, encodedPaths)
    );
  }

  // ``citation_path is not null`` server-side intermittently triggers
  // statement timeout for large jurisdictions; fetch the parent_id=null
  // roots unfiltered and skip nulls in JS.
  // When the encoded-only filter is on, derive the title list
  // directly from the encoded-paths set rather than scanning corpus.
  // Some jurisdictions have so many parent_id=null rows that the
  // first 1000-row page misses encoded titles entirely (e.g. CFR
  // title 7 sits after the 33–41 wall in ``us``). The encoded set
  // is small and authoritative.
  let titles: string[];
  if (encodedOnly && encodedPaths) {
    const encoded = new Set<string>();
    const docTypePrefix = `${_docType}/`;
    for (const p of encodedPaths) {
      if (!p.startsWith(docTypePrefix)) continue;
      const tail = p.slice(docTypePrefix.length);
      const firstSeg = tail.split("/")[0];
      if (firstSeg) encoded.add(firstSeg);
    }
    if (encoded.size === 0) return [];
    titles = Array.from(encoded).sort(naturalCompare);
  } else {
    const titleSet = new Set<string>();

    for (let offset = 0; offset < ROOT_SCAN_MAX_ROWS; offset += ROOT_SCAN_PAGE_SIZE) {
      const { data } = await supabaseCorpus
        .from("provisions")
        .select("citation_path")
        .eq("jurisdiction", jurisdiction)
        .is("parent_id", null)
        .order("citation_path", { ascending: true, nullsFirst: false })
        .range(offset, offset + ROOT_SCAN_PAGE_SIZE - 1);

      if (!data || data.length === 0) break;

      for (const row of data) {
        if (!row.citation_path) continue;
        const parts = row.citation_path.split("/");
        if (parts.length >= 3 && parts[1] === _docType) {
          titleSet.add(parts[2]);
        }
      }

      if (data.length < ROOT_SCAN_PAGE_SIZE) break;
    }

    if (titleSet.size === 0) return [];
    titles = Array.from(titleSet).sort(naturalCompare);
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

/**
 * Look up rules whose citation_path is ``<rule>.<...>`` — i.e. dotted
 * subsections that share a parent with ``rule`` in the corpus but
 * read as a subsection in the law's own numbering. Used to surface
 * CCR-style subsections (``4.401.1``, ``4.401.2``) under their
 * parent's page even though the corpus tree doesn't re-parent them.
 */
async function fetchDottedSubsectionSiblings(rule: Rule): Promise<Rule[]> {
  if (!rule.citation_path) return [];
  const lower = `${rule.citation_path}.`;
  const upper =
    lower.slice(0, -1) + String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);
  const { data } = await supabaseCorpus
    .from("provisions")
    .select("*")
    .gte("citation_path", lower)
    .lt("citation_path", upper)
    .order("citation_path");
  return (data ?? []) as Rule[];
}

async function resolveBodySubsectionRule(
  pathPrefix: string
): Promise<Rule | null> {
  const parts = pathPrefix.split("/");
  if (parts.length < 5) return null;
  const label = parts.at(-1);
  const parentCitationPath = parts.slice(0, -1).join("/");
  if (!label || !parentCitationPath) return null;

  const { data: parentRule } = await supabaseCorpus
    .from("provisions")
    .select("*")
    .eq("citation_path", parentCitationPath)
    .maybeSingle();

  const parent = parentRule as Rule | null;
  if (!parent?.body) return null;

  const subsections = splitBodyIntoSubsections(parent.body);
  if (!subsections) return null;
  const index = subsections.findIndex((s) => s.label === label);
  if (index < 0) return null;

  const subsection = subsections[index];
  return {
    ...parent,
    id: `${parent.id}:body-subsection:${label}`,
    parent_id: parent.id,
    level: parent.level + 1,
    ordinal: index,
    heading: parent.heading ? `(${label}) ${parent.heading}` : `(${label})`,
    body: subsection.text,
    citation_path: pathPrefix,
    has_rulespec: false,
    rulespec_path: null,
  };
}

async function resolveCitationPathAlias(
  pathPrefix: string
): Promise<Rule | null> {
  const alias = chapterlessSectionAlias(pathPrefix);
  if (!alias || alias === pathPrefix) return null;
  const { data } = await supabaseCorpus
    .from("provisions")
    .select("*")
    .eq("citation_path", alias)
    .maybeSingle();
  return (data as Rule | null) ?? null;
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
    // Encoded-only short-circuit: pull the encoded descendants
    // directly by their citation_path instead of walking the
    // corpus's parent_id tree. The corpus parents 7 CFR 273.3 under
    // ``subpart-B`` and the rules-us repo files it as bare
    // ``273/3.yaml``, so a path-prefix descendant check on the
    // subpart node never matches. Picking up the encoded paths
    // straight from the set produces the right list regardless.
    if (encodedOnly && encodedPaths) {
      const pathTail = pathPrefix.split("/").slice(1).join("/");
      const jurisdiction = pathPrefix.split("/")[0];
      const wantedTails = new Set<string>();
      for (const p of encodedPaths) {
        if (!p.startsWith(`${pathTail}/`)) continue;
        const remainder = p.slice(pathTail.length + 1);
        const firstSeg = remainder.split("/")[0];
        if (firstSeg) wantedTails.add(firstSeg);
      }
      if (wantedTails.size === 0) {
        return {
          nodes: [],
          hasMore: false,
          total: 0,
          currentRule: parentRule as Rule,
        };
      }
      const wantedPaths = Array.from(wantedTails).map(
        (t) => `${pathPrefix}/${t}`
      );
      const { data: encodedRows } = await supabaseCorpus
        .from("provisions")
        .select("*")
        .in("citation_path", wantedPaths)
        .order("citation_path");
      const rules = (encodedRows ?? []) as Rule[];
      void jurisdiction;
      return {
        nodes: rules.map((r) => ruleToSectionNode(r, encodedPaths)),
        hasMore: false,
        total: rules.length,
        currentRule: parentRule as Rule,
      };
    }

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

    // Leaf node: parentRule exists but has no parent_id-anchored
    // children. Before declaring it a leaf, look for citation-path
    // siblings that read like dotted subsections — the CCR encoder
    // stores ``4.401.1``, ``4.401.2`` as siblings of ``4.401`` under
    // the same regulation parent, even though the dotted form reads
    // as a subsection. Promote those to virtual children so the
    // reader gets a navigable subsection list.
    if (total === 0) {
      const dotted = await fetchDottedSubsectionSiblings(
        parentRule as Rule
      );
      if (dotted.length > 0) {
        return {
          nodes: dotted.map((r) => ruleToSectionNode(r, encodedPaths)),
          hasMore: false,
          total: dotted.length,
          currentRule: parentRule as Rule,
        };
      }
      return {
        nodes: [],
        hasMore: false,
        total: 0,
        leafRule: parentRule as Rule,
      };
    }

    const nodes = rules.map((r) => ruleToSectionNode(r, encodedPaths));

    return {
      nodes,
      hasMore: hasNextPage(page, total),
      total: encodedOnly ? nodes.length : total,
      currentRule: parentRule as Rule,
    };
  }

  const aliasRule = await resolveCitationPathAlias(pathPrefix);
  if (aliasRule) {
    return {
      nodes: [],
      hasMore: false,
      total: 0,
      leafRule: aliasRule,
    };
  }

  const bodySubsectionRule = await resolveBodySubsectionRule(pathPrefix);
  if (bodySubsectionRule) {
    return {
      nodes: [],
      hasMore: false,
      total: 0,
      leafRule: bodySubsectionRule,
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
 * Fetch the citation paths of every encoded rule for a jurisdiction,
 * returned without the leading jurisdiction segment (so e.g.
 * ``us/statute/26/1`` becomes ``statute/26/1``). The "Encoded only"
 * filter narrows the tree to branches whose paths show up in this
 * set.
 *
 * The canonical source is the jurisdiction's ``rules-*`` GitHub repo
 * — that's the file-system of truth about what's been checked in,
 * regardless of whether ``has_rulespec`` has been backfilled in the
 * corpus DB. We layer in any corpus rows that already carry the flag
 * too, so an in-flight encoder run that sets ``has_rulespec=true``
 * before pushing the YAML still shows up.
 */
export async function getEncodedPaths(
  jurisdiction: string
): Promise<Set<string>> {
  const paths = new Set<string>();

  // Source 1: rules-* GitHub tree
  try {
    const { listEncodedFiles } = await import(
      "@/lib/axiom/rulespec/repo-listing"
    );
    const files = await listEncodedFiles(jurisdiction);
    for (const f of files) {
      const parts = f.citationPath.split("/");
      paths.add(parts.slice(1).join("/"));
    }
  } catch {
    // Repo lookup failures fall through silently — corpus may still
    // surface some encoded paths via has_rulespec=true.
  }

  // Source 2: corpus.has_rulespec
  const { data } = await supabaseCorpus
    .from("provisions")
    .select("citation_path")
    .eq("jurisdiction", jurisdiction)
    .eq("has_rulespec", true);

  if (data) {
    for (const row of data) {
      if (row.citation_path) {
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
