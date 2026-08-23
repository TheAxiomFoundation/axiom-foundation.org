import type { RuleSpecDoc, RuleSpecRule } from "./doc";

/**
 * Which corpus provisions does a RuleSpec module encode?
 *
 * Every module declares its sources twice over: at module level
 * (``source_verification.corpus_citation_path`` — the singular form
 * the singular-source rule mandates, used by 889 of 1,139 rulespec-us
 * modules — or the legacy plural ``corpus_citation_paths`` list) and
 * per rule through proof atoms (``metadata.proof.atoms[].source
 * .corpus_citation_path``).
 *
 * Two sets come out of that, with different meanings:
 *
 * - ``all``: every declared path. Good for search; too broad for
 *   "what encodes this provision?" because condition atoms reference
 *   provisions without encoding them.
 * - ``values``: the provisions whose CONTENT the module encodes — the
 *   singular module source, plus paths cited by value-bearing atom
 *   kinds. Measured over rulespec-us on 2026-08-23: with this set,
 *   14,231 provisions are cited and only 15 (chapter-99 overlay
 *   headings every chapter composition encodes) exceed the reader's
 *   60-file bound, while the witness beer line resolves to exactly the
 *   ch22 rates module. Adding ``formula`` atoms triples the over-bound
 *   set and ``condition`` atoms pull every composition onto the beer
 *   line.
 */
export const VALUE_ATOM_KINDS: ReadonlySet<string> = new Set([
  "parameter",
  "parameter_table",
  "table_cell",
  "amount",
  "effective_period",
  "unit",
  "default",
]);

export interface CitationPathSets {
  all: string[];
  values: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeCitationPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^\/+/, "").trim();
  return normalized || null;
}

/** Module-level declarations: the singular source (if any) and the
 *  legacy plural list (possibly empty). */
export function moduleSourcePaths(doc: RuleSpecDoc): {
  singular: string | null;
  plural: string[];
} {
  const verification = asRecord(doc.module.source_verification);
  const singular = normalizeCitationPath(verification?.corpus_citation_path);
  const pluralRaw = verification?.corpus_citation_paths;
  const plural: string[] = [];
  if (Array.isArray(pluralRaw)) {
    for (const entry of pluralRaw) {
      const path = normalizeCitationPath(entry);
      if (path && !plural.includes(path)) plural.push(path);
    }
  }
  return { singular, plural };
}

function* ruleAtoms(
  rule: RuleSpecRule,
): Generator<{ kind: string | null; path: string }> {
  const metadata = asRecord(rule.raw.metadata);
  const proof = asRecord(metadata?.proof);
  const atoms = proof?.atoms;
  if (!Array.isArray(atoms)) return;
  for (const atomValue of atoms) {
    const atom = asRecord(atomValue);
    const source = asRecord(atom?.source);
    const path = normalizeCitationPath(source?.corpus_citation_path);
    if (!path) continue;
    const kind = typeof atom?.kind === "string" ? atom.kind : null;
    yield { kind, path };
  }
}

/** Paths a rule's value-bearing atoms cite. */
export function ruleValueCitationPaths(rule: RuleSpecRule): Set<string> {
  const paths = new Set<string>();
  for (const atom of ruleAtoms(rule)) {
    if (atom.kind && VALUE_ATOM_KINDS.has(atom.kind)) paths.add(atom.path);
  }
  return paths;
}

export function extractCitationPathSets(doc: RuleSpecDoc): CitationPathSets {
  const all = new Set<string>();
  const values = new Set<string>();
  const { singular, plural } = moduleSourcePaths(doc);
  if (singular) {
    all.add(singular);
    values.add(singular);
  }
  for (const path of plural) all.add(path);
  for (const rule of doc.rules) {
    for (const atom of ruleAtoms(rule)) {
      all.add(atom.path);
      if (atom.kind && VALUE_ATOM_KINDS.has(atom.kind)) values.add(atom.path);
    }
  }
  return { all: [...all], values: [...values] };
}

/**
 * Does this rule encode the provision at ``citationPath``? True when
 * the module's singular source IS that provision (every rule in the
 * module is encoded from it — including the 135 rulespec-us modules
 * that carry no proof atoms at all) or when the rule's own
 * value-bearing atoms cite it.
 */
export function ruleEncodesProvision(
  doc: RuleSpecDoc,
  rule: RuleSpecRule,
  citationPath: string,
): boolean {
  const { singular } = moduleSourcePaths(doc);
  if (singular === citationPath) return true;
  return ruleValueCitationPaths(rule).has(citationPath);
}
