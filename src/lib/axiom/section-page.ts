import {
  supabaseCorpus,
  getRuleReferences,
  type Rule,
  type RuleReference,
  type RuleEncodingData,
} from "@/lib/supabase";
import {
  resolveAxiomPath,
  buildBreadcrumbs,
  type BreadcrumbItem,
} from "@/lib/tree-data";
import { getProvisionByCitationPath } from "@/lib/axiom/navigation-index/read";
import { UK_LEGISLATION_CLASSES } from "@/lib/axiom/uk-legal-names";
import { ukGovukTaxonomyTwin } from "@/lib/axiom/citation-path-aliases";
import type { NavigationNodeRow } from "@/lib/axiom/navigation-index/types";
import { parseRuleSpec } from "@/lib/axiom/rulespec/doc";
import {
  getProvisionCoverage,
  type ProvisionProgramCoverage,
} from "@/lib/axiom/runtime/coverage";
import { listParityCases } from "@/lib/axiom/runtime/api";
import { getSectionEncoding } from "@/lib/axiom/section-encoding";

/**
 * Data assembly for the v2 server-rendered section page: one reading
 * column holding a provision and its full descendant subtree, plus
 * the navigation context around it (breadcrumbs, table of contents,
 * prev/next siblings).
 *
 * Everything here is fetched server-side in a handful of parallel
 * queries so the page can be cached/ISR'd later without a client
 * data-fetch waterfall. References are fetched via RPC only for the
 * section root; descendant bodies still get inline links through the
 * inferred-reference pass in RuleBody (no per-descendant RPC fan-out
 * — a subtree-references RPC is the planned follow-up).
 */

const SUBTREE_LIMIT = 600;
const SECTION_QUERY_TIMEOUT_MS = 4000;

export interface SectionProvision {
  rule: Rule;
  /** In-page anchor id, e.g. "a-1-B" for …/32/a/1/B under …/32. */
  anchor: string;
  /** Subsection designator chain relative to the root, e.g. "(a)(1)(B)". */
  designator: string;
  /** Depth below the section root (1 = direct child). */
  relativeDepth: number;
}

export interface SectionTocEntry {
  anchor: string;
  label: string;
  children: SectionTocEntry[];
}

export interface SectionNeighbor {
  citationPath: string;
  label: string;
}

/**
 * A top-level subsection sliced out of a section-granular body. The
 * corpus currently stores most sections as one provision row whose
 * body holds the whole section text, so the reading column derives
 * subsection structure by parsing "(a) …" markers instead of
 * fetching descendant rows.
 */
export interface BodyChunk {
  anchor: string;
  designator: string;
  /** Short preview of the subsection's opening text, for the TOC. */
  label: string;
  text: string;
  /** Offset of ``text`` within the full body. */
  start: number;
}

export interface SectionPageData {
  citationPath: string;
  root: Rule;
  breadcrumbs: BreadcrumbItem[];
  provisions: SectionProvision[];
  /**
   * Body-derived subsection chunks; used when the corpus has no
   * descendant rows (the common case today). ``intro`` is any text
   * before the first subsection marker.
   */
  intro: string | null;
  bodyChunks: BodyChunk[];
  toc: SectionTocEntry[];
  rootRefs: RuleReference[];
  /**
   * The root body as ingested, before descendant-duplication
   * trimming — the inferred-reference pass reads this so citations
   * survive the dedupe.
   */
  refBody?: string | null;
  /** RuleSpec encoding for the section (encoding_runs or GitHub). */
  encoding: RuleEncodingData | null;
  /** Rules from ``encoding`` mapped to their subsection anchors. */
  encodedRules: EncodedRuleLink[];
  /**
   * Executable runtime packages containing rules derived from this
   * provision (the provision↔program join). Empty when the runtime
   * API is unconfigured.
   */
  programs: ProvisionProgramCoverage[];
  /** Rule name → repo file path (the file half of its legal ID). */
  ruleFiles: Record<string, string>;
  /**
   * Set when the requested path was deeper than the ingested corpus
   * row (e.g. …/26/32/a on a section-granular corpus): the section
   * renders in full and the reader highlights + scrolls to this
   * subsection anchor.
   */
  focusAnchor: string | null;
  prev: SectionNeighbor | null;
  next: SectionNeighbor | null;
  /** True when the subtree hit SUBTREE_LIMIT and was cut off. */
  truncated: boolean;
  /**
   * How much of the section the encodings cover: distinct top-level
   * subsections with rules vs. subsections total. Null when the
   * section has no subsection structure to measure against.
   */
  encodedCoverage: { encodedUnits: number; totalUnits: number } | null;
  /**
   * Oracle verification for the section's covering programs.
   * Only external-oracle comparisons earn "verified" — golden
   * expectations alone are self-graded (executable, not verified).
   */
  parity: {
    oracle: string;
    caseCount: number;
    programId: string;
    jurisdiction: string;
    caseDescriptions: string[];
  } | null;
}

