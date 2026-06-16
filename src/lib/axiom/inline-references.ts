import type { RuleReference } from "@/lib/supabase";

export type InlineReference = RuleReference & { inferred?: boolean };

interface ClaimedRange {
  start: number;
  end: number;
}

/**
 * Many stored references carry offsets computed against an older or
 * longer revision of the provision body, so trusting them verbatim
 * splices links onto the wrong words (or past the end of the body).
 * Re-anchor each ref: keep offsets that already match the citation
 * text exactly, otherwise search the body for the text and claim the
 * first occurrence not already taken by another ref. Returns null
 * when the text doesn't appear at all — those refs stay listed in the
 * references panel but must not be spliced inline.
 */
function anchorOffsets(
  body: string,
  ref: RuleReference,
  claimed: ClaimedRange[]
): ClaimedRange | null {
  const text = ref.citation_text;
  if (!text) return null;
  if (
    ref.start_offset >= 0 &&
    ref.end_offset <= body.length &&
    body.slice(ref.start_offset, ref.end_offset) === text
  ) {
    return { start: ref.start_offset, end: ref.end_offset };
  }
  let index = body.indexOf(text);
  while (index !== -1) {
    const end = index + text.length;
    const taken = claimed.some((r) => index < r.end && end > r.start);
    if (!taken) return { start: index, end };
    index = body.indexOf(text, index + 1);
  }
  return null;
}

/**
 * Sentinel offsets for refs whose citation text cannot be located in
 * the body. ``spliceRefs`` (rule-body) skips zero/negative-width
 * spans, so these render in the references panel only.
 */
const UNANCHORED = { start_offset: -1, end_offset: -1 };

export function reanchorReferences(
  body: string,
  refs: RuleReference[]
): InlineReference[] {
  const claimed: ClaimedRange[] = [];
  // Anchor in original document order so repeated citation texts
  // claim their occurrences in sequence.
  const sorted = [...refs].sort((a, b) => a.start_offset - b.start_offset);
  const anchored = sorted.map((ref): InlineReference => {
    if (ref.direction !== "outgoing") return ref;
    const range = anchorOffsets(body, ref, claimed);
    if (!range) return { ...ref, ...UNANCHORED };
    claimed.push(range);
    if (range.start === ref.start_offset && range.end === ref.end_offset) {
      return ref;
    }
    return { ...ref, start_offset: range.start, end_offset: range.end };
  });
  return anchored;
}

function parseSubsectionTail(tail: string): string[] {
  const out: string[] = [];
  const re = /\(([^()]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tail)) !== null) {
    const segment = match[1]?.trim();
    if (segment) out.push(segment);
  }
  return out;
}

function federalRegulationPath(
  parts: string[],
  section: string,
  subs: string[]
): string | null {
  const title = parts[2];
  if (!title) return null;
  const sectionParts = section.split(".").filter(Boolean);
  if (sectionParts.length < 2) return null;
  return ["us", "regulation", title, ...sectionParts, ...subs].join("/");
}

function sameStatuteCollectionPath(
  parts: string[],
  section: string,
  subs: string[]
): string | null {
  const [jurisdiction, docType, collection] = parts;
  if (!jurisdiction || docType !== "statute" || !collection) return null;
  return [jurisdiction, docType, collection, section, ...subs].join("/");
}

function sameStateRegulationPath(
  parts: string[],
  section: string,
  subs: string[]
): string | null {
  const [jurisdiction, docType, collection] = parts;
  if (
    !jurisdiction?.startsWith("us-") ||
    docType !== "regulation" ||
    !collection
  ) {
    return null;
  }
  return [jurisdiction, docType, collection, section, ...subs].join("/");
}

function resolveRelativeCitationPath(
  currentCitationPath: string | undefined,
  section: string,
  subs: string[]
): string | null {
  if (!currentCitationPath) return null;
  const parts = currentCitationPath.split("/").filter(Boolean);
  const [jurisdiction, docType] = parts;
  if (!jurisdiction || !docType) return null;

  if (jurisdiction === "us" && docType === "regulation") {
    return federalRegulationPath(parts, section, subs);
  }
  if (docType === "statute") {
    return sameStatuteCollectionPath(parts, section, subs);
  }
  if (jurisdiction.startsWith("us-") && docType === "regulation") {
    return sameStateRegulationPath(parts, section, subs);
  }
  return null;
}

