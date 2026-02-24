import type { Rule } from "@/lib/supabase";

export interface ViewerDocument {
  citation: string;
  title: string;
  subsections: Array<{ id: string; text: string }>;
  hasRac: boolean;
  jurisdiction: string;
  archPath: string | null;
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
