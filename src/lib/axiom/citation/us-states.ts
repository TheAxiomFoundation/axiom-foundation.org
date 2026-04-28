import type { JurisdictionParser, ParsedCitation } from "./types";

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
 * Colorado — Colorado Revised Statutes.
 *
 *   C.R.S. § 26-2-703           → us-co/statute/crs/26-2-703
 *   C.R.S. § 26-2-703(2.5)      → us-co/statute/crs/26-2-703/2.5
 *   CRS 26-2-703(2.5)(a)        → us-co/statute/crs/26-2-703/2.5/a
 */
const CRS_RE = /^\s*C\.?\s*R\.?\s*S\.?\s*§?\s*([0-9]+(?:-[0-9A-Za-z]+)+)\s*((?:\([^()]+\))*)\s*$/i;

export const crsParser: JurisdictionParser = {
  name: "us-co-crs",
  parse(input) {
    const m = input.match(CRS_RE);
    if (!m) return null;
    const [, section, subsTail] = m;
    const subs = parseSubsections(subsTail);
    const citationPath = [
      "us-co",
      "statute",
      "crs",
      section,
      ...subs,
    ].join("/");
    return {
      jurisdiction: "us-co",
      docType: "statute",
      citationPath,
      displayLabel: `C.R.S. § ${section}${formatSubsectionSuffix(subs)}`,
    };
  },
};

/**
 * Colorado — Code of Colorado Regulations.
 *
 *   9 CCR 2503-6 § 3.605.2(A)   → us-co/regulation/9-CCR-2503-6/3.605.2/A
 *   9 CCR 2503-6                → us-co/regulation/9-CCR-2503-6
 */
const CCR_RE = /^\s*(\d+)\s*CCR\s*([0-9]+(?:-[0-9A-Za-z]+)+)\s*(?:§?\s*([0-9.]+))?\s*((?:\([^()]+\))*)\s*$/i;

export const ccrParser: JurisdictionParser = {
  name: "us-co-ccr",
  parse(input) {
    const m = input.match(CCR_RE);
    if (!m) return null;
    const [, titlePart, instrumentTail, section, subsTail] = m;
    const instrument = `${titlePart}-CCR-${instrumentTail}`;
    const subs = parseSubsections(subsTail);
    const segments = ["us-co", "regulation", instrument];
    let displayLabel = `${titlePart} CCR ${instrumentTail}`;
    if (section) {
      segments.push(section);
      displayLabel = `${titlePart} CCR ${instrumentTail} § ${section}${formatSubsectionSuffix(subs)}`;
      segments.push(...subs);
    }
    return {
      jurisdiction: "us-co",
      docType: "regulation",
      citationPath: segments.join("/"),
      displayLabel,
    };
  },
};

/**
 * A generic state-statute parser for jurisdictions whose citations are
 * structured as ``<code-name> § <section>`` and whose citation_path
 * encodes the code name as the "title" segment. Used for states that
 * store their statutes under ``us-XX/statute/<code>/<section>``.
 *
 * We keep the list of recognised codes explicit so we don't
 * accidentally misclassify UKPGA-style inputs.
 */
interface StateCode {
  /** Jurisdiction slug, e.g. ``us-ny``. */
  jurisdiction: string;
  /** The citation-path slug for the code, e.g. ``tax`` or ``unemp-ins``. */
  codeSlug: string;
  /** Human citation prefix, e.g. ``N.Y. Tax Law``. */
  displayPrefix: string;
  /** Regex fragments matched case-insensitively before ``§``. */
  aliases: string[];
}

const STATE_CODES: StateCode[] = [
  {
    jurisdiction: "us-ny",
    codeSlug: "tax",
    displayPrefix: "N.Y. Tax Law",
    aliases: ["N\\.?\\s*Y\\.?\\s*Tax\\s*Law", "New\\s*York\\s*Tax\\s*Law"],
  },
  {
    jurisdiction: "us-ca",
    codeSlug: "unemp-ins",
    displayPrefix: "Cal. Unemp. Ins. Code",
    aliases: [
      "Cal\\.?\\s*Unemp\\.?\\s*Ins\\.?\\s*Code",
      "California\\s*Unemployment\\s*Insurance\\s*Code",
    ],
  },
  {
    jurisdiction: "us-ca",
    codeSlug: "rev-tax",
    displayPrefix: "Cal. Rev. & Tax. Code",
    aliases: [
      "Cal\\.?\\s*Rev\\.?\\s*&?\\s*Tax\\.?\\s*Code",
      "California\\s*Revenue\\s*(?:and|&)\\s*Taxation\\s*Code",
    ],
  },
  {
    jurisdiction: "us-dc",
    codeSlug: "code",
    displayPrefix: "D.C. Code",
    aliases: ["D\\.?\\s*C\\.?\\s*Code"],
  },
];

function buildStateParser(code: StateCode): JurisdictionParser {
  const aliasGroup = code.aliases.join("|");
  const re = new RegExp(
    `^\\s*(?:${aliasGroup})\\s*§?\\s*([0-9][0-9A-Za-z\\-]*)\\s*((?:\\([^()]+\\))*)\\s*$`,
    "i"
  );
  return {
    name: `${code.jurisdiction}-${code.codeSlug}`,
    parse(input) {
      const m = input.match(re);
      if (!m) return null;
      const [, section, subsTail] = m;
      const subs = parseSubsections(subsTail);
      const citationPath = [
        code.jurisdiction,
        "statute",
        code.codeSlug,
        section,
        ...subs,
      ].join("/");
      return {
        jurisdiction: code.jurisdiction,
        docType: "statute",
        citationPath,
        displayLabel: `${code.displayPrefix} § ${section}${formatSubsectionSuffix(subs)}`,
      };
    },
  };
}

export const stateStatuteParsers: JurisdictionParser[] =
  STATE_CODES.map(buildStateParser);

export function allStateParsers(): JurisdictionParser[] {
  return [crsParser, ccrParser, ...stateStatuteParsers];
}

// Re-export a single flat placeholder for ParsedCitation to silence
// unused-import noise if this module is consumed type-only.
export type { ParsedCitation };
