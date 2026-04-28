import type { JurisdictionParser, ParsedCitation } from "./types";
import {
  uscParser,
  cfrSectionParser,
  cfrPartParser,
} from "./us-federal";
import { allStateParsers } from "./us-states";
import { allUKParsers } from "./uk";
import { allCanadaParsers } from "./canada";

export type { ParsedCitation, JurisdictionParser } from "./types";

/**
 * Direct citation_path input — users pasting URLs or slugs.
 *
 *   us/statute/26/32              → exact citation_path
 *   /axiom/us/statute/26/32       → tolerate a route prefix
 *   us/statute/26/32/b/1          → deep path
 *
 * We intentionally accept only lowercase kebab-safe slugs here; any
 * human-typed citation goes through the richer parsers above.
 */
const DIRECT_SLUG_RE = /^\s*\/?(?:axiom\/)?([a-z0-9\-]+(?:\/[a-z0-9.\-]+)+)\s*$/i;

const directSlugParser: JurisdictionParser = {
  name: "direct-citation-path",
  parse(input) {
    const m = input.match(DIRECT_SLUG_RE);
    if (!m) return null;
    const slug = m[1].toLowerCase();
    const parts = slug.split("/");
    if (parts.length < 2) return null;
    const [jurisdiction, docType] = parts;
    if (
      docType !== "statute" &&
      docType !== "regulation" &&
      docType !== "legislation"
    ) {
      return null;
    }
    return {
      jurisdiction,
      docType,
      citationPath: slug,
      displayLabel: slug,
    };
  },
};

/**
 * Registered parsers, tried in order. Order matters only when two
 * grammars overlap — e.g. a USC-style input must not accidentally
 * match a state parser first. We keep the most specific parsers at
 * the top (USC, CFR section) and the catch-all direct-slug parser
 * last.
 */
const PARSERS: JurisdictionParser[] = [
  uscParser,
  cfrSectionParser,
  cfrPartParser,
  ...allStateParsers(),
  ...allUKParsers(),
  ...allCanadaParsers(),
  directSlugParser,
];

/**
 * Try every registered parser and return the first match. Returns
 * ``null`` when nothing recognises the input — the caller should fall
 * through to full-text search.
 */
export function parseCitation(input: string): ParsedCitation | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const parser of PARSERS) {
    const out = parser.parse(trimmed);
    if (out) return out;
  }
  return null;
}

/**
 * Expose the parser list for tests that want to exercise individual
 * parsers directly.
 */
export function _internalParsers(): readonly JurisdictionParser[] {
  return PARSERS;
}
