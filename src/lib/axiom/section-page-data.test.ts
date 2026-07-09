import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Rule } from "@/lib/supabase";

/**
 * Integration-shaped tests for getSectionPageData: the Supabase
 * clients and navigation-index reads are mocked at the module
 * boundary; assembly logic (fallback walk, chunking, toc, neighbor
 * resolution, encoding mapping) runs for real.
 */

const { fromMock, getRuleReferencesMock, getRuleEncodingMock } = vi.hoisted(
  () => ({
    fromMock: vi.fn(),
    getRuleReferencesMock: vi.fn(),
    getRuleEncodingMock: vi.fn(),
  })
);
const { getProvisionByCitationPathMock } = vi.hoisted(() => ({
  getProvisionByCitationPathMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseCorpus: { from: fromMock },
  getRuleReferences: getRuleReferencesMock,
  getRuleEncoding: getRuleEncodingMock,
}));

vi.mock("@/lib/axiom/navigation-index/read", () => ({
  getProvisionByCitationPath: getProvisionByCitationPathMock,
}));

vi.mock("@/lib/tree-data", () => ({
  resolveAxiomPath: (segments: string[]) =>
    segments.length >= 2
      ? {
          phase: "rule",
          jurisdiction: { slug: segments[0], hasCitationPaths: true },
          ruleSegments: segments.slice(1),
        }
      : { phase: "jurisdiction-picker", jurisdiction: null, ruleSegments: [] },
  buildBreadcrumbs: (segments: string[]) =>
    segments.map((segment, index) => ({
      label: segment,
      href: "/" + segments.slice(0, index + 1).join("/"),
    })),
}));

import { getSectionPageData } from "./section-page";

/** Chainable query stub: every builder method returns the chain, the
 *  chain is thenable, and maybeSingle resolves the same result. */
function chain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};
  for (const method of [
    "select",
    "gte",
    "lt",
    "gt",
    "eq",
    "is",
    "order",
    "limit",
  ]) {
    self[method] = () => self;
  }
  self.maybeSingle = () => Promise.resolve(result);
  self.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return self;
}

