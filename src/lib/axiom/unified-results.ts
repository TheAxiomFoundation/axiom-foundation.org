import type {
  AxiomSearchResults,
  EncodedSearchResult,
} from "@/lib/axiom/search";
import type { Program, ProgramAnchor } from "@/lib/axiom/programs";
import type { SearchHit } from "@/lib/supabase";

/**
 * Cross-source result fusion.
 *
 * The three search lanes (programs, encoded RuleSpecs, corpus text)
 * score on incomparable scales, so we merge them with reciprocal rank
 * fusion: each row contributes weight / (K + rank-within-lane), and
 * rows that reach the same destination from several lanes sum their
 * contributions — agreement between lanes is the strongest relevance
 * signal we have.
 */

export interface ProgramContext {
  program: Program;
  anchor: ProgramAnchor;
}

export type UnifiedResult =
  | {
      kind: "program";
      href: string;
      score: number;
      program: Program;
      anchor: ProgramAnchor;
    }
  | {
      kind: "encoded";
      href: string;
      score: number;
      hit: EncodedSearchResult;
      /** Set when a program anchor points at the same destination. */
      programContext?: ProgramContext;
    }
  | { kind: "corpus"; href: string; score: number; hit: SearchHit };

const RRF_K = 6;
const PROGRAM_WEIGHT = 1.0;
const CORPUS_WEIGHT = 0.85;
const ENCODED_FILE_WEIGHT = 1.1;
// A symbol hit means the query matched an actual rule or parameter
// name inside the file — the closest thing to a direct answer.
const ENCODED_SYMBOL_WEIGHT = 1.3;

const KIND_RICHNESS: Record<UnifiedResult["kind"], number> = {
  encoded: 2,
  program: 1,
  corpus: 0,
};

export function buildUnifiedResults(
  results: AxiomSearchResults
): UnifiedResult[] {
  const rows: UnifiedResult[] = [];

  results.programs
    .flatMap((result) =>
      result.anchors.map((anchor) => ({ program: result.program, anchor }))
    )
    .forEach(({ program, anchor }, rank) => {
      rows.push({
        kind: "program",
        href: `/${anchor.citationPath}`,
        score: PROGRAM_WEIGHT / (RRF_K + rank),
        program,
        anchor,
      });
    });

  results.encoded.forEach((hit, rank) => {
    const weight =
      hit.matchKind === "symbol" ? ENCODED_SYMBOL_WEIGHT : ENCODED_FILE_WEIGHT;
    rows.push({
      kind: "encoded",
      href: `/${hit.citationPath}`,
      score: weight / (RRF_K + rank),
      hit,
    });
  });

  results.corpus.forEach((hit, rank) => {
    rows.push({
      kind: "corpus",
      href: `/${hit.citation_path}`,
      score: CORPUS_WEIGHT / (RRF_K + rank),
      hit,
    });
  });

  const byHref = new Map<string, UnifiedResult>();
  for (const row of rows) {
    const existing = byHref.get(row.href);
    if (!existing) {
      byHref.set(row.href, row);
      continue;
    }
    byHref.set(row.href, mergeRows(existing, row));
  }

  return [...byHref.values()].sort((a, b) => b.score - a.score);
}

function mergeRows(a: UnifiedResult, b: UnifiedResult): UnifiedResult {
  const [richer, other] =
    KIND_RICHNESS[b.kind] > KIND_RICHNESS[a.kind] ? [b, a] : [a, b];
  const merged: UnifiedResult = { ...richer, score: a.score + b.score };
  if (merged.kind === "encoded" && other.kind === "program") {
    merged.programContext = { program: other.program, anchor: other.anchor };
  }
  return merged;
}
