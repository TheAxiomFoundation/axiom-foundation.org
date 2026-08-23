import { parseRuleSpec } from "../../src/lib/axiom/rulespec/doc.ts";

export const MAX_SOURCE_CITATION_PATHS = 5_000;

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function normalizeCitationPath(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^\/+/, "").trim();
  return normalized || null;
}

/**
 * Collect the corpus citation paths a RuleSpec document declares.
 *
 * Two sets with different meanings:
 * - ``all``: every declared source — the module-level
 *   ``source_verification.corpus_citation_paths`` list plus every
 *   proof atom's ``source.corpus_citation_path``.
 * - ``values``: only paths cited by ``kind: parameter`` proof atoms —
 *   the provisions whose CONTENT the module encodes (rate tables,
 *   membership lists). Condition/formula atoms reference a provision
 *   without encoding it (the tariff chapter compositions all cite the
 *   witness beer line from regime-guard formulas), so the reverse
 *   index that answers "which modules encode this provision?" must
 *   key on value atoms alone or every composition floods every page
 *   its guards mention.
 */
export function extractCitationPathSets(content) {
  if (typeof content !== "string") return { all: [], values: [] };

  let doc;
  try {
    doc = parseRuleSpec(content);
  } catch {
    return { all: [], values: [] };
  }
  const all = new Set();
  const values = new Set();
  const addPath = (set, value) => {
    const normalized = normalizeCitationPath(value);
    if (normalized) set.add(normalized);
  };

  const modulePaths = doc.module.source_verification?.corpus_citation_paths;
  if (Array.isArray(modulePaths)) {
    for (const path of modulePaths) addPath(all, path);
  }

  for (const rule of doc.rules) {
    const metadata = asRecord(rule.raw.metadata);
    const proof = asRecord(metadata?.proof);
    const atoms = proof?.atoms;
    if (!Array.isArray(atoms)) continue;

    for (const atomValue of atoms) {
      const atom = asRecord(atomValue);
      const source = asRecord(atom?.source);
      addPath(all, source?.corpus_citation_path);
      if (atom?.kind === "parameter") {
        addPath(values, source?.corpus_citation_path);
      }
    }
  }

  return { all: [...all], values: [...values] };
}

/** Back-compat single-set view: every declared source path. */
export function extractSourceCitationPaths(content) {
  return extractCitationPathSets(content).all;
}

function capped(paths, label, filePath, warn) {
  if (paths.length <= MAX_SOURCE_CITATION_PATHS) return paths;
  warn(
    `${label} capped at ${MAX_SOURCE_CITATION_PATHS} entries for ${filePath}`,
  );
  return paths.slice(0, MAX_SOURCE_CITATION_PATHS);
}

/**
 * Apply the mirror's per-row array bound and warn when declarations
 * overflow it. Returns both citation-path sets, capped independently.
 */
export function citationPathSetsForFile(
  content,
  filePath,
  warn = console.warn,
) {
  const sets = extractCitationPathSets(content);
  return {
    all: capped(sets.all, "source_citation_paths", filePath, warn),
    values: capped(sets.values, "value_citation_paths", filePath, warn),
  };
}
