import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTreeNodes } from "./tree-node-loader";
import { NavigationIndexMissingError } from "./navigation-index/read";
import type { NavigationNodeRow } from "./navigation-index/types";

const mockGetNavigationDocTypes = vi.fn();
const mockGetNavigationIndexChildren = vi.fn();
const mockGetNavigationIndexNode = vi.fn();
const mockGetNavigationIndexPrefixRows = vi.fn();
const mockGetProvisionForNavigationNode = vi.fn();
const mockListEncodedFiles = vi.fn();
const mockSynthesiseRuleFromCitationPath = vi.fn();
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
    getNavigationIndexPrefixRows: (...args: unknown[]) =>
      mockGetNavigationIndexPrefixRows(...args),
    getProvisionForNavigationNode: (...args: unknown[]) =>
      mockGetProvisionForNavigationNode(...args),
    navigationDocTypeToTreeNode: (segment: string) =>
      mockNavigationDocTypeToTreeNode(segment),
    navigationRowToTreeNode: (row: NavigationNodeRow) =>
      mockNavigationRowToTreeNode(row),
  };
});

vi.mock("@/lib/axiom/rulespec/repo-listing", () => ({
  listEncodedFiles: (...args: unknown[]) => mockListEncodedFiles(...args),
}));

vi.mock("@/lib/axiom/rulespec/synth-rule", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/axiom/rulespec/synth-rule")
  >("@/lib/axiom/rulespec/synth-rule");
  return {
    ...actual,
    synthesiseRuleFromCitationPath: (...args: unknown[]) =>
      mockSynthesiseRuleFromCitationPath(...args),
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
  mockListEncodedFiles.mockResolvedValue([]);
  mockGetNavigationIndexPrefixRows.mockResolvedValue([]);
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

  it("adds document type roots that only exist in RuleSpec repos", async () => {
    mockGetNavigationDocTypes.mockResolvedValue({
      docTypes: ["guidance", "regulation"],
    });
    mockListEncodedFiles.mockResolvedValue([
      {
        filePath: "policies/usda/snap/fy-2026-cola/deductions.yaml",
        citationPath: "us/policy/usda/snap/fy-2026-cola/deductions",
        bucket: "policies",
      },
      {
        filePath: "statutes/26/3101/a.yaml",
        citationPath: "us/statute/26/3101/a",
        bucket: "statutes",
      },
    ]);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: [],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(result.nodes.map((node) => node.segment)).toEqual([
      "guidance",
      "policy",
      "regulation",
      "statute",
    ]);
  });

  it("builds tree branches from RuleSpec-only files when corpus navigation has no node", async () => {
    mockGetNavigationIndexNode.mockResolvedValue(null);
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockListEncodedFiles.mockResolvedValue([
      {
        filePath: "policies/usda/snap/fy-2026-cola/deductions.yaml",
        citationPath: "us/policy/usda/snap/fy-2026-cola/deductions",
        bucket: "policies",
      },
      {
        filePath: "policies/irs/rev-proc-2025-32/standard-deduction.yaml",
        citationPath: "us/policy/irs/rev-proc-2025-32/standard-deduction",
        bucket: "policies",
      },
    ]);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["policy"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(result.nodes).toEqual([
      expect.objectContaining({
        segment: "irs",
        label: "IRS",
        hasChildren: true,
        hasRuleSpec: true,
      }),
      expect.objectContaining({
        segment: "usda",
        label: "USDA",
        hasChildren: true,
        hasRuleSpec: true,
      }),
    ]);
  });

  it("merges RuleSpec-only encoded title branches with encoded navigation rows", async () => {
    mockGetNavigationIndexNode.mockResolvedValue(
      navRow({
        jurisdiction: "us",
        doc_type: "statute",
        path: "us/statute",
        segment: "statute",
        has_children: true,
      })
    );
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [
        navRow({
          jurisdiction: "us",
          doc_type: "statute",
          path: "us/statute/26",
          segment: "26",
          label: "INTERNAL REVENUE CODE",
          has_children: true,
          encoded_descendant_count: 10,
        }),
      ],
      hasMore: false,
      total: 1,
    });
    mockListEncodedFiles.mockResolvedValue([
      {
        filePath: "statutes/7/2017/a.yaml",
        citationPath: "us/statute/7/2017/a",
        bucket: "statutes",
      },
      {
        filePath: "statutes/26/3101/a.yaml",
        citationPath: "us/statute/26/3101/a",
        bucket: "statutes",
      },
    ]);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["statute"],
      hasCitationPaths: true,
      encodedOnly: true,
      page: 0,
    });

    expect(result.nodes).toEqual([
      expect.objectContaining({
        segment: "7",
        hasRuleSpec: true,
      }),
      expect.objectContaining({
        segment: "26",
        label: "INTERNAL REVENUE CODE",
      }),
    ]);
  });

  it("surfaces RuleSpec-only descendants under an existing encoded-only corpus node", async () => {
    mockGetNavigationIndexNode
      .mockResolvedValueOnce(
        navRow({
          jurisdiction: "us",
          doc_type: "statute",
          path: "us/statute",
          segment: "statute",
          has_children: true,
        })
      )
      .mockResolvedValueOnce(
        navRow({
          jurisdiction: "us",
          doc_type: "statute",
          path: "us/statute/7",
          segment: "7",
          label: "AGRICULTURE",
          has_children: true,
        })
      );
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    const currentRule = {
      id: "title-7",
      citation_path: "us/statute/7",
    };
    mockGetProvisionForNavigationNode.mockResolvedValue(currentRule);
    mockListEncodedFiles.mockResolvedValue([
      {
        filePath: "statutes/7/2017/a.yaml",
        citationPath: "us/statute/7/2017/a",
        bucket: "statutes",
      },
    ]);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["statute", "7"],
      hasCitationPaths: true,
      encodedOnly: true,
      page: 0,
    });

    expect(result.currentRule).toEqual(currentRule);
    expect(result.nodes).toEqual([
      expect.objectContaining({
        segment: "2017",
        hasRuleSpec: true,
        childCount: 1,
      }),
    ]);
  });

  it("marks exact RuleSpec-only child files as clickable encoded leaves", async () => {
    mockGetNavigationIndexNode.mockResolvedValue(null);
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockListEncodedFiles.mockResolvedValue([
      {
        filePath: "policies/irs/rev-proc-2025-32.yaml",
        citationPath: "us/policy/irs/rev-proc-2025-32",
        bucket: "policies",
      },
    ]);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["policy", "irs"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(result.nodes).toEqual([
      expect.objectContaining({
        segment: "rev-proc-2025-32",
        hasChildren: false,
        hasRuleSpec: true,
        rule: expect.objectContaining({
          id: "github:us/policy/irs/rev-proc-2025-32",
          citation_path: "us/policy/irs/rev-proc-2025-32",
          rulespec_path: "policies/irs/rev-proc-2025-32.yaml",
        }),
      }),
    ]);
  });

  it("returns a synthesised leaf rule for an exact RuleSpec-only path", async () => {
    const leafRule = {
      id: "github:us/policy/usda/snap/fy-2026-cola/deductions",
      citation_path: "us/policy/usda/snap/fy-2026-cola/deductions",
    };
    mockGetNavigationIndexNode.mockResolvedValue(null);
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockListEncodedFiles.mockResolvedValue([
      {
        filePath: "policies/usda/snap/fy-2026-cola/deductions.yaml",
        citationPath: "us/policy/usda/snap/fy-2026-cola/deductions",
        bucket: "policies",
      },
    ]);
    mockSynthesiseRuleFromCitationPath.mockResolvedValue(leafRule);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["policy", "usda", "snap", "fy-2026-cola", "deductions"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(mockSynthesiseRuleFromCitationPath).toHaveBeenCalledWith(
      "us",
      "us/policy/usda/snap/fy-2026-cola/deductions"
    );
    expect(result.leafRule).toEqual(leafRule);
    expect(result.nodes).toEqual([]);
  });

  it("builds sparse intermediate folders when indexed citation paths skip parent nodes", async () => {
    mockGetNavigationIndexNode.mockResolvedValue(null);
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockGetNavigationIndexPrefixRows.mockResolvedValue([
      navRow({
        jurisdiction: "us",
        doc_type: "guidance",
        path: "us/guidance/usda/fns/snap-fy2026-cola",
        segment: "snap-fy2026-cola",
        label: "SNAP FY 2026 Maximum Allotments and Deductions",
      }),
      navRow({
        jurisdiction: "us",
        doc_type: "guidance",
        path: "us/guidance/usda/fns/snap-fy2026-income-eligibility-standards",
        segment: "snap-fy2026-income-eligibility-standards",
        label: "SNAP FY 2026 Income Eligibility Standards",
      }),
    ]);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["guidance", "usda"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(mockGetNavigationIndexPrefixRows).toHaveBeenCalledWith({
      jurisdiction: "us",
      docType: "guidance",
      pathPrefix: "us/guidance/usda",
      encodedOnly: false,
    });
    expect(result.nodes).toEqual([
      expect.objectContaining({
        segment: "fns",
        label: "FNS",
        hasChildren: true,
        childCount: 2,
      }),
    ]);
  });

  it("uses the real sparse row when the next prefix child has an exact index node", async () => {
    mockGetNavigationIndexNode.mockResolvedValue(null);
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockGetNavigationIndexPrefixRows.mockResolvedValue([
      navRow({
        jurisdiction: "us",
        doc_type: "guidance",
        path: "us/guidance/usda/fns/snap-fy2026-cola",
        segment: "snap-fy2026-cola",
        label: "SNAP FY 2026 Maximum Allotments and Deductions",
        has_children: true,
      }),
    ]);

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["guidance", "usda", "fns"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(result.nodes).toEqual([
      expect.objectContaining({
        segment: "snap-fy2026-cola",
        label: "SNAP FY 2026 Maximum Allotments and Deductions",
        hasChildren: true,
      }),
    ]);
  });

  it("does not use RuleSpec-only fallback for later top-level pagination pages", async () => {
    mockGetNavigationIndexNode.mockResolvedValue(null);
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });

    const result = await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["policy"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 1,
    });

    expect(result.nodes).toEqual([]);
    expect(mockListEncodedFiles).not.toHaveBeenCalled();
  });

  it("loads top-level doc_type children from an explicit scope root when present", async () => {
    const scopeRoot = navRow({
      path: "us-co/regulation",
      segment: "regulation",
      parent_path: null,
      has_children: true,
    });
    const row = navRow();
    mockGetNavigationIndexNode.mockResolvedValue(scopeRoot);
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
      parentPath: "us-co/regulation",
      encodedOnly: true,
      page: 1,
    });
    expect(result.nodes[0]).toEqual(
      expect.objectContaining({ segment: "10-ccr-2506-1" })
    );
    expect(result.hasMore).toBe(true);
  });

  it("loads top-level doc_type children from parent_path null when no scope root exists", async () => {
    const row = navRow({
      jurisdiction: "us",
      doc_type: "statute",
      path: "us/statute/26",
      segment: "26",
    });
    mockGetNavigationIndexNode.mockResolvedValue(null);
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [row],
      hasMore: false,
      total: 1,
    });

    await loadTreeNodes({
      dbJurisdictionId: "us",
      ruleSegments: ["statute"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(mockGetNavigationIndexNode).toHaveBeenCalledWith("us/statute");
    expect(mockGetNavigationIndexChildren).toHaveBeenCalledWith({
      jurisdiction: "us",
      docType: "statute",
      parentPath: null,
      encodedOnly: false,
      page: 0,
    });
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

  it("keeps deep navigation available when the optional current provision lookup fails", async () => {
    const child = navRow({
      path: "us-co/regulation/10-ccr-2506-1/4.401",
      parent_path: "us-co/regulation/10-ccr-2506-1",
      segment: "4.401",
      label: "4.401",
    });
    const current = navRow();
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [child],
      hasMore: false,
      total: 1,
    });
    mockGetNavigationIndexNode.mockResolvedValue(current);
    mockGetProvisionForNavigationNode.mockRejectedValue(
      new Error("permission denied")
    );

    const result = await loadTreeNodes({
      dbJurisdictionId: "us-co",
      ruleSegments: ["regulation", "10-ccr-2506-1"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(result.currentRule).toBeNull();
    expect(result.nodes.map((node) => node.segment)).toEqual(["4.401"]);
  });

  it("keeps empty indexed containers available when the optional current provision lookup fails", async () => {
    const current = navRow({
      has_children: true,
      child_count: 1,
    });
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockGetNavigationIndexNode.mockResolvedValue(current);
    mockGetProvisionForNavigationNode.mockRejectedValue(
      new Error("permission denied")
    );

    const result = await loadTreeNodes({
      dbJurisdictionId: "us-co",
      ruleSegments: ["regulation", "10-ccr-2506-1"],
      hasCitationPaths: true,
      encodedOnly: false,
      page: 0,
    });

    expect(result.currentRule).toBeNull();
    expect(result.nodes).toEqual([]);
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

  it("throws a clear missing-index error when an indexed node has no provision", async () => {
    const leaf = navRow({
      path: "us-co/regulation/10-ccr-2506-1/4.401",
      parent_path: "us-co/regulation/10-ccr-2506-1",
      segment: "4.401",
      has_children: false,
      child_count: 0,
    });
    mockGetNavigationIndexChildren.mockResolvedValue({
      rows: [],
      hasMore: false,
      total: 0,
    });
    mockGetNavigationIndexNode.mockResolvedValue(leaf);
    mockGetProvisionForNavigationNode.mockResolvedValue(null);

    await expect(
      loadTreeNodes({
        dbJurisdictionId: "us-co",
        ruleSegments: ["regulation", "10-ccr-2506-1", "4.401"],
        hasCitationPaths: true,
        encodedOnly: false,
        page: 0,
      })
    ).rejects.toThrow(
      "Navigation node us-co/regulation/10-ccr-2506-1/4.401 does not resolve"
    );
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
