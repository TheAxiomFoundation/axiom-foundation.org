import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/atlas",
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock useTreeNodes hook
const { mockLoadMore } = vi.hoisted(() => ({
  mockLoadMore: vi.fn(),
}));
vi.mock("@/hooks/use-tree-nodes", () => ({
  useTreeNodes: vi.fn().mockReturnValue({
    nodes: [],
    loading: false,
    error: null,
    hasMore: false,
    loadMore: mockLoadMore,
    leafRule: null,
  }),
}));

// Mock tree-data — provide resolveAtlasPath and buildBreadcrumbs
vi.mock("@/lib/tree-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tree-data")>();
  return {
    ...actual,
    getJurisdictionCounts: vi.fn().mockResolvedValue(new Map()),
    resolveDisplayContext: vi.fn(),
  };
});

// Mock supabaseArch
vi.mock("@/lib/supabase", () => ({
  supabaseArch: { from: vi.fn() },
  supabase: { from: vi.fn() },
}));

import { useTreeNodes } from "@/hooks/use-tree-nodes";
import { resolveDisplayContext } from "@/lib/tree-data";
import { AtlasBrowser } from "./document-browser";

describe("AtlasBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
      leafRule: null,
    });
  });

  describe("jurisdiction-picker phase (empty segments)", () => {
    it("renders Atlas heading and description", () => {
      render(<AtlasBrowser segments={[]} />);
      expect(
        screen.getByRole("heading", { name: "Atlas" })
      ).toBeInTheDocument();
      expect(screen.getByText(/Explore encoded law/)).toBeInTheDocument();
    });

    it("renders jurisdiction picker heading", () => {
      render(<AtlasBrowser segments={[]} />);
      expect(screen.getByText("Choose a jurisdiction")).toBeInTheDocument();
    });
  });

  describe("rule phase (US)", () => {
    it("shows loading state from useTreeNodes", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: true,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["us"]} />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows error state", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: false,
        error: "Failed to connect",
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["us"]} />);
      expect(screen.getByText("Failed to connect")).toBeInTheDocument();
    });

    it("shows empty state", () => {
      render(<AtlasBrowser segments={["us"]} />);
      expect(screen.getByText("No items found.")).toBeInTheDocument();
    });

    it("renders tree nodes when data is present", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "statute",
            label: "Statutes",
            hasChildren: true,
            nodeType: "doc_type",
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["us"]} />);
      expect(screen.getByText("Statutes")).toBeInTheDocument();
    });

    it("shows load more button when hasMore is true", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "statute",
            label: "Statutes",
            hasChildren: true,
            nodeType: "doc_type",
          },
        ],
        loading: false,
        error: null,
        hasMore: true,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["us"]} />);
      const loadMoreBtn = screen.getByRole("button", {
        name: /load more/i,
      });
      expect(loadMoreBtn).toBeInTheDocument();
      fireEvent.click(loadMoreBtn);
      expect(mockLoadMore).toHaveBeenCalled();
    });

    it('shows "Loading..." on load more button when loading', () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "statute",
            label: "Statutes",
            hasChildren: true,
            nodeType: "doc_type",
          },
        ],
        loading: true,
        error: null,
        hasMore: true,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["us"]} />);
      expect(
        screen.getByRole("button", { name: /loading\.\.\./i })
      ).toBeInTheDocument();
    });

    it("navigates on node click", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "statute",
            label: "Statutes",
            hasChildren: true,
            nodeType: "doc_type",
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["us"]} />);
      fireEvent.click(screen.getByText("Statutes"));
      expect(mockPush).toHaveBeenCalledWith("/atlas/us/statute");
    });

    it("navigates with nested segments", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "26",
            label: "Title 26",
            hasChildren: true,
            nodeType: "title",
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["us", "statute"]} />);
      fireEvent.click(screen.getByText("Title 26"));
      expect(mockPush).toHaveBeenCalledWith("/atlas/us/statute/26");
    });

    it("renders breadcrumbs", () => {
      render(<AtlasBrowser segments={["us", "statute"]} />);
      expect(
        screen.getByRole("navigation", { name: "Breadcrumb" })
      ).toBeInTheDocument();
    });
  });

  describe("UK jurisdiction goes directly to rule phase", () => {
    it("renders tree browser directly for UK", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "legislation",
            label: "Legislation",
            hasChildren: true,
            nodeType: "doc_type",
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
      });

      render(<AtlasBrowser segments={["uk"]} />);
      expect(screen.getByText("Legislation")).toBeInTheDocument();
      // Should NOT show jurisdiction picker
      expect(
        screen.queryByText("Choose a jurisdiction")
      ).not.toBeInTheDocument();
    });

    it("preserves legacy UK UUID routes", () => {
      render(<AtlasBrowser segments={["uk", "550e8400-e29b-41d4-a716-446655440000"]} />);

      expect(useTreeNodes).toHaveBeenCalledWith(
        "uk",
        ["550e8400-e29b-41d4-a716-446655440000"],
        false,
        false
      );
    });
  });

  describe("leaf rule with display context", () => {
    const leafRule = {
      id: "leaf-1",
      jurisdiction: "us",
      doc_type: "statute",
      parent_id: "parent-1",
      level: 4,
      ordinal: 1,
      heading: null,
      body: "the credit determined under subsection (a)",
      effective_date: null,
      repeal_date: null,
      source_url: null,
      source_path: "26 USC 24(d)(1)(A)",
      citation_path: "us/statute/26/24/d/1/A",
      rac_path: null,
      has_rac: false,
      created_at: "",
      updated_at: "",
    };

    it("calls resolveDisplayContext when useTreeNodes returns a leafRule", () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule,
      });

      vi.mocked(resolveDisplayContext).mockResolvedValue({
        rule: leafRule,
        parentBody: "shall be increased by the lesser of—",
        siblings: [
          { ...leafRule, id: "leaf-1", body: "the credit determined under subsection (a)" },
          { ...leafRule, id: "leaf-2", body: "the earned income of the taxpayer" },
        ],
        targetIndex: 0,
      });

      render(
        <AtlasBrowser
          segments={["us", "federal", "statute", "26", "24", "d", "1", "A"]}
        />
      );

      expect(resolveDisplayContext).toHaveBeenCalledWith(leafRule);
    });

    it("renders parent body text as context after resolveDisplayContext resolves", async () => {
      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule,
      });

      vi.mocked(resolveDisplayContext).mockResolvedValue({
        rule: leafRule,
        parentBody: "shall be increased by the lesser of—",
        siblings: [
          { ...leafRule, id: "leaf-1", body: "the credit determined under subsection (a)" },
          { ...leafRule, id: "leaf-2", body: "the earned income of the taxpayer" },
        ],
        targetIndex: 0,
      });

      render(
        <AtlasBrowser
          segments={["us", "federal", "statute", "26", "24", "d", "1", "A"]}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("shall be increased by the lesser of—")
        ).toBeInTheDocument();
      });
    });

    it("renders normally without context block when resolveDisplayContext returns no parent", async () => {
      const rootLeaf = {
        ...leafRule,
        parent_id: null,
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: rootLeaf,
      });

      vi.mocked(resolveDisplayContext).mockResolvedValue({
        rule: rootLeaf,
        parentBody: null,
        siblings: [rootLeaf],
        targetIndex: 0,
      });

      render(
        <AtlasBrowser
          segments={["us", "federal", "statute", "26", "24", "d", "1", "A"]}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("the credit determined under subsection (a)")
        ).toBeInTheDocument();
      });

      // No context intro block
      expect(
        screen.queryByTestId("context-intro")
      ).not.toBeInTheDocument();
    });

    it("renders top-level citation-path leaves without parent section context", async () => {
      const topLevelLeaf = {
        ...leafRule,
        level: 1,
        heading: "Allowance of credit",
        body: "There shall be allowed as a credit against the tax imposed by this chapter.",
        citation_path: "us/statute/26/24/a",
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: topLevelLeaf,
      });

      render(<AtlasBrowser segments={["us", "statute", "26", "24", "a"]} />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "There shall be allowed as a credit against the tax imposed by this chapter."
          )
        ).toBeInTheDocument();
      });

      expect(resolveDisplayContext).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId("context-intro")
      ).not.toBeInTheDocument();
    });
  });
});
