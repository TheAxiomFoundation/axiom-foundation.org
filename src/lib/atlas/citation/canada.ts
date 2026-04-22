import type { JurisdictionParser } from "./types";

/**
 * Canadian federal Revised Statutes — e.g.
 *
 *   RSC 1985, c 1 (5th Supp)             → canada/statute/rsc-1985/c-1-5th-supp
 *   RSC 1985 c 1                         → canada/statute/rsc-1985/c-1
 *   RSC 1985, c 1 (5th Supp), s 3(1)     → canada/statute/rsc-1985/c-1-5th-supp/3/1
 *
 * The atlas's Canadian ingestion uses ``canada/statute/<collection>/<chapter>``
 * as the stable prefix with optional section + subsection segments.
 * We accept the "Supp" variant explicitly because it's the canonical
 * form for the Income Tax Act (c 1 (5th Supp)).
 */
const RSC_RE =
  /^\s*RSC\s*(\d{4})\s*,?\s*c\.?\s*(\d+[A-Za-z]?)(?:\s*\((\d+)(?:st|nd|rd|th)?\s*Supp\.?\s*\))?\s*(?:,?\s*s\.?\s*(\d+[A-Za-z]?)\s*((?:\([^()]+\))*))?\s*$/i;

export const rscParser: JurisdictionParser = {
  name: "canada-rsc",
  parse(input) {
    const m = input.match(RSC_RE);
    if (!m) return null;
    const [, year, chapter, supp, section, subsTail] = m;
    const collection = `rsc-${year}`;
    const chapterSlug = supp
      ? `c-${chapter}-${supp}th-supp`
      : `c-${chapter}`;
    const segments = ["canada", "statute", collection, chapterSlug];
    let displayLabel = `RSC ${year}, c ${chapter}`;
    if (supp) displayLabel += ` (${supp}th Supp)`;
    if (section) {
      segments.push(section);
      const subs: string[] = [];
      if (subsTail) {
        const re = /\(([^()]+)\)/g;
        let sm: RegExpExecArray | null;
        while ((sm = re.exec(subsTail)) !== null) {
          const seg = sm[1].trim();
          if (seg) subs.push(seg);
        }
      }
      segments.push(...subs);
      displayLabel += `, s ${section}${subs.map((s) => `(${s})`).join("")}`;
    }
    return {
      jurisdiction: "canada",
      docType: "statute",
      citationPath: segments.join("/"),
      displayLabel,
    };
  },
};

/**
 * Canadian — well-known act name shortcuts. Acts like the Income Tax
 * Act live at a known citation path; users almost never type the full
 * RSC formulation from memory, so we short-circuit the common ones.
 *
 *   Income Tax Act             → canada/statute/rsc-1985/c-1-5th-supp
 *   Income Tax Act s 3(1)      → canada/statute/rsc-1985/c-1-5th-supp/3/1
 */
interface ActShortcut {
  name: string;
  aliases: string[];
  collection: string;
  chapter: string;
  displayLabel: string;
}

const ACT_SHORTCUTS: ActShortcut[] = [
  {
    name: "income-tax-act",
    aliases: ["Income\\s*Tax\\s*Act"],
    collection: "rsc-1985",
    chapter: "c-1-5th-supp",
    displayLabel: "Income Tax Act (R.S.C. 1985, c. 1 (5th Supp))",
  },
  {
    name: "excise-tax-act",
    aliases: ["Excise\\s*Tax\\s*Act"],
    collection: "rsc-1985",
    chapter: "c-e-15",
    displayLabel: "Excise Tax Act (R.S.C. 1985, c. E-15)",
  },
];

function buildActParser(shortcut: ActShortcut): JurisdictionParser {
  const aliasGroup = shortcut.aliases.join("|");
  const re = new RegExp(
    `^\\s*(?:${aliasGroup})(?:\\s+s\\.?\\s*(\\d+[A-Za-z]?)\\s*((?:\\([^()]+\\))*))?\\s*$`,
    "i"
  );
  return {
    name: `canada-${shortcut.name}`,
    parse(input) {
      const m = input.match(re);
      if (!m) return null;
      const [, section, subsTail] = m;
      const segments = [
        "canada",
        "statute",
        shortcut.collection,
        shortcut.chapter,
      ];
      let displayLabel = shortcut.displayLabel;
      if (section) {
        segments.push(section);
        const subs: string[] = [];
        if (subsTail) {
          const re2 = /\(([^()]+)\)/g;
          let sm: RegExpExecArray | null;
          while ((sm = re2.exec(subsTail)) !== null) {
            const seg = sm[1].trim();
            if (seg) subs.push(seg);
          }
        }
        segments.push(...subs);
        displayLabel += `, s ${section}${subs.map((s) => `(${s})`).join("")}`;
      }
      return {
        jurisdiction: "canada",
        docType: "statute",
        citationPath: segments.join("/"),
        displayLabel,
      };
    },
  };
}

export const actShortcutParsers: JurisdictionParser[] =
  ACT_SHORTCUTS.map(buildActParser);

export function allCanadaParsers(): JurisdictionParser[] {
  return [rscParser, ...actShortcutParsers];
}
