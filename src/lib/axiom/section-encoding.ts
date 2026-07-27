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
  encodingRootPath: string | null = null
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
  };
}

function baseEncoding(
  runId: string,
  citation: string,
  filePath: string,
  content: string
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

function mergedContent(
  citationPath: string,
  ruleRaws: Record<string, unknown>[]
): string {
  return yaml.dump(
    {
      format: "rulespec/v1",
      module: { name: citationPath.split("/").join(".") },
      rules: ruleRaws,
    },
    { indent: 2, lineWidth: 100, noRefs: true, sortKeys: false }
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
  primaryMeta: RuleEncodingData | null
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

  // Single-file sections need no synthetic doc — serve the file
  // directly so file_path (GitHub link, sibling tests) stays real.
  if (sectionFile && descendantRuleCount === 0) {
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
    };
  }
  if (!sectionFile && descendants.length === 1) {
    const only = descendants[0];
    return {
      encodingRootPath: citationPath,
      encoding: baseEncoding(
        `github:${only.filePath}`,
        only.citationPath,
        only.filePath,
        only.content
      ),
      fileAnchors,
      ruleFiles,
    };
  }
  if (ruleRaws.length === 0) return emptyResult(primaryMeta, citationPath);

  const bucketDir = sectionFile
    ? sectionFile.filePath.replace(/\.yaml$/, "")
    : descendants[0].filePath.split("/").slice(0, -1).join("/");
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
  };
}

/**
 * One range scan over the mirror: the section's own file plus every
 * descendant, ordered root-first then by path.
 */
async function listMirrorFiles(
  citationPath: string
): Promise<SectionFile[] | null> {
  try {
    const result = await withTimeout(
      supabaseEncodings
        .from("rulespec_files")
        .select("citation_path, file_path, raw_yaml")
        .or(
          `citation_path.eq.${citationPath},citation_path.like.${citationPath}/*`
        )
        // Order in the database, before the limit — without this the
        // limit selects an arbitrary subset on sections with more
        // files than the cap, and can drop the section root itself.
        .order("citation_path", { ascending: true })
        .limit(MAX_SECTION_FILES),
      QUERY_TIMEOUT_MS,
      null
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

/**
 * Nearest ANCESTOR rulespec file for a request deeper than the
 * encoded granularity: one `in.()` probe over the ancestor chain
 * (never above jurisdiction/bucket/title), deepest hit wins. This is
 * how a paragraph page under a section-granular module (7 CFR
 * 273.10(e)(2)(ii)(A) under regulations/7-cfr/273/10.yaml) still
 * finds its encoding.
 */
async function findAncestorFile(
  citationPath: string
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
      null
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
  citationPath: string
): Promise<SectionEncoding> {
  const mirror = await listMirrorFiles(citationPath);
  if (mirror && mirror.length > 0) {
    const sectionFile =
      mirror.find((file) => file.citationPath === citationPath) ?? null;
    const descendants = mirror.filter(
      (file) => file.citationPath !== citationPath
    );
    return assembleSection(citationPath, sectionFile, descendants, null);
  }
  // Nothing at or below the request: the request may be DEEPER than
  // the encoded file. Serve the nearest ancestor module; the page
  // layer re-joins its rules by source citation.
  const ancestor = await findAncestorFile(citationPath);
  if (ancestor) {
    return assembleSection(ancestor.citationPath, ancestor, [], null);
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
        const res = await fetchEncodedFile(file.citationPath).catch(
          () => null
        );
        return res
          ? {
              citationPath: file.citationPath,
              filePath: file.filePath,
              content: res.content,
            }
          : null;
      })
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
