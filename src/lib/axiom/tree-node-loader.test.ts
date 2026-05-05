import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTreeNodes } from "./tree-node-loader";
import { NavigationIndexMissingError } from "./navigation-index/read";
import type { NavigationNodeRow } from "./navigation-index/types";

const mockGetNavigationDocTypes = vi.fn();
const mockGetNavigationIndexChildren = vi.fn();
const mockGetNavigationIndexNode = vi.fn();
const mockGetProvisionForNavigationNode = vi.fn();
const mockNavigationDocTypeToTreeNode = vi.fn((segment: string) => ({
  segment,
  label: segment,
  hasChildren: true,
  nodeType: "doc_type",
}));
const mockNavigationRowToTreeNode = vi.fn((row: NavigationNodeRow) => ({
  segment: row.segment,
  label: row.label,
  hasChildren: row.has_children,
  childCount: row.child_count || undefined,
  nodeType: "section",
  rule: { id: row.provision_id ?? row.id, citation_path: row.path },
}));

vi.mock("./navigation-index/read", async () => {
  const actual = await vi.importActual<typeof import("./navigation-index/read")>(
    "./navigation-index/read"
  );
  return {
    ...actual,
    getNavigationDocTypes: (...args: unknown[]) =>
      mockGetNavigationDocTypes(...args),
    getNavigationIndexChildren: (...args: unknown[]) =>
      mockGetNavigationIndexChildren(...args),
    getNavigationIndexNode: (...args: unknown[]) =>
      mockGetNavigationIndexNode(...args),
    getProvisionForNavigationNode: (...args: unknown[]) =>
      mockGetProvisionForNavigationNode(...args),
    navigationDocTypeToTreeNode: (segment: string) =>
      mockNavigationDocTypeToTreeNode(segment),
    navigationRowToTreeNode: (row: NavigationNodeRow) =>
      mockNavigationRowToTreeNode(row),
  };
});

function navRow(overrides: Partial<NavigationNodeRow> = {}): NavigationNodeRow {
  return {
    id: "nav-1",
    jurisdiction: "us-co",
    doc_type: "regulation",
    path: "us-co/regulation/10-ccr-2506-1",
    parent_path: null,
    segment: "10-ccr-2506-1",
    label: "10 CCR 2506-1",
    sort_key: "0001",
    depth: 0,
    provision_id: "provision-1",
    citation_path: "us-co/regulation/10-ccr-2506-1",
    has_children: true,
    child_count: 3,
    has_rulespec: false,
    encoded_descendant_count: 0,
    status: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadTreeNodes", () => {
  it("loads document type nodes from the navigation index", async () => {
    mockGetNavigationDocTypes.mockResolvedValue({
      docTypes: ["regulation", "statute"],
    });

    const result = await loadTreeNodes({
      dbJurisdictionId: "us-co",
      ruleSegments: [],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(mockGetNavigationDocTypes).toHaveBeenCalledWith("us-co", false);
    expect(result.nodes.map((node) => node.segment)).toEqual([
      "regulation",
      "statute",
    ]);
    expect(result.hasMore).toBe(false);
  });

  it("loads top-level doc_type children from parent_path null", async () => {
    const row = navRow();
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [row],
      hasMore: true,
      total: 101,
    });

    const result = await loadTreeNodes({
      dbJurisdictionId: "us-co",
      ruleSegments: ["regulation"],
      hasCitationPaths: true,
      encodedOnly: true,
      page: 1,
    });

    expect(mockGetNavigationIndexChildren).toHaveBeenCalledWith({
      jurisdiction: "us-co",
      docType: "regulation",
      parentPath: null,
      encodedOnly: true,
      page: 1,
    });
    expect(result.nodes[0]).toEqual(
      expect.objectContaining({ segment: "10-ccr-2506-1" })
    );
    expect(result.hasMore).toBe(true);
  });

  it("loads deep children and current provision from the index path", async () => {
    const child = navRow({
      path: "us-co/regulation/10-ccr-2506-1/4.401",
      parent_path: "us-co/regulation/10-ccr-2506-1",
      segment: "4.401",
      label: "4.401",
    });
    const current = navRow();
    const currentRule = {
      id: "provision-1",
      citation_path: "us-co/regulation/10-ccr-2506-1",
    };
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [child],
      hasMore: false,
      total: 1,
    });
    mockGetNavigationIndexNode.mockResolvedValue(current);
    mockGetProvisionForNavigationNode.mockResolvedValue(currentRule);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us-co",
      ruleSegments: ["regulation", "10-ccr-2506-1"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(mockGetNavigationIndexChildren).toHaveBeenCalledWith({
      jurisdiction: "us-co",
      docType: "regulation",
      parentPath: "us-co/regulation/10-ccr-2506-1",
      encodedOnly: false,
      page: 0,
    });
    expect(mockGetNavigationIndexNode).toHaveBeenCalledWith(
      "us-co/regulation/10-ccr-2506-1"
    );
    expect(result.currentRule).toEqual(currentRule);
    expect(result.nodes.map((node) => node.segment)).toEqual(["4.401"]);
  });

  it("returns a leaf rule when the indexed node has no children", async () => {
    const leaf = navRow({
      path: "us-co/regulation/10-ccr-2506-1/4.401",
      parent_path: "us-co/regulation/10-ccr-2506-1",
      segment: "4.401",
      has_children: false,
      child_count: 0,
    });
    const leafRule = {
      id: "leaf-provision",
      citation_path: leaf.path,
    };
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockGetNavigationIndexNode.mockResolvedValue(leaf);
    mockGetProvisionForNavigationNode.mockResolvedValue(leafRule);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us-co",
      ruleSegments: ["regulation", "10-ccr-2506-1", "4.401"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(result.leafRule).toEqual(leafRule);
    expect(result.nodes).toEqual([]);
  });

  it("throws a clear missing-index error when a deep route has no node", async () => {
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockGetNavigationIndexNode.mockResolvedValue(null);

    await expect(
      loadTreeNodes({
        dbJurisdictionId: "us-co",
        ruleSegments: ["regulation", "missing"],
        hasCitationPaths: true,
        encodedOnly: false,
        page: 0,
      })
    ).rejects.toThrow(NavigationIndexMissingError);
  });
});
