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
 * Collect the corpus citation paths a RuleSpec document declares it encodes.
 * Module-level declarations come first, followed by proof atoms in rule order.
 */
export function extractSourceCitationPaths(content) {
  if (typeof content !== "string") return [];

  const doc = parseRuleSpec(content);
  const paths = new Set();
  const addPath = (value) => {
    const normalized = normalizeCitationPath(value);
    if (normalized) paths.add(normalized);
  };

  const modulePaths = doc.module.source_verification?.corpus_citation_paths;
  if (Array.isArray(modulePaths)) {
    for (const path of modulePaths) addPath(path);
  }

  for (const rule of doc.rules) {
    const metadata = asRecord(rule.raw.metadata);
    const proof = asRecord(metadata?.proof);
    const atoms = proof?.atoms;
    if (!Array.isArray(atoms)) continue;

    for (const atomValue of atoms) {
      const atom = asRecord(atomValue);
      const source = asRecord(atom?.source);
      addPath(source?.corpus_citation_path);
    }
  }

  return [...paths];
}

/**
 * Apply the mirror's per-row array bound and warn when declarations overflow it.
 */
export function sourceCitationPathsForFile(
  content,
  filePath,
  warn = console.warn,
) {
  const paths = extractSourceCitationPaths(content);
  if (paths.length <= MAX_SOURCE_CITATION_PATHS) return paths;

  warn(
    `source_citation_paths capped at ${MAX_SOURCE_CITATION_PATHS} entries for ${filePath}`,
  );
  return paths.slice(0, MAX_SOURCE_CITATION_PATHS);
}
