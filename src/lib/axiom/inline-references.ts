import type { RuleReference } from "@/lib/supabase";

export type InlineReference = RuleReference & { inferred?: boolean };

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

export function inferRelativeReferences(
  body: string,
  currentCitationPath: string | undefined,
  existingRefs: InlineReference[]
): InlineReference[] {
  if (!currentCitationPath) return [];

  const inferred: InlineReference[] = [];
  const re =
    /(?:\bsections?|§)\s+([0-9][0-9A-Za-z.-]*[0-9A-Za-z])\s*((?:\([^()]+\))*)/gi;
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
  return [
    ...refs,
    ...inferRelativeReferences(body, citationPath ?? undefined, refs),
  ];
}
