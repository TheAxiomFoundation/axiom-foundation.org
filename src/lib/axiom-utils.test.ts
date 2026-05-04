import { describe, it, expect, vi } from "vitest";
import {
  isRuleRepealed,
  transformRuleToViewerDoc,
  type ViewerDocument,
} from "./axiom-utils";
import type { Rule } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabaseCorpus: { from: vi.fn() },
  supabase: { from: vi.fn() },
}));

const mockRule = (overrides: Partial<Rule> = {}): Rule => ({
  id: "test-id",
  jurisdiction: "us",
  doc_type: "statute",
  parent_id: null,
  level: 0,
  ordinal: null,
  heading: null,
  body: null,
  effective_date: null,
  repeal_date: null,
  source_url: null,
  source_path: null,
  citation_path: null,
  rulespec_path: null,
  has_rulespec: false,
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("transformRuleToViewerDoc", () => {
  describe("existing behavior preserved", () => {
    it("maps materialized child rules to subsections using citation path segments", () => {
      const rule = mockRule({
        heading: "Section 1",
        source_path: "26/1",
        citation_path: "us/statute/26/1",
      });
      const children = [
        mockRule({
          id: "c1",
          body: "Child A body",
          citation_path: "us/statute/26/1/a",
        }),
        mockRule({
          id: "c2",
          body: "Child B body",
          citation_path: "us/statute/26/1/b",
        }),
      ];

      const doc = transformRuleToViewerDoc(rule, children);

      expect(doc.citation).toBe("26 U.S.C. § 1");
      expect(doc.title).toBe("Section 1");
      expect(doc.subsections).toEqual([
        { id: "a", text: "Child A body" },
        { id: "b", text: "Child B body" },
      ]);
    });

    it("does not synthesize subsections from leaf body paragraphs", () => {
      const rule = mockRule({ body: "Paragraph one.\n\nParagraph two." });

      const doc = transformRuleToViewerDoc(rule, []);

      expect(doc.subsections).toEqual([]);
      expect(doc.body).toBe("Paragraph one.\n\nParagraph two.");
    });

    it("does not synthesize a heading-only subsection when no children exist", () => {
      const rule = mockRule({ heading: "Fallback heading" });

      const doc = transformRuleToViewerDoc(rule, []);

      expect(doc.subsections).toEqual([]);
    });

    it("does not synthesize a default subsection when no source content exists", () => {
      const rule = mockRule({});

      const doc = transformRuleToViewerDoc(rule, []);

      expect(doc.subsections).toEqual([]);
    });

    it("uses formatted citation_path when source_path is null", () => {
      const rule = mockRule({
        id: "abc-123",
        source_path: null,
        citation_path: "us/statute/26/24/a",
      });

      const doc = transformRuleToViewerDoc(rule, []);

      expect(doc.citation).toBe("26 U.S.C. § 24(a)");
    });

    it("preserves human-readable source citations", () => {
      const rule = mockRule({
        source_path: "26 USC 24(d)(1)(A)",
        citation_path: "us/statute/26/24/d/1/A",
      });

      const doc = transformRuleToViewerDoc(rule, []);

      expect(doc.citation).toBe("26 USC 24(d)(1)(A)");
    });
  });

  describe("with contextText option", () => {
    it("sets contextText on returned doc", () => {
      const rule = mockRule({ heading: "Section 1" });

      const doc = transformRuleToViewerDoc(rule, [], {
        contextText: "You are viewing subsection (a)",
      });

      expect(doc.contextText).toBe("You are viewing subsection (a)");
    });
  });

  describe("with highlightId option", () => {
    it("sets highlightedSubsection on returned doc", () => {
      const rule = mockRule({ heading: "Section 1" });

      const doc = transformRuleToViewerDoc(rule, [], {
        highlightId: "a",
      });

      expect(doc.highlightedSubsection).toBe("a");
    });
  });

  describe("with both options", () => {
    it("sets both contextText and highlightedSubsection", () => {
      const rule = mockRule({ heading: "Section 1" });

      const doc = transformRuleToViewerDoc(rule, [], {
        contextText: "Context here",
        highlightId: "b",
      });

      expect(doc.contextText).toBe("Context here");
      expect(doc.highlightedSubsection).toBe("b");
    });
  });

  describe("empty contextText", () => {
    it("does not set contextText for empty string", () => {
      const rule = mockRule({ heading: "Section 1" });

      const doc = transformRuleToViewerDoc(rule, [], {
        contextText: "",
      });

      expect(doc.contextText).toBeUndefined();
    });
  });

  describe("raw body passthrough for inline citation refs", () => {
    it("sets body field for leaf rules with body text", () => {
      const rule = mockRule({ body: "Paragraph one.\n\nParagraph two." });

      const doc = transformRuleToViewerDoc(rule, []);

      expect(doc.body).toBe("Paragraph one.\n\nParagraph two.");
    });

    it("omits body field when the rule has children", () => {
      const rule = mockRule({ body: "Ignored parent body." });
      const children = [mockRule({ id: "c1", body: "Child body" })];

      const doc = transformRuleToViewerDoc(rule, children);

      expect(doc.body).toBeUndefined();
    });

    it("omits body field when the rule has no body", () => {
      const rule = mockRule({ heading: "Empty leaf" });

      const doc = transformRuleToViewerDoc(rule, []);

      expect(doc.body).toBeUndefined();
    });
  });

  describe("children use citation_path segment as subsection ID", () => {
    it("uses last segment of citation_path instead of letter index", () => {
      const rule = mockRule({ heading: "Section 24(d)(1)" });
      const children = [
        mockRule({
          id: "c1",
          body: "Subparagraph A text",
          citation_path: "us/statute/26/24/d/1/A",
        }),
        mockRule({
          id: "c2",
          body: "Subparagraph B text",
          citation_path: "us/statute/26/24/d/1/B",
        }),
      ];

      const doc = transformRuleToViewerDoc(rule, children, {
        highlightId: "A",
      });

      expect(doc.subsections[0].id).toBe("A");
      expect(doc.subsections[1].id).toBe("B");
      expect(doc.highlightedSubsection).toBe("A");
    });
  });

  describe("repealed provisions", () => {
    it("marks rules with a repeal date as repealed", () => {
      const rule = mockRule({ repeal_date: "2010-01-01" });

      expect(isRuleRepealed(rule)).toBe(true);
      expect(transformRuleToViewerDoc(rule, []).isRepealed).toBe(true);
    });

    it("marks repealed headings as repealed", () => {
      const rule = mockRule({ heading: "[Repealed]" });

      expect(isRuleRepealed(rule)).toBe(true);
      expect(transformRuleToViewerDoc(rule, []).isRepealed).toBe(true);
    });

    it("does not mark active rules as repealed", () => {
      const rule = mockRule({ heading: "Tax imposed" });

      expect(isRuleRepealed(rule)).toBe(false);
      expect(transformRuleToViewerDoc(rule, []).isRepealed).toBeUndefined();
    });
  });
});
