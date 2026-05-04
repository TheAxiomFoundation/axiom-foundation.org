import { describe, it, expect, vi } from "vitest";

const { mockIn } = vi.hoisted(() => ({ mockIn: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabaseCorpus: {
    from: () => ({
      select: () => ({
        in: mockIn,
      }),
    }),
  },
}));

import {
  AXIOM_APP_URL,
  getAxiomRuleMetadata,
  buildLegislationJsonLd,
} from "./metadata";

describe("getAxiomRuleMetadata", () => {
  it("returns a generic axiom payload when segments is empty", async () => {
    const meta = await getAxiomRuleMetadata(undefined);
    expect(meta.rule).toBeNull();
    expect(meta.citationPath).toBe("");
    expect(meta.canonicalUrl).toBe(AXIOM_APP_URL);
    expect(meta.title).toContain("Axiom");
    expect(meta.description).toContain("encoded legal code");
  });

  it("returns axiom payload for empty segments array", async () => {
    const meta = await getAxiomRuleMetadata([]);
    expect(meta.citationPath).toBe("");
    expect(meta.canonicalUrl).toBe(AXIOM_APP_URL);
  });

  it("returns a rule-specific payload when the path resolves to an ingested rule", async () => {
    mockIn.mockResolvedValue({
      data: [
        {
          id: "r1",
          citation_path: "us/statute/26/32",
          heading: "Earned income",
          body: "There shall be allowed a credit...",
          jurisdiction: "us",
          doc_type: "statute",
          updated_at: "2026-01-01",
        },
      ],
      error: null,
    });
    const meta = await getAxiomRuleMetadata(["us", "statute", "26", "32"]);
    expect(meta.rule?.id).toBe("r1");
    expect(meta.citationPath).toBe("us/statute/26/32");
    expect(meta.canonicalUrl).toBe(`${AXIOM_APP_URL}/us/statute/26/32`);
    expect(meta.title).toContain("Earned income");
    expect(meta.title).toContain("us/statute/26/32");
    expect(meta.description).toContain("There shall be allowed");
    expect(meta.jurisdiction).toBe("us");
    expect(meta.docType).toBe("statute");
  });

  it("falls through to a 'not yet ingested' payload when no prefix matches", async () => {
    mockIn.mockResolvedValue({ data: [], error: null });
    const meta = await getAxiomRuleMetadata(["us", "statute", "99", "99"]);
    expect(meta.rule).toBeNull();
    expect(meta.citationPath).toBe("us/statute/99/99");
    expect(meta.title).toContain("us/statute/99/99");
    expect(meta.description).toContain("not yet ingested");
  });

  it("resolves chapter-prefixed state statute aliases to canonical metadata", async () => {
    let lookupPaths: string[] = [];
    mockIn.mockImplementation((_column: string, paths: string[]) => {
      lookupPaths = paths;
      return Promise.resolve({
        data: [
          {
            id: "ky-12-215",
            citation_path: "us-ky/statute/3/12.215",
            heading: "Expenses incurred by Attorney General",
            body: "The expenses incurred by the Attorney General...",
            jurisdiction: "us-ky",
            doc_type: "statute",
            updated_at: "2026-01-01",
          },
        ],
        error: null,
      });
    });

    const meta = await getAxiomRuleMetadata([
      "us-ky",
      "statute",
      "3",
      "chapter-12",
      "12.215",
    ]);

    expect(lookupPaths).toEqual([
      "us-ky/statute/3/chapter-12/12.215",
      "us-ky/statute/3/12.215",
      "us-ky/statute/3/chapter-12",
      "us-ky/statute/3",
      "us-ky/statute",
      "us-ky",
    ]);
    expect(meta.rule?.id).toBe("ky-12-215");
    expect(meta.canonicalUrl).toBe(
      `${AXIOM_APP_URL}/us-ky/statute/3/12.215`
    );
    expect(meta.title).toContain("us-ky/statute/3/12.215");
  });

  it("uses heading in description when body is absent", async () => {
    mockIn.mockResolvedValue({
      data: [
        {
          id: "r",
          citation_path: "us/statute/26/32",
          heading: "Earned income",
          body: null,
          jurisdiction: "us",
          doc_type: "statute",
          updated_at: null,
        },
      ],
      error: null,
    });
    const meta = await getAxiomRuleMetadata(["us", "statute", "26", "32"]);
    expect(meta.description).toContain("Earned income");
  });

  it("falls back to citation-only description when heading and body are both absent", async () => {
    mockIn.mockResolvedValue({
      data: [
        {
          id: "r",
          citation_path: "us/statute/26/32",
          heading: null,
          body: null,
          jurisdiction: "us",
          doc_type: "statute",
          updated_at: null,
        },
      ],
      error: null,
    });
    const meta = await getAxiomRuleMetadata(["us", "statute", "26", "32"]);
    expect(meta.description).toContain("us/statute/26/32");
    expect(meta.title).toBe("us/statute/26/32 · Axiom");
  });

  it("truncates long bodies at a sentence boundary in the description", async () => {
    const longBody = "a".repeat(250);
    mockIn.mockResolvedValue({
      data: [
        {
          id: "r",
          citation_path: "us/statute/26/32",
          heading: "H",
          body: longBody,
          jurisdiction: "us",
          doc_type: "statute",
          updated_at: null,
        },
      ],
      error: null,
    });
    const meta = await getAxiomRuleMetadata(["us", "statute", "26", "32"]);
    // 200-char cap with ellipsis; our truncator appends "…"
    expect(meta.description.length).toBeLessThanOrEqual(201);
    expect(meta.description.endsWith("…")).toBe(true);
  });
});

