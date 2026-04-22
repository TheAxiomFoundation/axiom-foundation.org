/**
 * Shared types for the citation parser.
 *
 * The parser's job is to turn an input string — typed by a user into a
 * command palette or a search box — into a canonical
 * ``citation_path`` that can be looked up in ``akn.rules``. The
 * citation_path is the *only* address format Atlas uses internally;
 * every URL, every ``.rac`` file, every encoding record keys off it.
 *
 * ``ParsedCitation`` captures the parser's output. ``displayLabel`` is
 * the human-facing short form (e.g. ``26 U.S.C. § 32(b)(1)``); the
 * resolver uses it for rendering fallbacks ("we could not find an
 * ingested rule at 26 USC § 32(b)(1), view source on govinfo").
 */
export interface ParsedCitation {
  jurisdiction: string;
  docType: "statute" | "regulation" | "legislation";
  /** The canonical citation_path slug suitable for direct DB lookup. */
  citationPath: string;
  /** Human-readable short form of the citation. */
  displayLabel: string;
}

/**
 * A parser contributes a single ``parse`` function that returns either
 * a parsed citation or ``null`` for inputs it doesn't recognise. The
 * orchestrator (``parseCitation``) tries every registered parser and
 * picks the first non-null result.
 *
 * Parsers MUST be cheap and deterministic — they're called on every
 * keystroke in the palette.
 */
export interface JurisdictionParser {
  readonly name: string;
  parse(input: string): ParsedCitation | null;
}
