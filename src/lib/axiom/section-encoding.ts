import yaml from "js-yaml";
import {
  getRuleEncoding,
  supabaseEncodings,
  type RuleEncodingData,
} from "@/lib/supabase";
import {
  findEncodedDescendants,
  fetchEncodedFile,
  type EncodedFile,
} from "@/lib/axiom/rulespec/repo-listing";
import { ruleEncodesProvision } from "@/lib/axiom/rulespec/source-citations";
import { parseRuleSpec } from "@/lib/axiom/rulespec/doc";

/**
 * Section-level encoding assembly for the v2 reader.
 *
 * Primary source: ``encodings.rulespec_files`` — a live-synced mirror
 * of the rulespec-* repos (citation_path, file_path, raw_yaml,
 * synced_at) — queried with one range scan per section, the same
 * pattern the corpus text reads use. This replaces request-time
 * GitHub reads and stops stale ``encoding_runs`` telemetry rows from
 * shadowing the repo state.
 *
 * The repos are subsection-granular where it matters
 * (``statutes/7/2017/a.yaml``, ``statutes/26/32/c/2.yaml``), so a
 * section's encoding is the merge of every file at or under its
 * citation path. The legacy path (encoding_runs content → GitHub
 * raw walk-up + descendant fetches) survives only as a fallback for
 * sections the mirror hasn't synced.
 */

export interface SectionEncoding {
  encoding: RuleEncodingData | null;
  /**
   * Citation path the encoding is homed at. Usually the requested
   * path; when the request was DEEPER than the encoded file (a
   * paragraph page under a section-granular module like
   * regulations/7-cfr/273/10), this is the nearest ancestor that has
   * a rulespec file — the reader then matches rules to the deep page
   * by their source citations instead of file anchors.
   */
  encodingRootPath: string | null;
  /**
   * Top-level subsection anchors keyed by rule name, derived from
   * descendant file paths (``…/32/c/2.yaml`` → rules anchor to "c").
   * Authoritative where present — the file path supplies the legal
   * ID — with the source-citation regex as fallback for rules from
   * section-level files.
   */
  fileAnchors: Record<string, string[]>;
  /**
   * Repo file path (bucket-rooted, ``statutes/7/2017/a.yaml``) keyed
   * by rule name — each rule's home file, i.e. the file half of its
   * durable legal ID. Feeds per-rule graph links.
   */
  ruleFiles: Record<string, string>;
  /**
   * Modules whose value proof atoms cite this provision,
   * but whose own citation path may live in a different bucket (for
   * example a policy-rooted tariff module citing an HTS line).
   */
  citedByFiles: Array<{
    citationPath: string;
    filePath: string;
    /** Names (as rendered) of the rules this file contributed — only
     *  rules that encode this provision; a rule whose name collides
     *  with an earlier one is rendered as ``name@module``. */
    ruleNames: string[];
  }>;
  /**
   * Citing modules beyond the file bound, when the mirror reported
   * more matches than were fetched. Zero when every citer is shown
   * or the count was unavailable.
   */
  citedByOverflow: number;
}

/** Bound on files merged per section; deep regulation trees stay
 *  bounded. 26 USC 32 has 2 files today. */
const MAX_SECTION_FILES = 60;
const QUERY_TIMEOUT_MS = 4000;

interface SectionFile {
  citationPath: string;
  filePath: string;
  content: string;
}

function emptyResult(
  encoding: RuleEncodingData | null,
  encodingRootPath: string | null = null,
): SectionEncoding {
  // Even a lone primary file yields rule→file provenance so rule
  // cards can deep-link into the graph.
  const ruleFiles: Record<string, string> = {};
  if (encoding?.rulespec_content && encoding.file_path) {
    for (const rule of parseRuleSpec(encoding.rulespec_content).rules) {
      ruleFiles[rule.name] ??= encoding.file_path;
    }
  }
  return {
    encoding,
    encodingRootPath: encoding ? encodingRootPath : null,
    fileAnchors: {},
    ruleFiles,
    citedByFiles: [],
    citedByOverflow: 0,
  };
}

