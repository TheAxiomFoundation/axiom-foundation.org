import { PROGRAM_SEED } from "@/lib/axiom/programs";

/**
 * Data-driven vocabulary for Axiom search.
 *
 * Relevance used to be tuned with literals buried inside scoring
 * functions (slug-specific boosts, one-off noise lists). Everything
 * query-language-shaped now lives here as plain data, and everything
 * program-shaped is derived from the program registry, so tuning is a
 * table edit rather than a code change.
 */

/**
 * A vocabulary implication. When every token in `when` appears in a
 * token set, the `add` tokens join it. Used for lay synonyms and
 * acronym expansions on the query side, and for known encoding
 * aliases on the haystack side.
 */
export interface TokenImplication {
  when: string[];
  add: string[];
}

/** Lay synonyms and shorthands applied to query tokens. */
export const QUERY_TOKEN_IMPLICATIONS: readonly TokenImplication[] =
  Object.freeze([
    // Program synonyms
    { when: ["food", "stamp"], add: ["snap"] },
    { when: ["ebt"], add: ["snap"] },
    { when: ["calfresh"], add: ["snap"] },
    { when: ["nutrition", "assistance"], add: ["snap"] },
    { when: ["calworks"], add: ["tanf", "cash", "assistance"] },
    { when: ["welfare"], add: ["tanf"] },
    { when: ["obamacare"], add: ["aca", "ptc"] },
    { when: ["affordable", "care", "act"], add: ["aca"] },
    { when: ["premium", "tax", "credit"], add: ["ptc", "aca"] },
    { when: ["marketplace", "subsidy"], add: ["aca", "ptc"] },
    { when: ["aca"], add: ["ptc"] },
    // Topic shorthands
    { when: ["sua"], add: ["standard", "utility", "allowance"] },
    { when: ["lua"], add: ["limited", "utility", "allowance"] },
    { when: ["shelter"], add: ["housing"] },
  ]);

/**
 * Aliases the encoded corpora themselves use. Arizona files nest SNAP
 * under DES FAA5 "NA" (Nutrition Assistance); Colorado spells the
 * program out. These fire on haystack tokens so such files match a
 * plain "snap" query.
 */
export const HAYSTACK_TOKEN_IMPLICATIONS: readonly TokenImplication[] =
  Object.freeze([
    { when: ["nutrition", "assistance"], add: ["snap"] },
    { when: ["faa5", "na"], add: ["snap"] },
  ]);

/**
 * Tokens dropped from queries before matching. Kept small on purpose:
 * every entry here is invisible to the encoded/program matchers (the
 * corpus full-text search still sees the raw query).
 */
export const QUERY_STOPWORDS: ReadonlySet<string> = new Set([
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "much",
  "my",
  "no",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "will",
  "with",
]);

function aliasTokens(alias: string): string[] {
  return alias
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

/**
 * Single-word program names/acronyms ("snap", "eitc", "medicaid", …),
 * derived from the registry. These carry enough intent on their own to
 * anchor a result even when the rest of a long query matches nothing,
 * and they read as context — not topic — inside result labels.
 */
export const SINGLE_TOKEN_PROGRAM_ALIASES: ReadonlySet<string> = new Set(
  PROGRAM_SEED.flatMap((program) =>
    program.aliases.flatMap((alias) => {
      const tokens = aliasTokens(alias);
      return tokens.length === 1 ? tokens : [];
    })
  )
);
