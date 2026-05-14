/**
 * The program registry — shared types.
 *
 * Axiom is atomic-rule-addressable, so the registry never represents a
 * "program" as a document of its own. Instead, each program names a
 * set of **anchors** into real atomic rules: the authorising statute,
 * the key regulation sections, the benefit formula, etc. A user who
 * types "SNAP" into the palette gets the anchors, each one a
 * one-click jump to the corresponding citation_path.
 *
 * The shape mirrors the future ``axiom.programs`` /
 * ``axiom.program_anchors`` Supabase tables exactly so swapping the seed
 * file for a live query is a one-line change when the tables land.
 */

export type AnchorRole =
  | "authorizing_statute"
  | "regulations"
  | "eligibility"
  | "benefit_calculation"
  | "definitions"
  | "phase_out"
  | "deductions"
  | "income_tests"
  | "resources";

export interface ProgramAnchor {
  role: AnchorRole;
  /** citation_path into current corpus provisions; resolver handles the miss case. */
  citationPath: string;
  /** Short human label for the palette row (e.g. "Standard deduction"). */
  label: string;
  /**
   * Optional pre-formatted human citation. When omitted, the palette
   * falls back to the parser's ``displayLabel`` for the citation_path.
   */
  displayCitation?: string;
}

export interface Program {
  slug: string;
  displayName: string;
  /** Lower-cased alternative names / acronyms the palette matches against. */
  aliases: string[];
  /** Jurisdiction slug — matches ``rules.jurisdiction``. */
  jurisdiction: string;
  /** Governing body / agency, for the program card. */
  governingBody?: string;
  /** One-sentence summary shown in the palette and any future program card. */
  summary: string;
  anchors: ProgramAnchor[];
}
