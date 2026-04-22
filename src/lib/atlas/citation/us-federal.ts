import type { JurisdictionParser, ParsedCitation } from "./types";

/**
 * Parse a subsection trail like ``(b)(1)(A)`` into ``["b", "1", "A"]``.
 * Accepts whitespace anywhere and ignores trailing punctuation.
 */
function parseSubsections(tail: string): string[] {
  const out: string[] = [];
  const re = /\(([^()]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tail)) !== null) {
    const seg = m[1].trim();
    if (seg) out.push(seg);
  }
  return out;
}

function formatSubsectionSuffix(subs: string[]): string {
  return subs.map((s) => `(${s})`).join("");
}

/**
 * US Code — e.g. ``26 USC § 32``, ``26 U.S.C. § 32(b)(1)``,
 * ``26 U.S.C. 32(b)(1)(A)``, ``26 USC §32(b)``. The § sign is
 * optional, the dotted/undotted "U.S.C." form is tolerated, and
 * surrounding whitespace is collapsed.
 *
 *   26 USC § 32(b)(1) → us/statute/26/32/b/1
 *   26 USC 32         → us/statute/26/32
 */
const USC_RE = /^\s*(\d+)\s*U\.?\s*S\.?\s*C\.?\s*§?\s*(\d+[A-Za-z]*)\s*((?:\([^()]+\))*)\s*$/i;

export const uscParser: JurisdictionParser = {
  name: "us-federal-usc",
  parse(input) {
    const m = input.match(USC_RE);
    if (!m) return null;
    const [, title, section, subsTail] = m;
    const subs = parseSubsections(subsTail);
    const citationPath = ["us", "statute", title, section, ...subs].join("/");
    const displayLabel = `${title} U.S.C. § ${section}${formatSubsectionSuffix(subs)}`;
    return {
      jurisdiction: "us",
      docType: "statute",
      citationPath,
      displayLabel,
    };
  },
};

/**
 * Code of Federal Regulations — regular sections like
 * ``7 CFR 273.9(c)(1)(ii)(A)``.  The dot inside "273.9" separates the
 * CFR *part* (273) from the *section* (9); subsequent parenthesised
 * segments are subsections.
 *
 *   7 CFR 273.9(c)(1) → us/regulation/7/273/9/c/1
 *   7 CFR 273.9       → us/regulation/7/273/9
 */
const CFR_SECTION_RE = /^\s*(\d+)\s*C\.?\s*F\.?\s*R\.?\s*§?\s*(\d+[A-Za-z]*)\s*\.\s*(\d+[A-Za-z]*)\s*((?:\([^()]+\))*)\s*$/i;

export const cfrSectionParser: JurisdictionParser = {
  name: "us-federal-cfr-section",
  parse(input) {
    const m = input.match(CFR_SECTION_RE);
    if (!m) return null;
    const [, title, part, section, subsTail] = m;
    const subs = parseSubsections(subsTail);
    const citationPath = [
      "us",
      "regulation",
      title,
      part,
      section,
      ...subs,
    ].join("/");
    const displayLabel = `${title} CFR § ${part}.${section}${formatSubsectionSuffix(subs)}`;
    return {
      jurisdiction: "us",
      docType: "regulation",
      citationPath,
      displayLabel,
    };
  },
};

/**
 * CFR Part (no section) and CFR Part + Subpart forms:
 *
 *   7 CFR Part 273              → us/regulation/7/273
 *   7 CFR 273 Subpart A         → us/regulation/7/273/subpart-a
 *   7 CFR Part 273, Subpart A   → us/regulation/7/273/subpart-a
 */
const CFR_PART_RE =
  /^\s*(\d+)\s*C\.?\s*F\.?\s*R\.?\s*(?:Part\s+)?(\d+[A-Za-z]*)(?:\s*,?\s*Subpart\s+([A-Za-z0-9]+))?\s*$/i;

export const cfrPartParser: JurisdictionParser = {
  name: "us-federal-cfr-part",
  parse(input) {
    const m = input.match(CFR_PART_RE);
    if (!m) return null;
    const [, title, part, subpart] = m;
    const segments = ["us", "regulation", title, part];
    let displayLabel = `${title} CFR Part ${part}`;
    if (subpart) {
      segments.push(`subpart-${subpart.toLowerCase()}`);
      displayLabel = `${title} CFR ${part} Subpart ${subpart.toUpperCase()}`;
    }
    return {
      jurisdiction: "us",
      docType: "regulation",
      citationPath: segments.join("/"),
      displayLabel,
    };
  },
};
