import yaml from "js-yaml";

/**
 * Typed view of a RuleSpec YAML document as stored in the
 * ``TheAxiomFoundation/rules-*`` repos. The shape mirrors what
 * encoders actually emit (one ``module`` block, one or more ``rules``
 * with ``versions`` of effective-dated formulas) — not the older
 * DSL form some marketing/spec pages still show.
 *
 * The parser is intentionally permissive: any unrecognised top-level
 * keys are preserved on ``raw`` so callers (debug surfaces, future
 * fields) can read them, and missing required fields surface as
 * ``parseErrors`` rather than throwing. This matters because the
 * renderer is a faithfulness surface — a half-broken doc should
 * still show whatever is intelligible, not a blank "parse error"
 * page that hides the issue from reviewers.
 */
export interface RuleSpecVersion {
  effective_from: string | null;
  effective_to?: string | null;
  formula: string | null;
}

export interface RuleSpecRule {
  name: string;
  kind: string | null;
  entity: string | null;
  dtype: string | null;
  period: string | null;
  unit: string | null;
  source: string | null;
  source_url: string | null;
  versions: RuleSpecVersion[];
}

export interface RuleSpecModule {
  summary: string | null;
  source_verification?: Record<string, unknown> | null;
}

export interface RuleSpecDoc {
  format: string | null;
  module: RuleSpecModule;
  rules: RuleSpecRule[];
  /** Raw parsed YAML for callers that need fields the typed shape
   *  doesn't yet model. */
  raw: Record<string, unknown>;
  /** Soft errors collected while parsing — populated when required
   *  fields are missing or have the wrong type. The doc is still
   *  rendered best-effort. */
  parseErrors: string[];
}

export interface RuleSpecTestCase {
  name: string;
  period: Record<string, unknown> | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  raw: Record<string, unknown>;
}

const DEFAULT_MODULE: RuleSpecModule = { summary: null };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function parseVersion(v: unknown, errors: string[]): RuleSpecVersion {
  const rec = asRecord(v);
  if (!rec) {
    errors.push("version entry is not a mapping");
    return { effective_from: null, formula: null };
  }
  return {
    effective_from: asString(rec.effective_from),
    effective_to: asString(rec.effective_to),
    formula: asString(rec.formula),
  };
}

function parseRule(v: unknown, errors: string[]): RuleSpecRule | null {
  const rec = asRecord(v);
  if (!rec) {
    errors.push("rule entry is not a mapping");
    return null;
  }
  const name = asString(rec.name);
  if (!name) {
    errors.push("rule entry is missing `name`");
    return null;
  }
  const versionsRaw = Array.isArray(rec.versions) ? rec.versions : [];
  if (!Array.isArray(rec.versions)) {
    errors.push(`rule "${name}" has no \`versions\` list`);
  }
  return {
    name,
    kind: asString(rec.kind),
    entity: asString(rec.entity),
    dtype: asString(rec.dtype),
    period: asString(rec.period),
    unit: asString(rec.unit),
    source: asString(rec.source),
    source_url: asString(rec.source_url),
    versions: versionsRaw.map((v) => parseVersion(v, errors)),
  };
}

/**
 * Parse a RuleSpec YAML document. Never throws — invalid input yields
 * an empty doc with errors recorded.
 */
export function parseRuleSpec(content: string): RuleSpecDoc {
  const errors: string[] = [];
  let raw: unknown;
  try {
    raw = yaml.load(content);
  } catch (e) {
    errors.push(
      e instanceof Error ? `YAML parse error: ${e.message}` : "YAML parse error"
    );
    return {
      format: null,
      module: { ...DEFAULT_MODULE },
      rules: [],
      raw: {},
      parseErrors: errors,
    };
  }
  const root = asRecord(raw);
  if (!root) {
    errors.push("document root is not a mapping");
    return {
      format: null,
      module: { ...DEFAULT_MODULE },
      rules: [],
      raw: {},
      parseErrors: errors,
    };
  }
  const format = asString(root.format);
  const moduleRec = asRecord(root.module);
  const moduleParsed: RuleSpecModule = moduleRec
    ? {
        summary: asString(moduleRec.summary),
        source_verification:
          asRecord(moduleRec.source_verification) ?? null,
      }
    : { ...DEFAULT_MODULE };
  const rulesRaw = Array.isArray(root.rules) ? root.rules : [];
  if (root.rules && !Array.isArray(root.rules)) {
    errors.push("`rules` is not a list");
  }
  const rules = rulesRaw
    .map((r) => parseRule(r, errors))
    .filter((r): r is RuleSpecRule => r !== null);
  return {
    format,
    module: moduleParsed,
    rules,
    raw: root,
    parseErrors: errors,
  };
}

/**
 * Parse a sibling ``.test.yaml`` file. Tests are stored as a flat list
 * of cases — same permissive philosophy as the encoding parser.
 */
export function parseRuleSpecTests(content: string): RuleSpecTestCase[] {
  let raw: unknown;
  try {
    raw = yaml.load(content);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const cases: RuleSpecTestCase[] = [];
  for (const entry of raw) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const name = asString(rec.name);
    if (!name) continue;
    cases.push({
      name,
      period: asRecord(rec.period),
      input: asRecord(rec.input) ?? {},
      output: asRecord(rec.output) ?? {},
      raw: rec,
    });
  }
  return cases;
}

/**
 * Tokenise a formula expression for in-page identifier highlighting.
 * Returns a list of segments: identifier tokens are flagged so the
 * renderer can wrap them in anchors when they match a local rule
 * name. We deliberately stay regex-only — proper tokenisation belongs
 * in the encoder, not here.
 */
export interface FormulaSegment {
  text: string;
  isIdentifier: boolean;
}

const IDENTIFIER_RE = /[A-Za-z_][A-Za-z0-9_]*/g;

const RESERVED = new Set([
  "and",
  "or",
  "not",
  "if",
  "else",
  "true",
  "false",
  "True",
  "False",
  "None",
  "null",
  "in",
  "is",
  "max",
  "min",
  "abs",
  "round",
  "sum",
  "len",
  "clip",
]);

export function tokenizeFormula(formula: string): FormulaSegment[] {
  const out: FormulaSegment[] = [];
  let cursor = 0;
  for (const m of formula.matchAll(IDENTIFIER_RE)) {
    const start = m.index ?? 0;
    if (start > cursor) {
      out.push({ text: formula.slice(cursor, start), isIdentifier: false });
    }
    const tok = m[0];
    out.push({ text: tok, isIdentifier: !RESERVED.has(tok) });
    cursor = start + tok.length;
  }
  if (cursor < formula.length) {
    out.push({ text: formula.slice(cursor), isIdentifier: false });
  }
  return out;
}
