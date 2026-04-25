import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTreeNodes } from "./use-tree-nodes";

// ---- Mock @/lib/tree-data ----

const mockGetDocTypeNodes = vi.fn();
const mockGetTitleNodes = vi.fn();
const mockGetSectionNodes = vi.fn();
const mockGetActNodes = vi.fn();
const mockGetChildrenByParentId = vi.fn();
const mockGetRuleById = vi.fn();
const mockGetEncodedPaths = vi.fn();
const mockIsUUID = vi.fn();

vi.mock("@/lib/tree-data", () => ({
  getDocTypeNodes: (...args: unknown[]) => mockGetDocTypeNodes(...args),
  getTitleNodes: (...args: unknown[]) => mockGetTitleNodes(...args),
  getSectionNodes: (...args: unknown[]) => mockGetSectionNodes(...args),
  getActNodes: (...args: unknown[]) => mockGetActNodes(...args),
  getChildrenByParentId: (...args: unknown[]) =>
    mockGetChildrenByParentId(...args),
  getRuleById: (...args: unknown[]) => mockGetRuleById(...args),
  getEncodedPaths: (...args: unknown[]) => mockGetEncodedPaths(...args),
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
  mockIsUUID.mockReturnValue(false);
  mockGetEncodedPaths.mockResolvedValue(new Set<string>());
});

describe("useTreeNodes", () => {
  describe("root of citation-path jurisdiction (empty ruleSegments)", () => {
    it("calls getDocTypeNodes", async () => {
      const docNodes = [
        makeNode({
          segment: "statute",
          label: "Statutes",
          nodeType: "doc_type",
        }),
      ];
      mockGetDocTypeNodes.mockResolvedValue(docNodes);

      const { result } = renderHook(() =>
        useTreeNodes("us", [], true)
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetDocTypeNodes).toHaveBeenCalledWith("us");
      expect(result.current.nodes).toEqual(docNodes);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.leafRule).toBeNull();
    });
  });

  describe("root of flat jurisdiction (empty ruleSegments)", () => {
    it("calls getActNodes", async () => {
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

      const { result } = renderHook(() =>
        useTreeNodes("canada", [], false)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetActNodes).toHaveBeenCalledWith("canada", 0, false);
      expect(result.current.nodes).toEqual(actNodes);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("root of UK citation-path jurisdiction", () => {
    it("calls getDocTypeNodes", async () => {
      const docNodes = [
        makeNode({
          segment: "legislation",
          label: "Legislation",
          nodeType: "doc_type",
        }),
      ];
      mockGetDocTypeNodes.mockResolvedValue(docNodes);

      const { result } = renderHook(() =>
        useTreeNodes("uk", [], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetDocTypeNodes).toHaveBeenCalledWith("uk");
      expect(result.current.nodes).toEqual(docNodes);
    });
  });

  describe("citation-path title level (ruleSegments length 1)", () => {
    it("calls getTitleNodes for statute", async () => {
      const titleNodes = [
        makeNode({ segment: "26", label: "Title 26", nodeType: "title" }),
      ];
      mockGetTitleNodes.mockResolvedValue(titleNodes);

      const { result } = renderHook(() =>
        useTreeNodes("us", ["statute"], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetTitleNodes).toHaveBeenCalledWith(
        "us",
        "statute",
        expect.any(Set),
        false
      );
      expect(result.current.nodes).toEqual(titleNodes);
    });

    it("calls getTitleNodes for UK legislation", async () => {
      const nodes = [
        makeNode({
          segment: "uksi",
          label: "UK Statutory Instruments",
          nodeType: "title",
        }),
      ];
      mockGetTitleNodes.mockResolvedValue(nodes);

      const { result } = renderHook(() =>
        useTreeNodes("uk", ["legislation"], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetTitleNodes).toHaveBeenCalledWith(
        "uk",
        "legislation",
        expect.any(Set),
        false
      );
      expect(result.current.nodes).toEqual(nodes);
    });
  });

  describe("citation-path section level (ruleSegments length 2+)", () => {
    it("calls getSectionNodes with full path prefix", async () => {
      const sectionNodes = [
        makeNode({ segment: "1", label: "Section 1", nodeType: "section" }),
      ];
      mockGetSectionNodes.mockResolvedValue({
        nodes: sectionNodes,
        hasMore: false,
        total: 1,
      });

      const { result } = renderHook(() =>
        useTreeNodes("us", ["statute", "26"], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetSectionNodes).toHaveBeenCalledWith(
        "us/statute/26",
        0,
        expect.any(Set),
        false
      );
      expect(result.current.nodes).toEqual(sectionNodes);
    });
  });

  describe("flat jurisdiction UUID children", () => {
    it("calls getChildrenByParentId for UUID segment", async () => {
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
        useTreeNodes("canada", [SAMPLE_UUID], false)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetChildrenByParentId).toHaveBeenCalledWith(
        SAMPLE_UUID,
        0,
        false
      );
      expect(result.current.nodes).toEqual(childNodes);
    });
  });

  describe("leaf node (children empty)", () => {
    it("sets leafRule when children are empty", async () => {
      mockIsUUID.mockReturnValue(true);

      mockGetChildrenByParentId.mockResolvedValue({
        nodes: [],
        hasMore: false,
        total: 0,
      });

      const fakeRule = { id: SAMPLE_UUID, heading: "A leaf rule" };
      mockGetRuleById.mockResolvedValue(fakeRule);

      const { result } = renderHook(() =>
        useTreeNodes("canada", [SAMPLE_UUID], false)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetRuleById).toHaveBeenCalledWith(SAMPLE_UUID);
      expect(result.current.leafRule).toEqual(fakeRule);
      expect(result.current.nodes).toEqual([]);
    });
  });

  describe("citation-path leaf node (no children)", () => {
    it("sets leafRule when getSectionNodes returns leafRule", async () => {
      const fakeRule = { id: "rule-leaf", heading: "Deputy Comptrollers" };
      mockGetSectionNodes.mockResolvedValue({
        nodes: [],
        hasMore: false,
        total: 0,
        leafRule: fakeRule,
      });

      const { result } = renderHook(() =>
        useTreeNodes("us", ["statute", "12", "4"], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetSectionNodes).toHaveBeenCalledWith(
        "us/statute/12/4",
        0,
        expect.any(Set),
        false
      );
      expect(result.current.leafRule).toEqual(fakeRule);
      expect(result.current.nodes).toEqual([]);
    });
  });

  describe("flat jurisdiction non-UUID deep segment", () => {
    it("returns empty nodes for non-UUID segment", async () => {
      mockIsUUID.mockReturnValue(false);

      const { result } = renderHook(() =>
        useTreeNodes("canada", ["not-a-uuid"], false)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.nodes).toEqual([]);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("encodedOnly filter", () => {
    it("passes encodedOnly flag to getTitleNodes", async () => {
      const titleNodes = [
        makeNode({ segment: "26", label: "Title 26", nodeType: "title" }),
      ];
      mockGetTitleNodes.mockResolvedValue(titleNodes);

      const { result } = renderHook(() =>
        useTreeNodes("us", ["statute"], true, true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetTitleNodes).toHaveBeenCalledWith(
        "us",
        "statute",
        expect.any(Set),
        true
      );
    });

    it("passes encodedOnly flag to getSectionNodes", async () => {
      const sectionNodes = [
        makeNode({ segment: "1", label: "Section 1", nodeType: "section" }),
      ];
      mockGetSectionNodes.mockResolvedValue({
        nodes: sectionNodes,
        hasMore: false,
        total: 1,
      });

      const { result } = renderHook(() =>
        useTreeNodes("us", ["statute", "26"], true, true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetSectionNodes).toHaveBeenCalledWith(
        "us/statute/26",
        0,
        expect.any(Set),
        true
      );
    });

    it("uses separate cache key when encodedOnly is true", async () => {
      const allNodes = [
        makeNode({
          segment: "statute",
          label: "Statutes",
          nodeType: "doc_type",
        }),
      ];
      mockGetDocTypeNodes.mockResolvedValue(allNodes);

      const { result, rerender } = renderHook(
        ({
          dbId,
          segs,
          hasCitation,
          encoded,
        }: {
          dbId: string;
          segs: string[];
          hasCitation: boolean;
          encoded: boolean;
        }) => useTreeNodes(dbId, segs, hasCitation, encoded),
        {
          initialProps: {
            dbId: "us",
            segs: [],
            hasCitation: true,
            encoded: false,
          },
        }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetDocTypeNodes).toHaveBeenCalledOnce();

      // Toggle encoded — should fetch again (different cache key)
      rerender({
        dbId: "us",
        segs: [],
        hasCitation: true,
        encoded: true,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetDocTypeNodes).toHaveBeenCalledTimes(2);
    });
  });

  describe("cache behavior", () => {
    it("uses cache on second render with same args", async () => {
      const docNodes = [
        makeNode({ segment: "statute", label: "Statutes" }),
      ];
      mockGetDocTypeNodes.mockResolvedValue(docNodes);

      const { result, rerender } = renderHook(
        ({
          dbId,
          segs,
          hasCitation,
        }: {
          dbId: string;
          segs: string[];
          hasCitation: boolean;
        }) => useTreeNodes(dbId, segs, hasCitation),
        {
          initialProps: {
            dbId: "us",
            segs: [] as string[],
            hasCitation: true,
          },
        }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetDocTypeNodes).toHaveBeenCalledOnce();

      // Navigate away
      const titleNodes = [
        makeNode({ segment: "26", label: "Title 26" }),
      ];
      mockGetTitleNodes.mockResolvedValue(titleNodes);
      rerender({ dbId: "us", segs: ["statute"], hasCitation: true });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Navigate back — should hit cache
      rerender({ dbId: "us", segs: [], hasCitation: true });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetDocTypeNodes).toHaveBeenCalledOnce();
      expect(result.current.nodes).toEqual(docNodes);
    });
  });

  describe("error handling", () => {
    it("sets error when fetch throws an Error", async () => {
      mockGetDocTypeNodes.mockRejectedValue(
        new Error("Network failure")
      );

      const { result } = renderHook(() =>
        useTreeNodes("us", [], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe("Network failure");
    });

    it("sets generic error when fetch throws a non-Error", async () => {
      mockGetDocTypeNodes.mockRejectedValue("some string error");

      const { result } = renderHook(() =>
        useTreeNodes("us", [], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe("Failed to fetch");
    });
  });

  describe("loadMore", () => {
    it("increments page and appends nodes", async () => {
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

      const { result } = renderHook(() =>
        useTreeNodes("uk", [], false)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetActNodes).toHaveBeenCalledWith("uk", 1, false);
      expect(result.current.nodes).toEqual([...page0Nodes, ...page1Nodes]);
      expect(result.current.hasMore).toBe(false);
    });

    it("does nothing when hasMore is false", async () => {
      const docNodes = [makeNode({ segment: "statute", label: "Statutes" })];
      mockGetDocTypeNodes.mockResolvedValue(docNodes);

      const { result } = renderHook(() =>
        useTreeNodes("us", [], true)
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.loadMore();
      });

      expect(mockGetDocTypeNodes).toHaveBeenCalledOnce();
    });
  });
});
