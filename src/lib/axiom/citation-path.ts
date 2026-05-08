const LOWERCASE_STRUCTURAL_SEGMENTS = new Set([
  "article",
  "chapter",
  "legislation",
  "paragraph",
  "part",
  "policy",
  "regulation",
  "schedule",
  "section",
  "ssi",
  "statute",
  "ukpga",
  "uksi",
]);

/**
 * Normalize the stable, structural pieces of a citation_path while
 * preserving legal identifiers whose case can be meaningful in corpus
 * paths, e.g. ``36B``, ``3ZA``, or ``9-CCR-2503-6``.
 */
export function normalizeCitationPathInput(path: string): string {
  const parts = path
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);

  return parts
    .map((part, index) => {
      if (index <= 1) return part.toLowerCase();
      const lower = part.toLowerCase();
      if (LOWERCASE_STRUCTURAL_SEGMENTS.has(lower)) return lower;
      if (lower.startsWith("subpart-")) return lower;
      return part;
    })
    .join("/");
}
