/**
 * Citation-path → human legal citation, the inverse of the parsers
 * in this directory. Used by copy-citation affordances; falls back
 * to the raw path for jurisdictions without a formatter yet.
 */

/** "(a)(1)(B)" suffix from subsection segments. */
function subsectionSuffix(segments: string[]): string {
  return segments.map((segment) => `(${segment})`).join("");
}

export function formatLegalCitation(
  citationPath: string,
  anchor: string | null = null
): string {
  const segments = citationPath.split("/").filter(Boolean);
  const tail = anchor ? [anchor] : [];
  const [slug, docType, ...rest] = segments;

  if (slug === "us" && docType === "statute" && rest.length >= 2) {
    const [title, section, ...subs] = rest;
    return `${title} U.S.C. § ${section}${subsectionSuffix([...subs, ...tail])}`;
  }
  if (slug === "us" && docType === "regulation" && rest.length >= 3) {
    const [title, part, section, ...subs] = rest;
    return `${title} C.F.R. § ${part}.${section}${subsectionSuffix([...subs, ...tail])}`;
  }
  return anchor ? `${citationPath}/${anchor}` : citationPath;
}