describe("buildLegislationJsonLd", () => {
  it("returns null when metadata has no rule", () => {
    const json = buildLegislationJsonLd({
      rule: null,
      title: "",
      description: "",
      canonicalUrl: "",
      citationPath: "",
      jurisdiction: null,
      docType: null,
    });
    expect(json).toBeNull();
  });

  it("maps statute rules to schema.org Statute", () => {
    const json = buildLegislationJsonLd({
      rule: {
        id: "r",
        citation_path: "us/statute/26/32",
        heading: "Earned income",
        body: "Body",
        jurisdiction: "us",
        doc_type: "statute",
        updated_at: "2026-01-01",
      } as unknown as Parameters<typeof buildLegislationJsonLd>[0]["rule"],
      title: "",
      description: "",
      canonicalUrl: "https://example.com/x",
      citationPath: "us/statute/26/32",
      jurisdiction: "us",
      docType: "statute",
    }) as Record<string, unknown>;
    expect(json["@type"]).toBe("Legislation");
    expect(json.legislationType).toBe("Statute");
    expect(json.legislationIdentifier).toBe("us/statute/26/32");
    expect(json.legislationJurisdiction).toBe("us");
    expect(json.url).toBe("https://example.com/x");
  });

  it("maps regulation rules to schema.org Regulation", () => {
    const json = buildLegislationJsonLd({
      rule: {
        id: "r",
        citation_path: "us/regulation/7/273",
        heading: "Part 273",
        body: null,
        jurisdiction: "us",
        doc_type: "regulation",
        updated_at: null,
      } as unknown as Parameters<typeof buildLegislationJsonLd>[0]["rule"],
      title: "",
      description: "",
      canonicalUrl: "x",
      citationPath: "us/regulation/7/273",
      jurisdiction: "us",
      docType: "regulation",
    }) as Record<string, unknown>;
    expect(json.legislationType).toBe("Regulation");
  });

  it("maps UK legislation rules to schema.org Act", () => {
    const json = buildLegislationJsonLd({
      rule: {
        id: "r",
        citation_path: "uk/legislation/ukpga/2012/5",
        heading: "Welfare Reform Act",
        body: null,
        jurisdiction: "uk",
        doc_type: "legislation",
        updated_at: null,
      } as unknown as Parameters<typeof buildLegislationJsonLd>[0]["rule"],
      title: "",
      description: "",
      canonicalUrl: "x",
      citationPath: "uk/legislation/ukpga/2012/5",
      jurisdiction: "uk",
      docType: "legislation",
    }) as Record<string, unknown>;
    expect(json.legislationType).toBe("Act");
  });
});
