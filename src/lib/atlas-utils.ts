import type { Rule, RuleEncodingData } from "@/lib/supabase";

/** True when the encoding was fetched from a GitHub rulespec-* repo (not from the encoding DB). */
export function isGitHubEncoding(encoding: RuleEncodingData | null): boolean {
  return !!encoding?.encoding_run_id.startsWith("github:");
}

/** True when the encoding comes from the encoding DB (has lab/AutoRuleSpec metadata). */
export function isLabEncoding(encoding: RuleEncodingData | null): boolean {
  return !!encoding && !encoding.encoding_run_id.startsWith("github:");
}

export interface ViewerDocument {
  citation: string;
  title: string;
  subsections: Array<{ id: string; text: string }>;
  hasRuleSpec: boolean;
  jurisdiction: string;
  sourcePath: string | null;
  contextText?: string;
  highlightedSubsection?: string;
  /**
   * Raw body text for leaf rules (no real children). When set, SourceTab
   * renders it directly so outgoing citation refs — whose offsets index
   * into this exact string — can be spliced in as inline links.
   * Omitted when the rule's content is distributed across children.
   */
  body?: string;
}

export function getJurisdictionLabel(jurisdiction: string): string {
  switch (jurisdiction) {
    case "canada":
      return "CA";
    case "uk":
      return "UK";
    default:
      if (jurisdiction.startsWith("us-")) {
        return jurisdiction.replace("us-", "").toUpperCase();
      }
      return "US";
  }
}

function isHumanReadableCitation(sourcePath: string): boolean {
  return /\b(?:U\.?S\.?C\.?|USC|C\.?F\.?R\.?|CFR|Code|Act)\b|§/.test(
    sourcePath
  );
}

function formatSubsectionSuffix(subsections: string[]): string {
  return subsections.map((segment) => `(${segment})`).join("");
}

function formatCitationPath(
  citationPath: string,
  jurisdiction: string,
  docType: string
): string | null {
  const parts = citationPath.split("/").filter(Boolean);
  if (parts.length < 4) {
    return null;
  }

  if (jurisdiction === "uk" && docType === "legislation") {
    const [, kind, instrumentType, year, number, ...rest] = parts;
    if (!kind || !instrumentType || !year || !number) {
      return null;
    }
    const suffixText =
      rest.length > 0 ? " " + rest.join(" ").replace(/[-_]/g, " ") : "";
    return `${instrumentType.toUpperCase()} ${year}/${number}${suffixText}`;
  }

  if (jurisdiction === "us-co" && docType === "regulation") {
    const [, , instrument, section, ...subsections] = parts;
    if (!instrument || !section) {
      return null;
    }
    const suffix = formatSubsectionSuffix(subsections);
    return `${instrument.replace("-CCR-", " CCR ")} § ${section}${suffix}`;
  }

  if (jurisdiction === "us-co" && docType === "statute") {
    const [, , collection, section, ...subsections] = parts;
    if (collection !== "crs" || !section) {
      return null;
    }
    const suffix = formatSubsectionSuffix(subsections);
    return `C.R.S. § ${section}${suffix}`;
  }

  if (docType !== "statute") {
    return null;
  }

  const [, , title, section, ...subsections] = parts;
  const suffix = formatSubsectionSuffix(subsections);

  if (jurisdiction === "us") {
    return `${title} U.S.C. § ${section}${suffix}`;
  }

  if (jurisdiction.startsWith("us-")) {
    return `${title} § ${section}${suffix}`;
  }

  return null;
}

function getRuleCitation(rule: Rule): string {
  const sourcePath = rule.source_path?.trim();
  if (sourcePath && isHumanReadableCitation(sourcePath)) {
    return sourcePath;
  }

  if (rule.citation_path) {
    const formatted = formatCitationPath(
      rule.citation_path,
      rule.jurisdiction,
      rule.doc_type
    );
    if (formatted) {
      return formatted;
    }
  }

  return sourcePath || rule.citation_path || rule.id;
}

export function transformRuleToViewerDoc(
  rule: Rule,
  children: Rule[],
  options?: { contextText?: string; highlightId?: string }
): ViewerDocument {
  const subsections = children.map((child, i) => {
    let id: string;
    if (options?.highlightId && child.citation_path) {
      const segments = child.citation_path.split("/");
      id = segments[segments.length - 1];
    } else {
      id = String.fromCharCode(97 + i);
    }
    return {
      id,
      text: child.body || child.heading || "",
    };
  });

  // Leaf rules (no children, has body): expose the raw body verbatim so
  // SourceTab can render citation refs inline at their true offsets. For
  // viewers/tests that ignore the body field we also emit a paragraph-
  // split subsection fallback with synthetic (a)(b)(c) labels.
  const isLeafWithBody = subsections.length === 0 && !!rule.body;
  if (isLeafWithBody) {
    const paragraphs = rule.body!.split(/\n\n+/).filter(Boolean);
    paragraphs.forEach((para, i) => {
      subsections.push({
        id: String.fromCharCode(97 + i),
        text: para.trim(),
      });
    });
  }

  if (subsections.length === 0) {
    subsections.push({
      id: "a",
      text: rule.heading || "No content available.",
    });
  }

  return {
    citation: getRuleCitation(rule),
    title: rule.heading || "Untitled",
    subsections,
    hasRuleSpec: rule.has_rulespec,
    jurisdiction: rule.jurisdiction,
    sourcePath: rule.source_path,
    ...(options?.contextText && { contextText: options.contextText }),
    ...(options?.highlightId && { highlightedSubsection: options.highlightId }),
    ...(isLeafWithBody && { body: rule.body! }),
  };
}