/**
 * Segment-wise numeric-aware citation-path ordering: "…/2" sorts
 * before "…/10", and shorter paths sort before their descendants.
 */
export function compareCitationPaths(a: string, b: string): number {
  const as = a.split("/");
  const bs = b.split("/");
  const len = Math.min(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const cmp = as[i].localeCompare(bs[i], undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (cmp !== 0) return cmp;
  }
  return as.length - bs.length;
}

export function subtreeAnchor(rootPath: string, citationPath: string): string {
  if (!citationPath.startsWith(`${rootPath}/`)) return "";
  return citationPath
    .slice(rootPath.length + 1)
    .split("/")
    .join("-");
}

export function relativeDesignator(
  rootPath: string,
  citationPath: string
): string {
  if (!citationPath.startsWith(`${rootPath}/`)) return "";
  return citationPath
    .slice(rootPath.length + 1)
    .split("/")
    .map((seg) => `(${seg})`)
    .join("");
}

function tocLabel(designator: string, heading: string | null): string {
  const trimmed = heading?.trim();
  return trimmed ? `${designator} ${trimmed}` : designator;
}

/**
 * Nest the (path-sorted) subtree into a TOC. Only the first
 * ``maxDepth`` levels below the root are included — deeper paragraphs
 * are readable in the column but don't need TOC rows.
 */
export function buildSectionToc(
  provisions: SectionProvision[],
  maxDepth = 2
): SectionTocEntry[] {
  const rootEntries: SectionTocEntry[] = [];
  const byAnchor = new Map<string, SectionTocEntry>();

  for (const provision of provisions) {
    if (provision.relativeDepth > maxDepth) continue;
    const entry: SectionTocEntry = {
      anchor: provision.anchor,
      label: tocLabel(provision.designator, provision.rule.heading),
      children: [],
    };
    byAnchor.set(provision.anchor, entry);
    if (provision.relativeDepth === 1) {
      rootEntries.push(entry);
      continue;
    }
    const parentAnchor = provision.anchor
      .split("-")
      .slice(0, -1)
      .join("-");
    const parent = byAnchor.get(parentAnchor);
    if (parent) {
      parent.children.push(entry);
    } else {
      rootEntries.push(entry);
    }
  }

  return rootEntries;
}

/** An encoded rule tied back to the subsections it implements. */
export interface EncodedRuleLink {
  name: string;
  kind: string | null;
  /** Top-level subsection anchors ("a", "b", …) cited by the rule's
   *  source; empty when it doesn't cite a subsection of this
   *  section. Rules often cite several — eitc_maximum implements
   *  32(a)(2)(A) using the tables in 32(b). */
  anchors: string[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Map each rule in the section's RuleSpec to the subsection it
 * implements, using the rule's ``source`` citation ("26 USC
 * 32(b)(1)" → subsection "b"). Rules citing other sections or the
 * section as a whole get a null anchor and stay rail-only.
 */
export function mapRulesToSubsections(
  citationPath: string,
  rulespecContent: string | null
): EncodedRuleLink[] {
  if (!rulespecContent) return [];
  const doc = parseRuleSpec(rulespecContent);
  if (!doc) return [];
  const section = citationPath.split("/").at(-1) ?? "";
  if (!section) return [];
  // A source like "26 USC 32(a), 32(c)(1)(E), 32(i)" cites several
  // subsections; capture the letter after every "<section>(" token.
  const sourceRe = new RegExp(
    `(?:§+\\s*)?${escapeRegExp(section)}\\s*\\(([a-z]{1,2})\\)`,
    "g"
  );
  return doc.rules.map((rule) => {
    const source = rule.source ?? "";
    const anchors = Array.from(
      new Set(
        Array.from(source.matchAll(sourceRe), (match) => match[1])
      )
    );
    return {
      name: rule.name,
      kind: rule.kind ?? null,
      anchors,
    };
  });
}

/**
 * Union file-path-derived anchors (subsection-granular repo files)
 * into the source-citation-derived links. File anchors are
 * authoritative — the repo path *is* the legal ID — so they fill in
 * rules whose ``source`` strings the citation regex can't parse.
 */
export function applyFileAnchors(
  links: EncodedRuleLink[],
  fileAnchors: Record<string, string[]>
): EncodedRuleLink[] {
  return links.map((link) => {
    const extra = fileAnchors[link.name];
    if (!extra || extra.length === 0) return link;
    const anchors = Array.from(new Set([...link.anchors, ...extra]));
    return anchors.length === link.anchors.length
      ? link
      : { ...link, anchors };
  });
}

/**
 * Rail scroll-spy chunks for corpus-row-backed sections. Body-parsed
 * sections hand the rail their BodyChunks; sections with real
 * descendant rows previously handed it nothing, leaving the rail
 * stuck in flat "everything" mode with no follow behavior. Each
 * top-level provision becomes one chunk whose text aggregates its
 * whole subtree, so per-node reference scoping keeps working.
 */
export function railChunksFromProvisions(
  provisions: SectionProvision[]
): Array<{ anchor: string; designator: string; label: string; text: string }> {
  const chunks: Array<{
    anchor: string;
    designator: string;
    label: string;
    text: string;
  }> = [];
  let current: (typeof chunks)[number] | null = null;
  for (const provision of provisions) {
    if (provision.relativeDepth === 1) {
      const heading = provision.rule.heading?.trim();
      current = {
        anchor: provision.anchor,
        designator: provision.designator,
        label: heading
          ? `${provision.designator} ${heading}`
          : provision.designator,
        text: provision.rule.body ?? "",
      };
      chunks.push(current);
    } else if (
      current &&
      provision.anchor.startsWith(`${current.anchor}-`) &&
      provision.rule.body
    ) {
      current.text += `\n${provision.rule.body}`;
    }
  }
  return chunks;
}

const LABEL_PREVIEW_LEN = 56;

function chunkLabel(designator: string, text: string): string {
  const firstLine = text.split("\n", 1)[0] ?? "";
  let rest = firstLine.replace(/^\([^)]+\)\s*/, "").trim();
  if (!rest) return designator;
  // The corpus flattens each subsection to one line, so the USLM
  // heading runs straight into the first nested marker or chapeau:
  // "(a) Allowance of credit (1) In general …", "(b) Percentages
  // and amounts For purposes of subsection (a)—". Cutting at those
  // boundaries recovers the clean heading.
  const nested = rest.search(/\s\((?:\d+|[A-Z])\)\s|\sFor purposes of\b/);
  if (nested > 0) rest = rest.slice(0, nested).trim();
  if (rest.length <= LABEL_PREVIEW_LEN) return `${designator} ${rest}`;
  const cut = rest.slice(0, LABEL_PREVIEW_LEN);
  const lastSpace = cut.lastIndexOf(" ");
  return `${designator} ${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Ordering rank for lowercase subsection designators: a < b < … < z
 * < aa < bb (USC doubles letters after z).
 */
function designatorRank(designator: string): number {
  return (
    (designator.length - 1) * 26 + (designator.charCodeAt(0) - 97)
  );
}

/**
 * Slice a section-granular body into top-level subsection chunks.
 *
 * A chunk starts at a line-leading "(a)"-style lowercase marker.
 * Nested markers — "(1)", "(A)", and roman "(i)" — must not open a
 * chunk, so markers are accepted only in strictly increasing
 * alphabetical order. Strictly increasing (rather than exactly
 * sequential) matters on real text: repealed subsections leave gaps
 * — current 26 USC § 32 runs (a)–(f) then jumps to (i)–(n).
 * Returns no chunks when fewer than two subsections are found — a
 * single match is more likely a false positive than a
 * one-subsection section.
 */
export function splitBodyIntoSubsections(body: string): {
  intro: string | null;
  chunks: BodyChunk[];
} {
  const markerRe = /^\(([a-z]{1,2})\)\s/gm;
  const boundaries: Array<{ designator: string; start: number }> = [];
  let previousRank = -1;
  let match: RegExpExecArray | null;
  while ((match = markerRe.exec(body)) !== null) {
    const designator = match[1];
    const rank = designatorRank(designator);
    if (rank <= previousRank) continue;
    boundaries.push({ designator, start: match.index });
    previousRank = rank;
  }

  if (boundaries.length < 2) {
    return { intro: null, chunks: [] };
  }

  const chunks: BodyChunk[] = boundaries.map((boundary, index) => {
    const end =
      index + 1 < boundaries.length ? boundaries[index + 1].start : body.length;
    const text = body.slice(boundary.start, end).replace(/\s+$/, "");
    return {
      anchor: boundary.designator,
      designator: `(${boundary.designator})`,
      label: chunkLabel(`(${boundary.designator})`, text),
      text,
      start: boundary.start,
    };
  });

  const introText = body.slice(0, boundaries[0].start).trim();
  return { intro: introText.length > 0 ? introText : null, chunks };
}

/**
 * References relevant to one chunk: outgoing refs whose citation
 * text appears in the chunk. RuleBody re-anchors offsets against the
 * chunk body, so offset translation is unnecessary.
 */
export function refsForChunk(
  refs: RuleReference[],
  chunkText: string
): RuleReference[] {
  return refs.filter(
    (ref) =>
      ref.direction === "outgoing" &&
      Boolean(ref.citation_text) &&
      chunkText.includes(ref.citation_text)
  );
}

/**
 * Stand-in section root for paths whose corpus rows exist only below
 * the section (subsection-granular ingestion with no section row).
 * The synthetic id never matches a DB row, so encoding lookups fall
 * through to the citation-path-keyed mirror, which is what actually
 * serves them.
 */
function synthesizeSectionRoot(
  citationPath: string,
  resolved: ReturnType<typeof resolveAxiomPath>,
  navLabel: string | undefined
): Rule {
  const segments = citationPath.split("/");
  return {
    id: `synthetic:${citationPath}`,
    jurisdiction: resolved.jurisdiction?.slug ?? segments[0],
    doc_type: segments[1] ?? "statute",
    parent_id: null,
    level: segments.length - 1,
    ordinal: null,
    heading: navLabel ?? null,
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: null,
    citation_path: citationPath,
    rulespec_path: null,
    has_rulespec: false,
    created_at: "",
    updated_at: "",
  };
}

async function getSubtreeProvisions(
  citationPath: string
): Promise<{ provisions: Rule[]; truncated: boolean }> {
  const result = await withTimeout(
    supabaseCorpus
      .from("current_provisions")
      .select("*")
      .gte("citation_path", `${citationPath}/`)
      .lt("citation_path", `${citationPath}~`)
      .limit(SUBTREE_LIMIT),
    SECTION_QUERY_TIMEOUT_MS,
    null
  );
  if (!result || result.error) return { provisions: [], truncated: false };
  // The range scan's upper bound (path + "~") also admits
  // letter-suffixed sibling sections ("…/1396a/e" sorts inside
  // ["…/1396/", "…/1396~") because "a" > "/"), so filter to true
  // descendants — otherwise a nonexistent section synthesizes a page
  // out of its siblings' provisions.
  const prefix = `${citationPath}/`;
  const rows = ((result.data ?? []) as Rule[]).filter(
    (row): row is Rule & { citation_path: string } =>
      Boolean(row.citation_path?.startsWith(prefix))
  );
  rows.sort((a, b) =>
    compareCitationPaths(a.citation_path as string, b.citation_path as string)
  );
  return { provisions: rows, truncated: rows.length >= SUBTREE_LIMIT };
}

/**
 * Drop a sort-key neighbour that belongs to a different UK act or
 * instrument. Neighbours are meant to be siblings; a flat navigation
 * index (no parent rows) makes the sibling group the whole
 * jurisdiction, which offers readers a jump into unrelated law.
 */
function neighborWithinInstrument(
  citationPath: string,
  neighbor: SectionNeighbor | null
): SectionNeighbor | null {
  if (!neighbor) return null;
  const parts = citationPath.split("/");
  if (parts[0] !== "uk" || !UK_LEGISLATION_CLASSES.has(parts[2] ?? "")) {
    return neighbor;
  }
  const instrumentPrefix = parts.slice(0, 5).join("/");
  return neighbor.citationPath.startsWith(`${instrumentPrefix}/`)
    ? neighbor
    : null;
}

async function getNeighbor(
  node: NavigationNodeRow,
  direction: "prev" | "next"
): Promise<SectionNeighbor | null> {
  let query = supabaseCorpus
    .from("navigation_nodes")
    .select("path, citation_path, label, sort_key")
    .eq("jurisdiction", node.jurisdiction)
    .eq("doc_type", node.doc_type)
    .limit(1);
  query =
    node.parent_path === null
      ? query.is("parent_path", null)
      : query.eq("parent_path", node.parent_path);
  query =
    direction === "next"
      ? query.gt("sort_key", node.sort_key).order("sort_key", {
          ascending: true,
        })
      : query.lt("sort_key", node.sort_key).order("sort_key", {
          ascending: false,
        });

  const result = await withTimeout(query, SECTION_QUERY_TIMEOUT_MS, null);
  if (!result || result.error) return null;
  const row = (result.data ?? [])[0] as
    | Pick<NavigationNodeRow, "path" | "citation_path" | "label">
    | undefined;
  if (!row) return null;
  return {
    citationPath: row.citation_path ?? row.path,
    label: row.label,
  };
}

async function getNavigationNode(
  path: string
): Promise<NavigationNodeRow | null> {
  const result = await withTimeout(
    supabaseCorpus
      .from("navigation_nodes")
      .select("*")
      .eq("path", path)
      .maybeSingle(),
    SECTION_QUERY_TIMEOUT_MS,
    null
  );
  if (!result || result.error) return null;
  return (result.data as NavigationNodeRow | null) ?? null;
}

/**
 * The resolution half of the section page: which ingested row (or
 * synthesized root) serves this URL. Split from data assembly so the
 * route can decide 404-vs-render before streaming anything, and so
 * container paths (a CFR part with navigable children but no corpus
 * row of its own) can divert to the browse view.
 */
export interface SectionResolution {
  root: Rule;
  citationPath: string;
  focusAnchor: string | null;
  /** True when no corpus row exists at the path itself and the root
   *  was synthesized over descendant rows — the signal that the path
   *  may be a navigation container rather than a section. */
  synthetic: boolean;
  /**
   * True when the path names a navigation container (a CFR part, a
   * statute chapter) rather than a section: no body text of its own
   * *and* a navigation node with children. The route diverts these
   * to the browse view. Sections stay readers — 7 USC 2017's nav
   * node has no children, and subsection-granular sections (42 USC
   * 1396a) have no nav node at all.
   */
  containerCandidate: boolean;
  prefetchedSubtree: { provisions: Rule[]; truncated: boolean } | null;
}

/**
 * Does the requested subsection anchor actually exist below this
 * ancestor? Ancestor fallback must never silently satisfy a URL with
 * unrelated ancestor content (…/7/2011 showing all of Title 7).
 */
function anchorExistsUnder(
  root: Rule,
  citationPath: string,
  anchor: string,
  subtree: { provisions: Rule[] }
): boolean {
  const found = subtree.provisions.some((rule) => {
    const relative = subtreeAnchor(
      citationPath,
      (rule.citation_path as string) ?? ""
    );
    return relative === anchor || relative.startsWith(`${anchor}-`);
  });
  if (found) return true;
  if (subtree.provisions.length === 0 && root.body) {
    return splitBodyIntoSubsections(root.body).chunks.some(
      (chunk) => chunk.anchor === anchor
    );
  }
  return false;
}

export async function resolveSection(
  segments: string[]
): Promise<SectionResolution | null> {
  const resolved = resolveAxiomPath(segments);
  if (
    resolved.phase !== "rule" ||
    !resolved.jurisdiction ||
    resolved.ruleSegments.length === 0
  ) {
    return null;
  }
  const slug = resolved.jurisdiction.slug;
  const ruleSegments = resolved.ruleSegments;
  const requestedPath = [slug, ...ruleSegments].join("/");

  // Resolve the deepest ingested row at or above the requested path.
  // The corpus is mostly section-granular, so subsection URLs
  // (…/26/32/a) resolve to their section with a focus anchor.
  let root = await getProvisionByCitationPath(requestedPath).catch(() => null);
  let citationPath = requestedPath;
  let focusAnchor: string | null = null;
  let synthetic = false;
  let prefetchedSubtree: Awaited<
    ReturnType<typeof getSubtreeProvisions>
  > | null = null;
  if (!root) {
    // Some sections are ingested subsection-granular with no section
    // row at all (42 USC 1396a: …/1396a/e/15 exists, …/1396a does
    // not). Climbing up would skip past them — probe the subtree
    // first and synthesize a root over it.
    const probe = await getSubtreeProvisions(requestedPath);
    if (probe.provisions.length > 0) {
      const navNode = await getNavigationNode(requestedPath);
      root = synthesizeSectionRoot(requestedPath, resolved, navNode?.label);
      synthetic = true;
      prefetchedSubtree = probe;
    }
  }
  if (!root) {
    // The corpus stores USC lettered sections with an en dash
    // (us/statute/42/1396u–1) but every human types a hyphen. Retry
    // with hyphens swapped in the rule segments (never the
    // jurisdiction slug) before giving up.
    const dashPath = [
      slug,
      ...ruleSegments.map((segment, index) =>
        index === 0 ? segment : segment.replace(/-/g, "–")
      ),
    ].join("/");
    if (dashPath !== requestedPath) {
      root = await getProvisionByCitationPath(dashPath).catch(() => null);
      if (root) {
        citationPath = dashPath;
      } else {
        const probe = await getSubtreeProvisions(dashPath);
        if (probe.provisions.length > 0) {
          const navNode = await getNavigationNode(dashPath);
          root = synthesizeSectionRoot(dashPath, resolved, navNode?.label);
          citationPath = dashPath;
          synthetic = true;
          prefetchedSubtree = probe;
        }
      }
    }
  }
  if (!root) {
    // GOV.UK taxonomy fork: encodings and their browse links live at
    // uk/policy/govuk/* while the corpus rows are at
    // uk/guidance/govuk/*. Resolve the twin so encoded-index links
    // reach the ingested text.
    const twinPath = ukGovukTaxonomyTwin(requestedPath);
    if (twinPath) {
      root = await getProvisionByCitationPath(twinPath).catch(() => null);
      if (root) {
        citationPath = twinPath;
      } else {
        const probe = await getSubtreeProvisions(twinPath);
        if (probe.provisions.length > 0) {
          const navNode = await getNavigationNode(twinPath);
          root = synthesizeSectionRoot(twinPath, resolved, navNode?.label);
          citationPath = twinPath;
          synthetic = true;
          prefetchedSubtree = probe;
        }
      }
    }
  }
  if (!root) {
    for (let end = ruleSegments.length - 1; end >= 2; end--) {
      const candidate = [slug, ...ruleSegments.slice(0, end)].join("/");
      const rule = await getProvisionByCitationPath(candidate).catch(
        () => null
      );
      if (rule) {
        // Only accept the ancestor if the requested anchor really
        // exists under it — otherwise …/7/2011 (missing) would render
        // Title 7 as though it satisfied the URL.
        const anchor = ruleSegments[end];
        const subtree = await getSubtreeProvisions(candidate);
        if (!anchorExistsUnder(rule, candidate, anchor, subtree)) {
          return null;
        }
        root = rule;
        citationPath = candidate;
        focusAnchor = anchor;
        prefetchedSubtree = subtree;
        break;
      }
    }
  }
  if (!root) return null;
  let containerCandidate = false;
  if (!root.body) {
    const navNode = await getNavigationNode(citationPath);
    containerCandidate = navNode?.has_children === true;
  }
  // UK container depths (class, year, act/instrument) must divert to
  // browse: the flat UK navigation index has no container rows, so
  // the has_children check above can never fire, and the synthetic
  // reader otherwise stitches a whole year of unrelated acts into
  // one column.
  if (!containerCandidate && synthetic) {
    const parts = citationPath.split("/");
    if (
      parts[0] === "uk" &&
      UK_LEGISLATION_CLASSES.has(parts[2] ?? "") &&
      parts.length <= 5
    ) {
      containerCandidate = true;
    }
  }
  return {
    root,
    citationPath,
    focusAnchor,
    synthetic,
    containerCandidate,
    prefetchedSubtree,
  };
}

/**
 * Trim the root body when descendant rows repeat its text (mixed
 * ingestion shapes: a subsection row whose body holds the whole
 * subsection *and* paragraph rows below it). Rendering both
 * duplicates statutory text. Keeps any chapeau before the first
 * repeated descendant; drops the body entirely when nothing precedes
 * it.
 */
export function dedupeRootBody(root: Rule, descendants: Rule[]): Rule {
  const body = root.body;
  if (!body) return root;
  const firstChildBody = descendants
    .map((rule) => rule.body?.trim() ?? "")
    .find((text) => text.length >= 20);
  if (!firstChildBody) return root;
  const needle = firstChildBody.slice(0, 60);
  const index = body.indexOf(needle);
  if (index < 0) return root;
  const intro = body.slice(0, index).trim();
  return { ...root, body: intro.length > 0 ? intro : null };
}

export async function getSectionPageData(
  segments: string[]
): Promise<SectionPageData | null> {
  const resolution = await resolveSection(segments);
  if (!resolution) return null;
  return getSectionPageDataFromResolution(resolution);
}

export async function getSectionPageDataFromResolution(
  resolution: SectionResolution
): Promise<SectionPageData | null> {
  const { citationPath, focusAnchor, prefetchedSubtree } = resolution;
  let root = resolution.root;

  const [subtree, rootRefs, node, sectionEncoding, programs, parityCases] =
    await Promise.all([
      prefetchedSubtree ?? getSubtreeProvisions(citationPath),
      getRuleReferences(citationPath).catch(() => [] as RuleReference[]),
      getNavigationNode(citationPath),
      getSectionEncoding(root.id, citationPath).catch(() => ({
        encoding: null,
        fileAnchors: {},
        ruleFiles: {},
      })),
      getProvisionCoverage(citationPath).catch(
        () => [] as ProvisionProgramCoverage[]
      ),
      listParityCases().catch(() => []),
    ]);
  const encoding = sectionEncoding.encoding;

  const refBody = root.body;
  root = dedupeRootBody(root, subtree.provisions);

  const rootDepth = citationPath.split("/").length;
  const provisions: SectionProvision[] = subtree.provisions.map((rule) => ({
    rule,
    anchor: subtreeAnchor(citationPath, rule.citation_path as string),
    designator: relativeDesignator(citationPath, rule.citation_path as string),
    relativeDepth: (rule.citation_path as string).split("/").length - rootDepth,
  }));

  const [prevRaw, nextRaw] = node
    ? await Promise.all([
        getNeighbor(node, "prev"),
        getNeighbor(node, "next"),
      ])
    : [null, null];
  // The UK navigation index is flat (leaves parented to root), so
  // sort-key neighbours span unrelated acts — s.141 SSCBA otherwise
  // offers a DLA section as "previous". Only offer prev/next within
  // the same act or instrument.
  const prev = neighborWithinInstrument(citationPath, prevRaw);
  const next = neighborWithinInstrument(citationPath, nextRaw);

  // Corpus rows are the preferred structure source; body parsing is
  // the fallback for section-granular corpora (the common case).
  const bodySplit =
    provisions.length === 0 && root.body
      ? splitBodyIntoSubsections(root.body)
      : { intro: null, chunks: [] };
  const toc =
    provisions.length > 0
      ? buildSectionToc(provisions)
      : bodySplit.chunks.map((chunk) => ({
          anchor: chunk.anchor,
          label: chunk.label,
          children: [],
        }));

  const encodedRules = applyFileAnchors(
    mapRulesToSubsections(citationPath, encoding?.rulespec_content ?? null),
    sectionEncoding.fileAnchors
  );

  // Coverage: which top-level subsections carry rules, out of how
  // many the section has.
  const unitAnchors =
    provisions.length > 0
      ? provisions
          .filter((provision) => provision.relativeDepth === 1)
          .map((provision) => provision.anchor)
      : bodySplit.chunks.map((chunk) => chunk.anchor);
  const encodedAnchors = new Set(
    encodedRules.flatMap((entry) => entry.anchors)
  );
  const encodedCoverage =
    unitAnchors.length > 0 && encodedRules.length > 0
      ? {
          encodedUnits: unitAnchors.filter((anchor) =>
            encodedAnchors.has(anchor)
          ).length,
          totalUnits: unitAnchors.length,
        }
      : null;

  // Oracle verification: the first covering program with an
  // external-oracle parity comparison.
  let parity: SectionPageData["parity"] = null;
  for (const program of programs) {
    const cases = parityCases.filter(
      (item) =>
        item.jurisdiction === program.jurisdiction &&
        item.program_id === program.programId &&
        item.oracles.length > 0
    );
    if (cases.length > 0) {
      parity = {
        oracle: cases[0].oracles[0],
        caseCount: cases.length,
        programId: program.programId,
        jurisdiction: program.jurisdiction,
        caseDescriptions: cases.map((item) => item.description),
      };
      break;
    }
  }

  return {
    citationPath,
    root,
    refBody,
    breadcrumbs: buildBreadcrumbs(citationPath.split("/")),
    provisions,
    intro: bodySplit.intro,
    bodyChunks: bodySplit.chunks,
    toc,
    rootRefs,
    encoding,
    encodedRules,
    programs,
    ruleFiles: sectionEncoding.ruleFiles,
    focusAnchor,
    prev,
    next,
    truncated: subtree.truncated,
    encodedCoverage,
    parity,
  };
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}
