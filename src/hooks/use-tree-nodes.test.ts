import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTreeNodes } from "./use-tree-nodes";

// ---- Mock @/lib/tree-data ----

const mockGetJurisdictionNodes = vi.fn();
const mockGetDocTypeNodes = vi.fn();
const mockGetTitleNodes = vi.fn();
const mockGetSectionNodes = vi.fn();
const mockGetActNodes = vi.fn();
const mockGetChildrenByParentId = vi.fn();
const mockGetRuleById = vi.fn();
const mockGetEncodedPaths = vi.fn();
const mockBuildBreadcrumbs = vi.fn();
const mockGetJurisdiction = vi.fn();
const mockIsUUID = vi.fn();

vi.mock("@/lib/tree-data", () => ({
  getJurisdictionNodes: (...args: unknown[]) =>
    mockGetJurisdictionNodes(...args),
  getDocTypeNodes: (...args: unknown[]) => mockGetDocTypeNodes(...args),
  getTitleNodes: (...args: unknown[]) => mockGetTitleNodes(...args),
  getSectionNodes: (...args: unknown[]) => mockGetSectionNodes(...args),
  getActNodes: (...args: unknown[]) => mockGetActNodes(...args),
  getChildrenByParentId: (...args: unknown[]) =>
    mockGetChildrenByParentId(...args),
  getRuleById: (...args: unknown[]) => mockGetRuleById(...args),
  getEncodedPaths: (...args: unknown[]) => mockGetEncodedPaths(...args),
  buildBreadcrumbs: (...args: unknown[]) => mockBuildBreadcrumbs(...args),
  getJurisdiction: (...args: unknown[]) => mockGetJurisdiction(...args),
  isUUID: (...args: unknown[]) => mockIsUUID(...args),
}));

vi.mock("@/lib/supabase", () => ({}));

// ---- Helpers ----

const SAMPLE_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeNode(overrides: Record<string, unknown> = {}) {
  return {
    segment: "us",
    label: "United States",
    hasChildren: true,
    childCount: 100,
    nodeType: "jurisdiction",
    ...overrides,
  };
}

// ---- Tests ----

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildBreadcrumbs.mockReturnValue([{ label: "Atlas", href: "/atlas" }]);
  mockGetJurisdiction.mockReturnValue(undefined);
  mockIsUUID.mockReturnValue(false);
  mockGetEncodedPaths.mockResolvedValue(new Set<string>());
});

