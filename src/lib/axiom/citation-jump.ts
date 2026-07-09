/**
 * Parse a typed legal citation into a citation_path for direct
 * navigation — the modern version of LII's "quick search by
 * citation" widget.
 *
 * Handled shapes (case-insensitive, § and punctuation tolerated):
 *   "26 USC 32"            → us/statute/26/32
 *   "26 U.S.C. § 32(c)(1)" → us/statute/26/32/c/1
 *   "IRC 32(b)"            → us/statute/26/32/b
 *   "7 CFR 273.9"          → us/regulation/7/273/9
 *   "26 CFR 1.32-2"        → us/regulation/26/1/32-2
 *   "CRS 26-2-706"         → us-co/statute/26/26-2-706
 *   "us/statute/26/32"     → passthrough (already a path)
 */

const SUBSECTION_TAIL = /(?:\(\s*[\w.]{1,6}\s*\))*$/;

function parseSubsections(tail: string): string[] {
  const out: string[] = [];
  const re = /\(\s*([\w.]{1,6})\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tail)) !== null) out.push(match[1]);
  return out;
}

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/§/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCitationInput(raw: string): string | null {
  const input = normalize(raw);
  if (!input) return null;

  // Already a citation path.
  if (/^[a-z]{2}(?:-[a-z]{2})?\/[a-z]+\//.test(input)) {
    return input.replace(/\s/g, "");
  }

  const tailMatch = input.match(SUBSECTION_TAIL);
  const tail = tailMatch ? tailMatch[0] : "";
  const head = tail ? input.slice(0, input.length - tail.length).trim() : input;
  const subs = parseSubsections(tail);

  // "26 usc 32" / "26 u.s.c. 32"
  let match = head.match(/^(\d+[a-z]?)\s*u\.?\s*s\.?\s*c\.?a?\.?\s+([\w.-]+)$/);
  if (match) {
    return ["us", "statute", match[1], match[2], ...subs].join("/");
  }

  // "irc 32" — Internal Revenue Code = Title 26.
  match = head.match(/^i\.?r\.?c\.?\s+([\w.-]+)$/);
  if (match) {
    return ["us", "statute", "26", match[1], ...subs].join("/");
  }

  // "7 cfr 273.9" — part.section splits into path segments.
  match = head.match(/^(\d+[a-z]?)\s*c\.?f\.?r\.?\s+(\d+[a-z]?)(?:\.([\w-]+))?$/);
  if (match) {
    const segments = ["us", "regulation", match[1], match[2]];
    if (match[3]) segments.push(match[3]);
    return [...segments, ...subs].join("/");
  }

  // "crs 26-2-706" — Colorado Revised Statutes; the leading number of
  // the section identifier is the title.
  match = head.match(/^c\.?r\.?s\.?\s+((\d+)[\d.a-z-]*)$/);
  if (match) {
    return ["us-co", "statute", match[2], match[1], ...subs].join("/");
  }

  return null;
}
