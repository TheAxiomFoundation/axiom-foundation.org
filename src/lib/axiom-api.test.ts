import { describe, expect, it, vi } from "vitest";

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

import {
  AXIOM_API_MAX_CHILD_LIMIT,
  AXIOM_API_MAX_DEPTH,
  AXIOM_API_MAX_LIMIT,
  AxiomApiError,
  axiomApiErrorPayload,
  axiomApiJson,
  axiomApiOptions,
  encodeCitationPath,
  listAxiomDocuments,
  makeAxiomApiDiscovery,
  normalizeCitationPath,
  parseAxiomDocumentListOptions,
  parseAxiomDocumentTreeOptions,
  publicAxiomRuleFromRule,
} from "./axiom-api";
import type { Rule } from "./supabase";

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "rule-1",
    jurisdiction: "us",
    doc_type: "statute",
    parent_id: null,
    level: 1,
    ordinal: 1,
    heading: "Earned income",
    body: "Section text",
    effective_date: null,
    repeal_date: null,
    source_url: "https://example.test/source",
    source_path: "26 USC 32",
    citation_path: "us/statute/26/32",
    rulespec_path: "statute/26/32.yaml",
    has_rulespec: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("axiom API helpers", () => {
  it("parses document-list query options and clamps limit", () => {
    const params = new URLSearchParams({
      id: "abc",
      jurisdiction: "us",
      doc_type: "statute",
      parent_id: "parent-1",
      parent_citation_path: "us/statute/26/32",
      citation_path: "us/statute/26/32/a",
      root: "true",
      include_body: "yes",
      limit: "9999",
      offset: "25",
    });

    expect(parseAxiomDocumentListOptions(params)).toEqual({
      id: "abc",
      jurisdiction: "us",
      docType: "statute",
      parentId: "parent-1",
      parentCitationPath: "us/statute/26/32",
      citationPath: "us/statute/26/32/a",
      root: true,
      includeBody: true,
      limit: AXIOM_API_MAX_LIMIT,
      offset: 25,
    });
  });

  it("uses public-safe defaults for document-list options", () => {
    expect(parseAxiomDocumentListOptions(new URLSearchParams())).toEqual({
      id: undefined,
      jurisdiction: undefined,
      docType: undefined,
      parentId: undefined,
      parentCitationPath: undefined,
      citationPath: undefined,
      root: false,
      includeBody: false,
      limit: 100,
      offset: 0,
    });
  });

  it("throws a 400 for invalid boolean and integer query params", () => {
    expect(() =>
      parseAxiomDocumentListOptions(new URLSearchParams("limit=abc"))
    ).toThrow(AxiomApiError);
    expect(() =>
      parseAxiomDocumentListOptions(new URLSearchParams("include_body=maybe"))
    ).toThrow(AxiomApiError);
  });

  it("parses tree query options and clamps expensive recursion controls", () => {
    const options = parseAxiomDocumentTreeOptions(
      new URLSearchParams("include_body=false&depth=99&child_limit=9999")
    );

    expect(options).toEqual({
      includeBody: false,
      depth: AXIOM_API_MAX_DEPTH,
      childLimit: AXIOM_API_MAX_CHILD_LIMIT,
    });
  });

  it("normalizes and URL-encodes citation paths", () => {
    expect(normalizeCitationPath("/us/statute/26/32/a/")).toBe(
      "us/statute/26/32/a"
    );
    expect(encodeCitationPath("uk/legislation/uksi/2013/376/regulation/4A")).toBe(
      "uk/legislation/uksi/2013/376/regulation/4A"
    );
    expect(encodeCitationPath("us/statute/26/32(a)")).toBe(
      "us/statute/26/32(a)"
    );
  });

  it("serializes a rule as a public document node with body and links", () => {
    const result = publicAxiomRuleFromRule(makeRule());

    expect(result).toMatchObject({
      id: "rule-1",
      jurisdiction: "us",
      doc_type: "statute",
      heading: "Earned income",
      citation_path: "us/statute/26/32",
      citation_segments: ["us", "statute", "26", "32"],
      body: "Section text",
      links: {
        self: "/api/axiom/documents/us/statute/26/32",
        html: "/us/statute/26/32",
        children: "/api/axiom/documents?parent_id=rule-1",
      },
    });
  });

  it("can omit body text from list responses", () => {
    const result = publicAxiomRuleFromRule(makeRule(), { includeBody: false });
    expect("body" in result).toBe(false);
  });

  it("falls back to id-based links for rules without citation paths", () => {
    const result = publicAxiomRuleFromRule(
      makeRule({ citation_path: null, id: "uuid-1" })
    );

    expect(result.citation_segments).toEqual([]);
    expect(result.links.self).toBe("/api/axiom/documents?id=uuid-1");
    expect(result.links.html).toBe("/uuid-1");
  });

  it("builds a self-describing discovery payload", () => {
    const discovery = makeAxiomApiDiscovery("https://axiom.test/");

    expect(discovery.name).toBe("Axiom API");
    expect(discovery.endpoints.documents.href).toBe(
      "https://axiom.test/api/axiom/documents"
    );
    expect(discovery.examples[1]).toContain(
      "https://axiom.test/api/axiom/documents/us/statute/26/32?depth=3"
    );
  });

  it("returns CORS and cache headers for JSON and OPTIONS responses", () => {
    const json = axiomApiJson({ ok: true });
    expect(json.headers.get("access-control-allow-origin")).toBe("*");
    expect(json.headers.get("cache-control")).toContain("s-maxage=300");

    const options = axiomApiOptions();
    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-methods")).toContain("GET");
    expect(options.headers.get("cache-control")).toBe("no-store");
  });

  it("formats expected and unexpected API errors", () => {
    expect(
      axiomApiErrorPayload(new AxiomApiError(404, "Missing", { id: "x" }))
    ).toEqual({
      status: 404,
      body: { error: "Missing", details: { id: "x" } },
    });

    expect(axiomApiErrorPayload(new Error("boom"))).toEqual({
      status: 500,
      body: { error: "Axiom API request failed." },
    });
  });

  it("filters root list responses to citation-path documents", async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      not: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await listAxiomDocuments({
      jurisdiction: "us",
      docType: "statute",
      root: true,
      includeBody: false,
      limit: 25,
      offset: 0,
    });

    expect(chain.is).toHaveBeenCalledWith("parent_id", null);
    expect(chain.not).toHaveBeenCalledWith("citation_path", "is", null);
    expect(chain.order).toHaveBeenCalledWith("ordinal");
  });
});