function overlapsAny(
  start: number,
  end: number,
  refs: InlineReference[]
): boolean {
  return refs.some((ref) => start < ref.end_offset && end > ref.start_offset);
}

/**
 * The same-collection inference is wrong when the citation names its
 * own source document — "section 205(c) of the Social Security Act"
 * inside Title 26 must not link to 26 § 205. Inspect the text that
 * follows the match and bail unless the qualifier keeps us in the
 * current collection ("of this title", "of title 26" while in title
 * 26, "of the Internal Revenue Code" while in title 26, …).
 */
function qualifierStaysInCollection(
  body: string,
  end: number,
  currentCitationPath: string
): boolean {
  const tail = body.slice(end, end + 80);
  const qualifier = tail.match(
    /^[ \t]*(?:,\s*)?of\s+(this|such|that|the)\s+([A-Za-z][A-Za-z0-9 .'-]{0,60})?/i
  );
  const titleRef = tail.match(/^[ \t]*(?:,\s*)?of\s+title\s+([0-9]+[A-Za-z]?)\b/i);
  const parts = currentCitationPath.split("/").filter(Boolean);
  const currentTitle = parts[1] === "statute" ? parts[2] : null;

  if (titleRef) {
    // "of title 26" — same-collection only when we are in that title.
    return titleRef[1] === currentTitle;
  }
  if (!qualifier) return true;

  const determiner = qualifier[1].toLowerCase();
  if (determiner === "this") return true; // "of this title/Act/chapter"
  if (determiner === "such" || determiner === "that") return false;

  // "of the <named document>" — only the Internal Revenue Code maps
  // back onto a collection we can verify (Title 26).
  const name = (qualifier[2] ?? "").toLowerCase();
  return (
    name.startsWith("internal revenue code") &&
    parts[0] === "us" &&
    currentTitle === "26"
  );
}

export function inferRelativeReferences(
  body: string,
  currentCitationPath: string | undefined,
  existingRefs: InlineReference[]
): InlineReference[] {
  if (!currentCitationPath) return [];

  const inferred: InlineReference[] = [];
  // Subsection tails accept only short designators — (a), (1), (B),
  // (iv), (2.5) — so prose parentheticals like "(relating to citizens
  // or residents living abroad)" never become URL segments.
  const re =
    /(?:\bsections?|§)\s+([0-9][0-9A-Za-z.-]*[0-9A-Za-z])\s*((?:\(\s*[0-9A-Za-z](?:[0-9A-Za-z.]{0,5})\s*\))*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const section = match[1];
    const subs = parseSubsectionTail(match[2] ?? "");
    const start = match.index;
    const end = start + match[0].length;
    if (
      overlapsAny(start, end, existingRefs) ||
      overlapsAny(start, end, inferred)
    ) {
      continue;
    }
    if (!qualifierStaysInCollection(body, end, currentCitationPath)) {
      continue;
    }
    const otherCitationPath = resolveRelativeCitationPath(
      currentCitationPath,
      section,
      subs
    );
    if (!otherCitationPath || otherCitationPath === currentCitationPath) {
      continue;
    }
    inferred.push({
      direction: "outgoing",
      citation_text: match[0],
      pattern_kind: "relative-section",
      confidence: 0.75,
      start_offset: start,
      end_offset: end,
      other_citation_path: otherCitationPath,
      other_provision_id: null,
      other_heading: null,
      target_resolved: true,
      inferred: true,
    });
  }

  return inferred;
}

export function buildInlineReferences(
  body: string | null | undefined,
  citationPath: string | null | undefined,
  refs: RuleReference[]
): InlineReference[] {
  if (!body) return refs;
  const anchored = reanchorReferences(body, refs);
  return [
    ...anchored,
    ...inferRelativeReferences(
      body,
      citationPath ?? undefined,
      anchored.filter((ref) => ref.start_offset >= 0)
    ),
  ];
}
