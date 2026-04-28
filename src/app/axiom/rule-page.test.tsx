import { describe, it, expect } from "vitest";
import { transformRuleToViewerDoc, getJurisdictionLabel, isGitHubEncoding, isEncodingRun } from "@/lib/axiom-utils";
import type { Rule, RuleEncodingData } from "@/lib/supabase";

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "rule-1",
    jurisdiction: "us",
    doc_type: "statute",
    parent_id: null,
    level: 0,
    ordinal: 1,
    heading: "Section 1 - Tax imposed",
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: "statute/26/1",
    citation_path: "us/statute/26/1",
    rulespec_path: null,
    has_rulespec: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
    ...overrides,
  };
}

describe("transformRuleToViewerDoc", () => {
  it("creates subsections from children", () => {
    const rule = makeRule();
    const children = [
      makeRule({ id: "c1", body: "Child 1 text", heading: null }),
      makeRule({ id: "c2", body: null, heading: "Child 2 heading" }),
      makeRule({ id: "c3", body: null, heading: null }),
    ];
    const doc = transformRuleToViewerDoc(rule, children);
    expect(doc.subsections).toEqual([
      { id: "a", text: "Child 1 text" },
      { id: "b", text: "Child 2 heading" },
      { id: "c", text: "" },
    ]);
    expect(doc.title).toBe("Section 1 - Tax imposed");
    expect(doc.citation).toBe("26 U.S.C. § 1");
  });

  it("splits body into paragraphs when no children", () => {
    const rule = makeRule({ body: "Paragraph one.\n\nParagraph two." });
    const doc = transformRuleToViewerDoc(rule, []);
    expect(doc.subsections).toEqual([
      { id: "a", text: "Paragraph one." },
      { id: "b", text: "Paragraph two." },
    ]);
  });

  it("uses heading fallback when no body and no children", () => {
    const rule = makeRule({ body: null });
    const doc = transformRuleToViewerDoc(rule, []);
    expect(doc.subsections).toEqual([
      { id: "a", text: "Section 1 - Tax imposed" },
    ]);
  });

  it('uses "No content available." when no heading, body, or children', () => {
    const rule = makeRule({ heading: null, body: null });
    const doc = transformRuleToViewerDoc(rule, []);
    expect(doc.subsections).toEqual([
      { id: "a", text: "No content available." },
    ]);
    expect(doc.title).toBe("Untitled");
  });

  it("uses formatted citation_path when source_path is null", () => {
    const rule = makeRule({ source_path: null });
    const doc = transformRuleToViewerDoc(rule, []);
    expect(doc.citation).toBe("26 U.S.C. § 1");
  });

  it("passes hasRuleSpec, jurisdiction, and sourcePath", () => {
    const rule = makeRule({
      has_rulespec: true,
      jurisdiction: "uk",
      source_path: "statute/uk/1",
    });
    const doc = transformRuleToViewerDoc(rule, []);
    expect(doc.hasRuleSpec).toBe(true);
    expect(doc.jurisdiction).toBe("uk");
    expect(doc.sourcePath).toBe("statute/uk/1");
  });

  it("formats UK legislation citation paths when source_path is archival", () => {
    const rule = makeRule({
      jurisdiction: "uk",
      doc_type: "legislation",
      source_path: "sources/official/uksi/2013/376/2025-04-01/source.xml",
      citation_path:
        "uk/legislation/uksi/2013/376/regulation/22/work-allowance-without-housing",
    });
    const doc = transformRuleToViewerDoc(rule, []);
    expect(doc.citation).toBe(
      "UKSI 2013/376 regulation 22 work allowance without housing"
    );
  });
});

describe("getJurisdictionLabel", () => {
  it('returns US for "us"', () => {
    expect(getJurisdictionLabel("us")).toBe("US");
  });

  it('returns UK for "uk"', () => {
    expect(getJurisdictionLabel("uk")).toBe("UK");
  });

  it('returns CA for "canada"', () => {
    expect(getJurisdictionLabel("canada")).toBe("CA");
  });

  it("returns state abbreviation for us- prefix", () => {
    expect(getJurisdictionLabel("us-ny")).toBe("NY");
    expect(getJurisdictionLabel("us-ca")).toBe("CA");
  });

  it("returns US for unknown jurisdiction", () => {
    expect(getJurisdictionLabel("other")).toBe("US");
  });
});

describe("isGitHubEncoding / isEncodingRun", () => {
  const runEncoding = { encoding_run_id: "enc-1" } as RuleEncodingData;
  const ghEncoding = { encoding_run_id: "github:statute/26/1.yaml" } as RuleEncodingData;

  it("returns true for GitHub encoding IDs", () => {
    expect(isGitHubEncoding(ghEncoding)).toBe(true);
    expect(isEncodingRun(ghEncoding)).toBe(false);
  });

  it("returns true for stored encoding-run IDs", () => {
    expect(isGitHubEncoding(runEncoding)).toBe(false);
    expect(isEncodingRun(runEncoding)).toBe(true);
  });

  it("handles null encoding", () => {
    expect(isGitHubEncoding(null)).toBe(false);
    expect(isEncodingRun(null)).toBe(false);
  });
});