function baseEncoding(
  runId: string,
  citation: string,
  filePath: string,
  content: string,
): RuleEncodingData {
  return {
    encoding_run_id: runId,
    citation,
    session_id: null,
    file_path: filePath,
    rulespec_content: content,
    final_scores: null,
    iterations: null,
    total_duration_ms: null,
    agent_type: null,
    agent_model: null,
    data_source: null,
    has_issues: null,
    note: null,
    timestamp: null,
    encoder_version: null,
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergedContent(
  citationPath: string,
  ruleRaws: Record<string, unknown>[],
): string {
  return yaml.dump(
    {
      format: "rulespec/v1",
      module: { name: citationPath.split("/").join(".") },
      rules: ruleRaws,
    },
    { indent: 2, lineWidth: 100, noRefs: true, sortKeys: false },
  );
}

/**
 * Merge a section-level doc (optional) with descendant files into
 * one encoding + file-derived anchors. ``primaryMeta`` (a DB run)
 * contributes run metadata when present.
 */
function assembleSection(
  citationPath: string,
  sectionFile: SectionFile | null,
  descendants: SectionFile[],
  primaryMeta: RuleEncodingData | null,
  ancestor: SectionFile | null = null,
  citedBy: SectionFile[] = [],
  citedByOverflow = 0,
): SectionEncoding {
  const seenNames = new Set<string>();
  const ruleRaws: Record<string, unknown>[] = [];
  const fileAnchors: Record<string, string[]> = {};
  const ruleFiles: Record<string, string> = {};

  const sectionDoc = sectionFile ? parseRuleSpec(sectionFile.content) : null;
  for (const rule of sectionDoc?.rules ?? []) {
    ruleFiles[rule.name] ??= sectionFile!.filePath;
    if (seenNames.has(rule.name)) continue;
    seenNames.add(rule.name);
    ruleRaws.push(rule.raw);
  }

  const prefix = `${citationPath}/`;
  let descendantRuleCount = 0;
  for (const file of descendants) {
    const doc = parseRuleSpec(file.content);
    const anchor = file.citationPath.slice(prefix.length).split("/")[0] || null;
    for (const rule of doc.rules) {
      ruleFiles[rule.name] ??= file.filePath;
      if (anchor) {
        const anchors = (fileAnchors[rule.name] ??= []);
        if (!anchors.includes(anchor)) anchors.push(anchor);
      }
      if (seenNames.has(rule.name)) continue;
      seenNames.add(rule.name);
      ruleRaws.push(rule.raw);
      descendantRuleCount++;
    }
  }

  // A deep path's rules can be split between files below it and the
  // nearest ancestor module: …/32/c has earned-income in 32/c/2.yaml
  // while eitc_qualifying_child cites 32(c)(3) from 32.yaml. Merge the
  // ancestor's rules whose source citations reach this path, anchoring
  // each to the citation's next segment below it.
  let ancestorRuleCount = 0;
  if (ancestor && citationPath.startsWith(`${ancestor.citationPath}/`)) {
    const rel = citationPath
      .slice(ancestor.citationPath.length + 1)
      .split("/")
      .map((segment) => segment.toLowerCase());
    const section = ancestor.citationPath.split("/").at(-1) ?? "";
    // Lookbehind keeps a short section number ("7") from matching
    // inside a longer one ("2017(a)"). Dots and dashes must remain
    // valid separators: regulation paths split "273/10", while their
    // source citations spell the section "273.10(e)".
    const chainRe = new RegExp(
      `(?<!\\w)${escapeRegExp(section)}((?:\\s*\\([A-Za-z0-9]{1,4}\\))+)`,
      "g",
    );
    for (const rule of parseRuleSpec(ancestor.content).rules) {
      const source = rule.source ?? "";
      let cited = false;
      const anchors = new Set<string>();
      for (const match of source.matchAll(chainRe)) {
        const segments = Array.from(
          match[1].matchAll(/\(([A-Za-z0-9]{1,4})\)/g),
          (seg) => seg[1],
        );
        const lower = segments.map((segment) => segment.toLowerCase());
        const within =
          lower.length >= rel.length &&
          rel.every((segment, index) => lower[index] === segment);
        if (!within) continue;
        cited = true;
        const next = segments[rel.length];
        if (next) anchors.add(next);
      }
      if (!cited) continue;
      ruleFiles[rule.name] ??= ancestor.filePath;
      for (const anchor of anchors) {
        const list = (fileAnchors[rule.name] ??= []);
        if (!list.includes(anchor)) list.push(anchor);
      }
      if (seenNames.has(rule.name)) continue;
      seenNames.add(rule.name);
      ruleRaws.push(rule.raw);
      ancestorRuleCount++;
    }
  }

  let citedByRuleCount = 0;
  // Cited-by modules contribute only the rules that encode THIS
  // provision (singular module source == the provision, or a
  // value-bearing atom citing it) — never the whole file. A chapter
  // composition that encodes one overlay heading among seventy rules
  // shows that one rule here. Names are module-scoped in RuleSpec, so
  // a rule whose name is already taken (by a path-matched rule or an
  // earlier citing module) is rendered as ``name@module`` rather than
  // silently dropped or misattributed.
  const citedByFiles = citedBy.flatMap((file) => {
    const doc = parseRuleSpec(file.content);
    const moduleTag = file.citationPath.split("/").at(-1) ?? file.citationPath;
    const ruleNames: string[] = [];
    for (const rule of doc.rules) {
      if (!ruleEncodesProvision(doc, rule, citationPath)) continue;
      const renderedName = seenNames.has(rule.name)
        ? `${rule.name}@${moduleTag}`
        : rule.name;
      if (seenNames.has(renderedName)) continue;
      seenNames.add(renderedName);
      ruleFiles[renderedName] ??= file.filePath;
      ruleRaws.push(
        renderedName === rule.name
          ? rule.raw
          : { ...rule.raw, name: renderedName },
      );
      ruleNames.push(renderedName);
      citedByRuleCount++;
    }
    if (ruleNames.length === 0) return [];
    return [
      {
        citationPath: file.citationPath,
        filePath: file.filePath,
        ruleNames,
      },
    ];
  });

  // Single-file sections need no synthetic doc — serve the file
  // directly so file_path (GitHub link, sibling tests) stays real.
  if (sectionFile && descendantRuleCount === 0 && citedByRuleCount === 0) {
    return {
      encodingRootPath: citationPath,
      encoding: {
        ...(primaryMeta ?? baseEncoding("", "", "", "")),
        encoding_run_id:
          primaryMeta?.encoding_run_id || `github:${sectionFile.filePath}`,
        citation: primaryMeta?.citation || citationPath,
        file_path: sectionFile.filePath,
        rulespec_content: sectionFile.content,
      },
      fileAnchors,
      ruleFiles,
      citedByFiles,
      citedByOverflow,
    };
  }
  if (
    !sectionFile &&
    descendants.length === 1 &&
    ancestorRuleCount === 0 &&
    citedByRuleCount === 0
  ) {
    const only = descendants[0];
    return {
      encodingRootPath: citationPath,
      encoding: baseEncoding(
        `github:${only.filePath}`,
        only.citationPath,
        only.filePath,
        only.content,
      ),
      fileAnchors,
      ruleFiles,
      citedByFiles,
      citedByOverflow,
    };
  }
  if (ruleRaws.length === 0) {
    return {
      ...emptyResult(primaryMeta, citationPath),
      citedByFiles,
      citedByOverflow,
    };
  }

  const bucketDir = sectionFile
    ? sectionFile.filePath.replace(/\.yaml$/, "")
    : (descendants[0] ?? citedBy[0]).filePath.split("/").slice(0, -1).join("/");
  return {
    encodingRootPath: citationPath,
    encoding: {
      ...(primaryMeta ?? baseEncoding("", "", "", "")),
      encoding_run_id: `github:merged:${citationPath}`,
      citation: citationPath,
      session_id: primaryMeta?.session_id ?? null,
      file_path: bucketDir,
      rulespec_content: mergedContent(citationPath, ruleRaws),
    },
    fileAnchors,
    ruleFiles,
    citedByFiles,
    citedByOverflow,
  };
}

/**
 * One range scan over the mirror: the section's own file plus every
 * descendant, ordered root-first then by path.
 */
async function listMirrorFiles(
  citationPath: string,
): Promise<SectionFile[] | null> {
  try {
    const result = await withTimeout(
      supabaseEncodings
        .from("rulespec_files")
        .select("citation_path, file_path, raw_yaml")
        .or(
          `citation_path.eq.${citationPath},citation_path.like.${citationPath}/*`,
        )
        // Order in the database, before the limit — without this the
        // limit selects an arbitrary subset on sections with more
        // files than the cap, and can drop the section root itself.
        .order("citation_path", { ascending: true })
        .limit(MAX_SECTION_FILES),
      QUERY_TIMEOUT_MS,
      null,
    );
    if (!result || result.error) return null;
    const rows = (result.data ?? []) as Array<{
      citation_path: string;
      file_path: string;
      raw_yaml: string | null;
    }>;
    return rows
      .filter((row) => row.raw_yaml && row.raw_yaml.trim().length > 0)
      .map((row) => ({
        citationPath: row.citation_path,
        filePath: row.file_path,
        content: row.raw_yaml as string,
      }))
      .sort((a, b) => a.citationPath.localeCompare(b.citationPath));
  } catch {
    return null;
  }
}

interface CitedByLookup {
  files: SectionFile[];
  /** Matching rows the mirror reported beyond those fetched. */
  overflow: number;
}

const NO_CITED_BY: CitedByLookup = { files: [], overflow: 0 };

/**
 * Reverse lookup for modules that encode the requested provision:
 * rows whose ``value_citation_paths`` (singular module source plus
 * value-bearing proof atoms — see rulespec/source-citations.ts)
 * contain it. Separate from the path range scan because policy-rooted
 * modules do not live under their statute paths. Bounded to
 * MAX_SECTION_FILES files in citation-path order; the exact match
 * count rides along so the page can say how many citers it is not
 * showing instead of truncating silently. Failure is intentionally an
 * empty extra group: a missing column, timeout, or transient error
 * must not hide path-matched encodings.
 */
async function listCitedByFiles(citationPath: string): Promise<CitedByLookup> {
  try {
    const result = await withTimeout(
      supabaseEncodings
        .from("rulespec_files")
        .select("citation_path, file_path, raw_yaml", { count: "exact" })
        .contains("value_citation_paths", [citationPath])
        .order("citation_path", { ascending: true })
        .limit(MAX_SECTION_FILES),
      QUERY_TIMEOUT_MS,
      null,
    );
    if (!result || result.error) return NO_CITED_BY;
    const rows = (result.data ?? []) as Array<{
      citation_path: string;
      file_path: string;
      raw_yaml: string | null;
    }>;
    const files = rows
      .filter((row) => row.raw_yaml && row.raw_yaml.trim().length > 0)
      .map((row) => ({
        citationPath: row.citation_path,
        filePath: row.file_path,
        content: row.raw_yaml as string,
      }))
      .sort((a, b) => a.citationPath.localeCompare(b.citationPath));
    const count = typeof result.count === "number" ? result.count : rows.length;
    return { files, overflow: Math.max(0, count - rows.length) };
  } catch {
    return NO_CITED_BY;
  }
}

function excludePathMatchedFiles(
  citedBy: SectionFile[],
  pathMatched: SectionFile[],
): SectionFile[] {
  const seen = new Set(pathMatched.map((file) => file.filePath));
  return citedBy.filter((file) => {
    if (seen.has(file.filePath)) return false;
    seen.add(file.filePath);
    return true;
  });
}

/**
 * Nearest ANCESTOR rulespec file for a request deeper than the
 * encoded granularity: one `in.()` probe over the ancestor chain
 * (never above jurisdiction/bucket/title), deepest hit wins. This is
 * how a paragraph page under a section-granular module (7 CFR
 * 273.10(e)(2)(ii)(A) under regulations/7-cfr/273/10.yaml) still
 * finds its encoding.
 */
async function findAncestorFile(
  citationPath: string,
): Promise<SectionFile | null> {
  const segments = citationPath.split("/");
  const ancestors: string[] = [];
  for (let depth = segments.length - 1; depth >= 3; depth--) {
    ancestors.push(segments.slice(0, depth).join("/"));
  }
  if (ancestors.length === 0) return null;
  try {
    const result = await withTimeout(
      supabaseEncodings
        .from("rulespec_files")
        .select("citation_path, file_path, raw_yaml")
        .in("citation_path", ancestors)
        .order("citation_path", { ascending: false })
        .limit(ancestors.length),
      QUERY_TIMEOUT_MS,
      null,
    );
    if (!result || result.error) return null;
    const rows = (result.data ?? []) as Array<{
      citation_path: string;
      file_path: string;
      raw_yaml: string | null;
    }>;
    const best = rows
      .filter((row) => row.raw_yaml && row.raw_yaml.trim().length > 0)
      .sort((a, b) => b.citation_path.length - a.citation_path.length)[0];
    return best
      ? {
          citationPath: best.citation_path,
          filePath: best.file_path,
          content: best.raw_yaml as string,
        }
      : null;
  } catch {
    return null;
  }
}

export async function getSectionEncoding(
  rootId: string,
  citationPath: string,
): Promise<SectionEncoding> {
  const [mirror, citedByLookup] = await Promise.all([
    listMirrorFiles(citationPath),
    listCitedByFiles(citationPath),
  ]);
  const citedBy = citedByLookup.files;
  const citedByOverflow = citedByLookup.overflow;
  if (mirror && mirror.length > 0) {
    const sectionFile =
      mirror.find((file) => file.citationPath === citationPath) ?? null;
    const descendants = mirror.filter(
      (file) => file.citationPath !== citationPath,
    );
    // No exact file at this path means it may be a deep page whose
    // remaining rules live in an ancestor module — probe for it so
    // subsection-granular files don't shadow the section file's rules.
    const ancestor = sectionFile ? null : await findAncestorFile(citationPath);
    const citedByOnly = excludePathMatchedFiles(
      citedBy,
      ancestor ? [...mirror, ancestor] : mirror,
    );
    return assembleSection(
      citationPath,
      sectionFile,
      descendants,
      null,
      ancestor,
      citedByOnly,
      citedByOverflow,
    );
  }
  // Nothing at or below the request: the request may be DEEPER than
  // the encoded file. Serve the nearest ancestor module; the page
  // layer re-joins its rules by source citation.
  const ancestor = await findAncestorFile(citationPath);
  if (ancestor) {
    const citedByOnly = mirror
      ? excludePathMatchedFiles(citedBy, [ancestor])
      : [];
    if (citedByOnly.length > 0) {
      return assembleSection(
        citationPath,
        null,
        [],
        null,
        ancestor,
        citedByOnly,
        citedByOverflow,
      );
    }
    return assembleSection(ancestor.citationPath, ancestor, [], null);
  }

  // A successful path scan can legitimately be empty when all
  // encodings for the provision are homed in policy buckets.
  if (mirror && citedBy.length > 0) {
    return assembleSection(
      citationPath,
      null,
      [],
      null,
      null,
      citedBy,
      citedByOverflow,
    );
  }

  // Mirror miss (not yet synced, or query failure): legacy path —
  // encoding_runs content / GitHub raw walk-up, plus descendant
  // fetches from GitHub.
  const [primary, repoDescendants] = await Promise.all([
    getRuleEncoding(rootId).catch(() => null),
    findEncodedDescendants(citationPath).catch(() => [] as EncodedFile[]),
  ]);
  const limited = repoDescendants.slice(0, MAX_SECTION_FILES);
  if (limited.length === 0) return emptyResult(primary, citationPath);

  const fetched = (
    await Promise.all(
      limited.map(async (file) => {
        const res = await fetchEncodedFile(file.citationPath).catch(() => null);
        return res
          ? {
              citationPath: file.citationPath,
              filePath: file.filePath,
              content: res.content,
            }
          : null;
      }),
    )
  ).filter((item): item is SectionFile => Boolean(item));
  if (fetched.length === 0) return emptyResult(primary, citationPath);

  const sectionFile = primary?.rulespec_content
    ? {
        citationPath,
        filePath: primary.file_path,
        content: primary.rulespec_content,
      }
    : null;
  return assembleSection(citationPath, sectionFile, fetched, primary);
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T,
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
      },
    );
  });
}