describe("useTreeNodes", () => {
  describe("root level (empty segments)", () => {
    it("calls getJurisdictionNodes and returns nodes", async () => {
      const nodes = [
        makeNode(),
        makeNode({ segment: "uk", label: "United Kingdom" }),
      ];
      mockGetJurisdictionNodes.mockResolvedValue(nodes);

      const { result } = renderHook(() => useTreeNodes([]));

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetJurisdictionNodes).toHaveBeenCalledOnce();
      expect(result.current.nodes).toEqual(nodes);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.leafRule).toBeNull();
    });
  });

  describe("citation-path jurisdiction (depth 1)", () => {
    it('calls getDocTypeNodes for "us"', async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "us",
        label: "United States",
        hasCitationPaths: true,
      });
      const docNodes = [
        makeNode({
          segment: "statute",
          label: "Statutes",
          nodeType: "doc_type",
        }),
      ];
      mockGetDocTypeNodes.mockResolvedValue(docNodes);

      const { result } = renderHook(() => useTreeNodes(["us"]));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetDocTypeNodes).toHaveBeenCalledWith("us");
      expect(result.current.nodes).toEqual(docNodes);
    });
  });

  describe("flat jurisdiction (depth 1)", () => {
    it('calls getActNodes for "uk"', async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "uk",
        label: "United Kingdom",
        hasCitationPaths: false,
      });
      const actNodes = [
        makeNode({
          segment: SAMPLE_UUID,
          label: "Some Act",
          nodeType: "act",
        }),
      ];
      mockGetActNodes.mockResolvedValue({
        nodes: actNodes,
        hasMore: true,
        total: 50,
      });

      const { result } = renderHook(() => useTreeNodes(["uk"]));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetActNodes).toHaveBeenCalledWith("uk", 0);
      expect(result.current.nodes).toEqual(actNodes);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("citation-path title level (depth 2)", () => {
    it("calls getTitleNodes for us/statute", async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "us",
        label: "United States",
        hasCitationPaths: true,
      });
      const titleNodes = [
        makeNode({ segment: "26", label: "Title 26", nodeType: "title" }),
      ];
      mockGetTitleNodes.mockResolvedValue(titleNodes);

      const { result } = renderHook(() => useTreeNodes(["us", "statute"]));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetTitleNodes).toHaveBeenCalledWith("us", "statute");
      expect(result.current.nodes).toEqual(titleNodes);
    });
  });

  describe("citation-path section level (depth 3+)", () => {
    it("calls getSectionNodes for us/statute/26", async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "us",
        label: "United States",
        hasCitationPaths: true,
      });
      const sectionNodes = [
        makeNode({ segment: "1", label: "Section 1", nodeType: "section" }),
      ];
      mockGetSectionNodes.mockResolvedValue({
        nodes: sectionNodes,
        hasMore: false,
        total: 1,
      });

      const { result } = renderHook(() =>
        useTreeNodes(["us", "statute", "26"])
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetSectionNodes).toHaveBeenCalledWith(
        "us/statute/26",
        0,
        expect.any(Set)
      );
      expect(result.current.nodes).toEqual(sectionNodes);
    });
  });

  describe("flat jurisdiction UUID children (depth 2+)", () => {
    it("calls getChildrenByParentId for uk/{uuid}", async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "uk",
        label: "United Kingdom",
        hasCitationPaths: false,
      });
      mockIsUUID.mockReturnValue(true);

      const childNodes = [
        makeNode({
          segment: "child-id",
          label: "Part 1",
          nodeType: "section",
        }),
      ];
      mockGetChildrenByParentId.mockResolvedValue({
        nodes: childNodes,
        hasMore: false,
        total: 1,
      });

      const { result } = renderHook(() =>
        useTreeNodes(["uk", SAMPLE_UUID])
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetChildrenByParentId).toHaveBeenCalledWith(SAMPLE_UUID, 0);
      expect(result.current.nodes).toEqual(childNodes);
    });
  });

  describe("leaf node (children empty)", () => {
    it("sets leafRule when children are empty", async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "uk",
        label: "United Kingdom",
        hasCitationPaths: false,
      });
      mockIsUUID.mockReturnValue(true);

      mockGetChildrenByParentId.mockResolvedValue({
        nodes: [],
        hasMore: false,
        total: 0,
      });

      const fakeRule = { id: SAMPLE_UUID, heading: "A leaf rule" };
      mockGetRuleById.mockResolvedValue(fakeRule);

      const { result } = renderHook(() =>
        useTreeNodes(["uk", SAMPLE_UUID])
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetRuleById).toHaveBeenCalledWith(SAMPLE_UUID);
      expect(result.current.leafRule).toEqual(fakeRule);
      expect(result.current.nodes).toEqual([]);
    });
  });

  describe("citation-path leaf node (no children)", () => {
    it("sets leafRule when getSectionNodes returns leafRule", async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "us",
        label: "United States",
        hasCitationPaths: true,
      });

      const fakeRule = { id: "rule-leaf", heading: "Deputy Comptrollers" };
      mockGetSectionNodes.mockResolvedValue({
        nodes: [],
        hasMore: false,
        total: 0,
        leafRule: fakeRule,
      });

      const { result } = renderHook(() =>
        useTreeNodes(["us", "statute", "12", "4"])
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetSectionNodes).toHaveBeenCalledWith(
        "us/statute/12/4",
        0,
        expect.any(Set)
      );
      expect(result.current.leafRule).toEqual(fakeRule);
      expect(result.current.nodes).toEqual([]);
    });
  });

  describe("flat jurisdiction non-UUID deep segment", () => {
    it("returns empty nodes for non-UUID segment", async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "uk",
        label: "United Kingdom",
        hasCitationPaths: false,
      });
      mockIsUUID.mockReturnValue(false);

      const { result } = renderHook(() =>
        useTreeNodes(["uk", "not-a-uuid"])
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.nodes).toEqual([]);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("cache behavior", () => {
    it("uses cache on second render with same segments", async () => {
      const nodes = [makeNode()];
      mockGetJurisdictionNodes.mockResolvedValue(nodes);

      const { result, rerender } = renderHook(
        ({ segs }: { segs: string[] }) => useTreeNodes(segs),
        { initialProps: { segs: [] } }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetJurisdictionNodes).toHaveBeenCalledOnce();

      // Navigate away
      mockGetJurisdiction.mockReturnValue({
        id: "us",
        label: "United States",
        hasCitationPaths: true,
      });
      mockGetDocTypeNodes.mockResolvedValue([
        makeNode({ segment: "statute", label: "Statutes" }),
      ]);
      rerender({ segs: ["us"] });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Navigate back to root — should hit cache
      rerender({ segs: [] });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetJurisdictionNodes).toHaveBeenCalledOnce();
      expect(result.current.nodes).toEqual(nodes);
    });
  });

  describe("error handling", () => {
    it("sets error when fetch throws an Error", async () => {
      mockGetJurisdictionNodes.mockRejectedValue(
        new Error("Network failure")
      );

      const { result } = renderHook(() => useTreeNodes([]));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe("Network failure");
    });

    it("sets generic error when fetch throws a non-Error", async () => {
      mockGetJurisdictionNodes.mockRejectedValue("some string error");

      const { result } = renderHook(() => useTreeNodes([]));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe("Failed to fetch");
    });
  });

  describe("loadMore", () => {
    it("increments page and appends nodes", async () => {
      mockGetJurisdiction.mockReturnValue({
        id: "uk",
        label: "United Kingdom",
        hasCitationPaths: false,
      });

      const page0Nodes = [
        makeNode({ segment: "act-1", label: "Act 1", nodeType: "act" }),
      ];
      const page1Nodes = [
        makeNode({ segment: "act-2", label: "Act 2", nodeType: "act" }),
      ];

      mockGetActNodes
        .mockResolvedValueOnce({
          nodes: page0Nodes,
          hasMore: true,
          total: 2,
        })
        .mockResolvedValueOnce({
          nodes: page1Nodes,
          hasMore: false,
          total: 2,
        });

      const { result } = renderHook(() => useTreeNodes(["uk"]));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetActNodes).toHaveBeenCalledWith("uk", 1);
      expect(result.current.nodes).toEqual([...page0Nodes, ...page1Nodes]);
      expect(result.current.hasMore).toBe(false);
    });

    it("does nothing when hasMore is false", async () => {
      const nodes = [makeNode()];
      mockGetJurisdictionNodes.mockResolvedValue(nodes);

      const { result } = renderHook(() => useTreeNodes([]));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.loadMore();
      });

      expect(mockGetJurisdictionNodes).toHaveBeenCalledOnce();
    });
  });

  describe("breadcrumbs", () => {
    it("returns breadcrumbs from buildBreadcrumbs", async () => {
      const crumbs = [
        { label: "Atlas", href: "/atlas" },
        { label: "United States", href: "/atlas/us" },
      ];
      mockBuildBreadcrumbs.mockReturnValue(crumbs);
      mockGetJurisdiction.mockReturnValue({
        id: "us",
        label: "United States",
        hasCitationPaths: true,
      });
      mockGetDocTypeNodes.mockResolvedValue([]);

      const { result } = renderHook(() => useTreeNodes(["us"]));

      expect(result.current.breadcrumbs).toEqual(crumbs);
      expect(mockBuildBreadcrumbs).toHaveBeenCalledWith(["us"]);
    });
  });
});
