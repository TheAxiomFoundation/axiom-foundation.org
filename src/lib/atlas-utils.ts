import type { Rule, RuleEncodingData } from "@/lib/supabase";

/** True when the encoding was fetched from a GitHub rac-* repo (not from the encoding DB). */
export function isGitHubEncoding(encoding: RuleEncodingData | null): boolean {
  return !!encoding?.encoding_run_id.startsWith("github:");
}

/** True when the encoding comes from the encoding DB (has lab/AutoRAC metadata). */
export function isLabEncoding(encoding: RuleEncodingData | null): boolean {
  return !!encoding && !encoding.encoding_run_id.startsWith("github:");
}

export interface ViewerDocument {
  citation: string;
  title: string;
  subsections: Array<{ id: string; text: string }>;
  hasRac: boolean;
  jurisdiction: string;
  archPath: string | null;
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

export function transformRuleToViewerDoc(
  rule: Rule,
  children: Rule[]
): ViewerDocument {
  const subsections = children.map((child, i) => ({
    id: String.fromCharCode(97 + i),
    text: child.body || child.heading || "",
  }));

  if (subsections.length === 0 && rule.body) {
    const paragraphs = rule.body.split(/\n\n+/).filter(Boolean);
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
    citation: rule.source_path || rule.id,
    title: rule.heading || "Untitled",
    subsections,
    hasRac: rule.has_rac,
    jurisdiction: rule.jurisdiction,
    archPath: rule.source_path,
  };
}
