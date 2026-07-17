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
import type { NavigationNodeRow } from "@/lib/axiom/navigation-index/types";
import { parseRuleSpec } from "@/lib/axiom/rulespec/doc";
import {
  getProvisionCoverage,
  type ProvisionProgramCoverage,
} from "@/lib/axiom/runtime/coverage";
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
  const rows = ((result.data ?? []) as Rule[]).filter(
    (row): row is Rule & { citation_path: string } =>
      Boolean(row.citation_path)
  );
  rows.sort((a, b) =>
    compareCitationPaths(a.citation_path as string, b.citation_path as string)
  );
  return { provisions: rows, truncated: rows.length >= SUBTREE_LIMIT };
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

export async function getSectionPageData(
  segments: string[]
): Promise<SectionPageData | null> {
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
  if (!root) {
    for (let end = ruleSegments.length - 1; end >= 2; end--) {
      const candidate = [slug, ...ruleSegments.slice(0, end)].join("/");
      const rule = await getProvisionByCitationPath(candidate).catch(
        () => null
      );
      if (rule) {
        root = rule;
        citationPath = candidate;
        focusAnchor = ruleSegments[end];
        break;
      }
    }
  }
  if (!root) return null;

  const [subtree, rootRefs, node, sectionEncoding, programs] =
    await Promise.all([
      getSubtreeProvisions(citationPath),
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
    ]);
  const encoding = sectionEncoding.encoding;

  const rootDepth = citationPath.split("/").length;
  const provisions: SectionProvision[] = subtree.provisions.map((rule) => ({
    rule,
    anchor: subtreeAnchor(citationPath, rule.citation_path as string),
    designator: relativeDesignator(citationPath, rule.citation_path as string),
    relativeDepth: (rule.citation_path as string).split("/").length - rootDepth,
  }));

  const [prev, next] = node
    ? await Promise.all([
        getNeighbor(node, "prev"),
        getNeighbor(node, "next"),
      ])
    : [null, null];

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

  return {
    citationPath,
    root,
    breadcrumbs: buildBreadcrumbs(citationPath.split("/")),
    provisions,
    intro: bodySplit.intro,
    bodyChunks: bodySplit.chunks,
    toc,
    rootRefs,
    encoding,
    encodedRules: applyFileAnchors(
      mapRulesToSubsections(citationPath, encoding?.rulespec_content ?? null),
      sectionEncoding.fileAnchors
    ),
    programs,
    ruleFiles: sectionEncoding.ruleFiles,
    focusAnchor,
    prev,
    next,
    truncated: subtree.truncated,
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
