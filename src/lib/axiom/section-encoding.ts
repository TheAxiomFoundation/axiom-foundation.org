import yaml from "js-yaml";
import { getRuleEncoding, type RuleEncodingData } from "@/lib/supabase";
import {
  findEncodedDescendants,
  fetchEncodedFile,
  type EncodedFile,
} from "@/lib/axiom/rulespec/repo-listing";
import { parseRuleSpec } from "@/lib/axiom/rulespec/doc";

/**
 * Section-level encoding assembly for the v2 reader.
 *
 * The rulespec-* repos are migrating from one YAML per section
 * (``statutes/26/32.yaml``) to one YAML per subsection
 * (``statutes/7/2017/a.yaml``, ``statutes/26/32/c/2.yaml``); the
 * nested layout is already the majority. ``getRuleEncoding`` only
 * walks *up* the hierarchy, so on its own a section page misses
 * every descendant file. This module aggregates them: primary
 * section encoding (DB run or section-level file) plus all encoded
 * descendants, merged into one RuleSpec doc for the rail.
 */

export interface SectionEncoding {
  encoding: RuleEncodingData | null;
  /**
   * Top-level subsection anchors keyed by rule name, derived from
   * descendant file paths (``…/32/c/2.yaml`` → rules anchor to "c").
   * Authoritative where present — the file path supplies the legal
   * ID — with the source-citation regex as fallback for rules from
   * section-level files.
   */
  fileAnchors: Record<string, string[]>;
}

/** Bound on descendant fetches per section. 26 USC 32 has 1 nested
 *  file today; deep regulation trees stay bounded. Raw fetches are
 *  cached (5 min memory + 1 h Next revalidate), so the steady-state
 *  cost is far below the worst case. */
const MAX_DESCENDANT_FILES = 24;

function emptyResult(
  encoding: RuleEncodingData | null
): SectionEncoding {
  return { encoding, fileAnchors: {} };
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

export async function getSectionEncoding(
  rootId: string,
  citationPath: string
): Promise<SectionEncoding> {
  const [primary, descendants] = await Promise.all([
    getRuleEncoding(rootId).catch(() => null),
    findEncodedDescendants(citationPath).catch(() => [] as EncodedFile[]),
  ]);
  const limited = descendants.slice(0, MAX_DESCENDANT_FILES);
  if (limited.length === 0) return emptyResult(primary);

  const fetched = (
    await Promise.all(
      limited.map(async (file) => {
        const res = await fetchEncodedFile(file.citationPath).catch(
          () => null
        );
        return res ? { file, content: res.content } : null;
      })
    )
  ).filter((item): item is { file: EncodedFile; content: string } =>
    Boolean(item)
  );
  if (fetched.length === 0) return emptyResult(primary);

  // Merge: primary rules first (most specific DB/section source),
  // then descendant-file rules, deduped by name.
  const seenNames = new Set<string>();
  const ruleRaws: Record<string, unknown>[] = [];
  const fileAnchors: Record<string, string[]> = {};
  const primaryDoc = primary?.rulespec_content
    ? parseRuleSpec(primary.rulespec_content)
    : null;
  for (const rule of primaryDoc?.rules ?? []) {
    if (seenNames.has(rule.name)) continue;
    seenNames.add(rule.name);
    ruleRaws.push(rule.raw);
  }

  const sectionPrefix = `${citationPath}/`;
  let descendantRuleCount = 0;
  for (const { file, content } of fetched) {
    const doc = parseRuleSpec(content);
    const anchor =
      file.citationPath.slice(sectionPrefix.length).split("/")[0] || null;
    for (const rule of doc.rules) {
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
  // Descendants that only re-state primary rules add no doc content,
  // but their path-derived anchors still improve the rail mapping.
  if (descendantRuleCount === 0) return { encoding: primary, fileAnchors };

  // A lone descendant file with no primary needs no synthetic doc —
  // serve it directly so file_path (GitHub link, sibling tests)
  // stays real.
  if (!primary && fetched.length === 1) {
    const { file, content } = fetched[0];
    return {
      encoding: {
        encoding_run_id: `github:${file.filePath}`,
        citation: file.citationPath,
        session_id: null,
        file_path: file.filePath,
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
      },
      fileAnchors,
    };
  }

  // Synthetic merged doc. ``file_path`` is the section's repo
  // directory (no ``.yaml``): the GitHub link resolves to the tree
  // and the sibling-test probe skips itself (no ``.yaml`` suffix to
  // rewrite).
  const bucketDir =
    primary?.file_path?.replace(/\.yaml$/, "") ??
    fetched[0].file.filePath.split("/").slice(0, -1).join("/");
  return {
    encoding: {
      encoding_run_id: `github-merged:${citationPath}`,
      citation: citationPath,
      session_id: null,
      file_path: bucketDir,
      rulespec_content: mergedContent(citationPath, ruleRaws),
      final_scores: primary?.final_scores ?? null,
      iterations: null,
      total_duration_ms: null,
      agent_type: primary?.agent_type ?? null,
      agent_model: primary?.agent_model ?? null,
      data_source: primary?.data_source ?? null,
      has_issues: primary?.has_issues ?? null,
      note: primary?.note ?? null,
      timestamp: primary?.timestamp ?? null,
      encoder_version: primary?.encoder_version ?? null,
    },
    fileAnchors,
  };
}
