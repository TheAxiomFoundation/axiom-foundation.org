import type { Program } from "./types";
import { PROGRAM_SEED } from "./seed";

export type { Program, ProgramAnchor, AnchorRole } from "./types";
export { PROGRAM_SEED } from "./seed";

/**
 * Rank programs against a free-text query. The palette calls this on
 * every keystroke, so it stays pure and synchronous — no DB, no fuzzy-
 * matching library.
 *
 * Scoring:
 *   - alias exact match (case-insensitive): +1000
 *   - display-name prefix match:              +100
 *   - display-name contains:                   +50
 *   - alias contains:                          +40
 *   - all query tokens in program metadata:    +220+
 *   - anchor label contains:                   +10 (multi-hit sums)
 *
 * Programs scoring 0 are filtered out. Ties break on registry order so
 * federal programs float above state ones and the seed's editorial
 * order shows through.
 */
export function findPrograms(query: string, limit = 8): Program[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const queryTokens = tokenise(q);

  type Scored = { program: Program; score: number; idx: number };
  const scored: Scored[] = [];

  PROGRAM_SEED.forEach((program, idx) => {
    const name = program.displayName.toLowerCase();
    const haystack = [
      name,
      program.jurisdiction,
      program.governingBody?.toLowerCase() ?? "",
      program.summary.toLowerCase(),
      ...program.aliases.map((alias) => alias.toLowerCase()),
      ...program.anchors.map((anchor) => anchor.label.toLowerCase()),
    ].join(" ");
    let score = 0;

    for (const alias of program.aliases) {
      const a = alias.toLowerCase();
      if (a === q) {
        score += 1000;
        break;
      }
      if (a.includes(q)) score = Math.max(score, 40);
    }

    const haystackTokens = new Set(tokenise(haystack));
    const matchedTokens = queryTokens.filter((token) =>
      haystackTokens.has(token)
    );
    if (queryTokens.length > 1 && matchedTokens.length === queryTokens.length) {
      score = Math.max(score, 220 + matchedTokens.length * 20);
    } else if (queryTokens.length === 1 && matchedTokens.length === 1) {
      score = Math.max(score, 40);
    }

    if (name.startsWith(q)) score = Math.max(score, 100);
    else if (name.includes(q)) score = Math.max(score, 50);

    for (const anchor of program.anchors) {
      if (anchor.label.toLowerCase().includes(q)) score += 10;
    }

    if (score > 0) scored.push({ program, score, idx });
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.slice(0, limit).map((s) => s.program);
}

function tokenise(text: string): string[] {
  return Array.from(
    new Set(text.split(/[^a-z0-9]+/).filter((token) => token.length >= 2))
  );
}

/** Look up a program by slug. Used for deep-linking to a program card later. */
export function findProgramBySlug(slug: string): Program | null {
  return PROGRAM_SEED.find((p) => p.slug === slug) ?? null;
}