function rule(citationPath: string, overrides: Partial<Rule> = {}): Rule {
  return {
    id: `id-${citationPath}`,
    jurisdiction: "us",
    doc_type: "statute",
    parent_id: null,
    level: citationPath.split("/").length,
    ordinal: null,
    heading: "Heading",
    body: "(a) First subsection text.\n\n(b) Second subsection text.",
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: null,
    citation_path: citationPath,
    rulespec_path: null,
    has_rulespec: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const NAV_NODE = {
  id: "nav-1",
  jurisdiction: "us",
  doc_type: "statute",
  path: "us/statute/26/32",
  parent_path: "us/statute/26",
  segment: "32",
  label: "§ 32",
  sort_key: "0032",
  depth: 3,
  provision_id: null,
  citation_path: "us/statute/26/32",
  has_children: false,
  child_count: 0,
  has_rulespec: true,
  encoded_descendant_count: 0,
  status: null,
};

const YAML = [
  "format: rulespec/v1",
  "module:",
  "  name: eitc",
  "rules:",
  "  - name: rule_a",
  "    kind: derived",
  "    source: 26 USC 32(a)",
  "    versions:",
  "      - effective_from: '2026-01-01'",
  "        formula: 'x'",
].join("\n");

function queueTables(queues: Record<string, Array<{ data: unknown; error: unknown }>>) {
  fromMock.mockImplementation((table: string) => {
    const next = queues[table]?.shift();
    return chain(next ?? { data: null, error: { message: `no queued result for ${table}` } });
  });
}

beforeEach(() => {
  fromMock.mockReset();
  getRuleReferencesMock.mockReset().mockResolvedValue([]);
  getRuleEncodingMock.mockReset().mockResolvedValue(null);
  getProvisionByCitationPathMock.mockReset();
});

describe("getSectionPageData", () => {
  it("assembles a section-granular page: chunks, toc, neighbors, encoding map", async () => {
    getProvisionByCitationPathMock.mockResolvedValue(rule("us/statute/26/32"));
    getRuleEncodingMock.mockResolvedValue({ rulespec_content: YAML });
    queueTables({
      current_provisions: [{ data: [], error: null }], // empty subtree
      navigation_nodes: [
        { data: NAV_NODE, error: null }, // current node
        { data: [{ path: "us/statute/26/31", citation_path: "us/statute/26/31", label: "§ 31" }], error: null }, // prev
        { data: [{ path: "us/statute/26/33", citation_path: null, label: "§ 33" }], error: null }, // next
      ],
    });

    const data = await getSectionPageData(["us", "statute", "26", "32"]);
    expect(data).not.toBeNull();
    expect(data!.citationPath).toBe("us/statute/26/32");
    expect(data!.focusAnchor).toBeNull();
    expect(data!.bodyChunks.map((chunk) => chunk.anchor)).toEqual(["a", "b"]);
    expect(data!.toc.map((entry) => entry.anchor)).toEqual(["a", "b"]);
    expect(data!.prev).toEqual({
      citationPath: "us/statute/26/31",
      label: "§ 31",
    });
    // next falls back to path when citation_path is null
    expect(data!.next).toEqual({
      citationPath: "us/statute/26/33",
      label: "§ 33",
    });
    expect(data!.encodedRules).toEqual([
      { name: "rule_a", kind: "derived", anchors: ["a"] },
    ]);
    expect(data!.breadcrumbs.at(-1)?.label).toBe("32");
  });

  it("prefers descendant rows over body chunks when they exist", async () => {
    getProvisionByCitationPathMock.mockResolvedValue(rule("us/statute/26/32"));
    queueTables({
      current_provisions: [
        {
          data: [
            rule("us/statute/26/32/a/1", { heading: null }),
            rule("us/statute/26/32/a", { heading: "In general" }),
          ],
          error: null,
        },
      ],
      navigation_nodes: [{ data: null, error: null }],
    });

    const data = await getSectionPageData(["us", "statute", "26", "32"]);
    expect(data!.provisions.map((p) => p.anchor)).toEqual(["a", "a-1"]);
    expect(data!.bodyChunks).toEqual([]);
    expect(data!.toc[0].label).toBe("(a) In general");
    expect(data!.prev).toBeNull();
    expect(data!.next).toBeNull();
  });

  it("walks up to the nearest ingested ancestor and sets the focus anchor", async () => {
    getProvisionByCitationPathMock.mockImplementation((path: string) =>
      Promise.resolve(path === "us/statute/26/32" ? rule(path) : null)
    );
    queueTables({
      current_provisions: [{ data: [], error: null }],
      navigation_nodes: [{ data: null, error: null }],
    });

    const data = await getSectionPageData(["us", "statute", "26", "32", "a", "1"]);
    expect(data!.citationPath).toBe("us/statute/26/32");
    expect(data!.focusAnchor).toBe("a");
  });

  it("returns null when nothing at or above the path is ingested", async () => {
    getProvisionByCitationPathMock.mockResolvedValue(null);
    const data = await getSectionPageData(["us", "statute", "99", "9999"]);
    expect(data).toBeNull();
  });

  it("returns null for unresolvable paths", async () => {
    expect(await getSectionPageData(["us"])).toBeNull();
  });

  it("survives query errors with empty neighbors and subtree", async () => {
    getProvisionByCitationPathMock.mockResolvedValue(rule("us/statute/26/32"));
    getRuleReferencesMock.mockRejectedValue(new Error("rpc down"));
    getRuleEncodingMock.mockRejectedValue(new Error("encoding down"));
    queueTables({
      current_provisions: [{ data: null, error: { message: "boom" } }],
      navigation_nodes: [{ data: null, error: { message: "boom" } }],
    });

    const data = await getSectionPageData(["us", "statute", "26", "32"]);
    expect(data).not.toBeNull();
    expect(data!.rootRefs).toEqual([]);
    expect(data!.encoding).toBeNull();
    expect(data!.prev).toBeNull();
    expect(data!.next).toBeNull();
  });
});
