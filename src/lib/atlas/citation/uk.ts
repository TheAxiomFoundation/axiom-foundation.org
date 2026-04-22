import type { JurisdictionParser } from "./types";

/**
 * UK Statutory Instruments — e.g.
 *
 *   UKSI 2013/376 reg 22                   → uk/legislation/uksi/2013/376/regulation/22
 *   UKSI 2013/376 regulation 22            → uk/legislation/uksi/2013/376/regulation/22
 *   UKSI 2013/376 regulation 22(3)         → uk/legislation/uksi/2013/376/regulation/22/3
 *   UKSI 2013/376                          → uk/legislation/uksi/2013/376
 *
 * The atlas's UK ingestion stores citation_path segments for
 * regulation text under ``regulation/<number>`` with any subsections
 * as later segments. Minor subsection handling is best-effort — UK SI
 * subsection trails can be ``(a)``, ``(1)``, ``(1)(a)``.
 */
const UKSI_RE =
  /^\s*UKSI\s*(\d{4})\s*\/\s*(\d+)(?:\s+(?:reg|regulation)\s*(\d+[A-Za-z]?)\s*((?:\([^()]+\))*))?\s*$/i;

export const ukSIParser: JurisdictionParser = {
  name: "uk-uksi",
  parse(input) {
    const m = input.match(UKSI_RE);
    if (!m) return null;
    const [, year, number, regNum, subsTail] = m;
    const segments = ["uk", "legislation", "uksi", year, number];
    let displayLabel = `UKSI ${year}/${number}`;
    if (regNum) {
      segments.push("regulation", regNum);
      displayLabel += ` regulation ${regNum}`;
      if (subsTail) {
        const subs: string[] = [];
        const re = /\(([^()]+)\)/g;
        let sm: RegExpExecArray | null;
        while ((sm = re.exec(subsTail)) !== null) {
          const seg = sm[1].trim();
          if (seg) {
            subs.push(seg);
          }
        }
        segments.push(...subs);
        displayLabel += subs.map((s) => `(${s})`).join("");
      }
    }
    return {
      jurisdiction: "uk",
      docType: "legislation",
      citationPath: segments.join("/"),
      displayLabel,
    };
  },
};

/**
 * UK Public General Acts — e.g.
 *
 *   UKPGA 2012 c.5           → uk/legislation/ukpga/2012/5
 *   UKPGA 2012 c 5 s 3       → uk/legislation/ukpga/2012/5/section/3
 *
 * Sections map to ``section/<n>`` segments, mirroring how UKSI
 * regulations are stored.
 */
const UKPGA_RE =
  /^\s*UKPGA\s*(\d{4})\s*c\.?\s*(\d+[A-Za-z]?)(?:\s+s\.?\s*(\d+[A-Za-z]?))?\s*$/i;

export const ukPGAParser: JurisdictionParser = {
  name: "uk-ukpga",
  parse(input) {
    const m = input.match(UKPGA_RE);
    if (!m) return null;
    const [, year, chapter, section] = m;
    const segments = ["uk", "legislation", "ukpga", year, chapter];
    let displayLabel = `UKPGA ${year} c.${chapter}`;
    if (section) {
      segments.push("section", section);
      displayLabel += ` s ${section}`;
    }
    return {
      jurisdiction: "uk",
      docType: "legislation",
      citationPath: segments.join("/"),
      displayLabel,
    };
  },
};

export function allUKParsers(): JurisdictionParser[] {
  return [ukSIParser, ukPGAParser];
}
