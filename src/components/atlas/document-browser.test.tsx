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
    currentRule: null,
  }),
}));

vi.mock("@/hooks/use-rules", () => ({
  useRule: vi.fn().mockReturnValue({
    rule: null,
    children: [],
    loading: false,
    error: null,
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
import { useRule } from "@/hooks/use-rules";
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
      currentRule: null,
    });
    vi.mocked(useRule).mockReturnValue({
      rule: null,
      children: [],
      loading: false,
      error: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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
        currentRule: null,
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

  describe("current rule with children", () => {
    it("renders the current rule detail panel above child nodes", async () => {
      const currentRule = {
        id: "rule-1",
        jurisdiction: "us",
        doc_type: "statute",
        parent_id: "parent-1",
        level: 4,
        ordinal: 2,
        heading: null,
        body: "Special rule for spouse who is a student or incapable of caring for himself.",
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: "26 USC 21(d)(2)",
        citation_path: "us/statute/26/21/d/2",
        rac_path: "statute/26/21/d/2.rac",
        has_rac: true,
        created_at: "",
        updated_at: "",
      };

      const childRuleA = {
        ...currentRule,
        id: "rule-1-a",
        parent_id: "rule-1",
        ordinal: 1,
        body: "$250 if subsection (c)(1) applies for the taxable year.",
        citation_path: "us/statute/26/21/d/2/A",
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "A",
            label: "§ A RAC",
            hasChildren: true,
            nodeType: "section",
            rule: childRuleA,
            hasRac: true,
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
        currentRule,
      });

      vi.mocked(useRule).mockReturnValue({
        rule: currentRule,
        children: [childRuleA],
        loading: false,
        error: null,
      });

      render(<AtlasBrowser segments={["us", "statute", "26", "21", "d", "2"]} />);

      await waitFor(() => {
        expect(
          screen.getByText("Special rule for spouse who is a student or incapable of caring for himself.")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("§ A RAC")).toBeInTheDocument();
    });

    it("renders a compact navigation container (no inline body) when current rule has children but no body of its own", async () => {
      const currentRule = {
        id: "subpart-d",
        jurisdiction: "us",
        doc_type: "regulation",
        parent_id: "part-273",
        level: 1,
        ordinal: 68,
        heading: "Subpart D — Eligibility and Benefit Levels",
        body: null,
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: null,
        citation_path: "us/regulation/7/273/subpart-d",
        rac_path: null,
        has_rac: false,
        created_at: "",
        updated_at: "",
      };

      const childSection = {
        ...currentRule,
        id: "sec-273-9",
        parent_id: "subpart-d",
        level: 2,
        ordinal: 90,
        heading: "Income and deductions",
        body: "(a) Income eligibility standards...",
        citation_path: "us/regulation/7/273/9",
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "9",
            label: "Income and deductions",
            hasChildren: true,
            nodeType: "section",
            rule: childSection,
            hasRac: false,
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
        currentRule,
      });

      vi.mocked(useRule).mockReturnValue({
        rule: currentRule,
        children: [childSection],
        loading: false,
        error: null,
      });

      render(
        <AtlasBrowser
          segments={["us", "regulation", "7", "273", "subpart-d"]}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Subpart D — Eligibility and Benefit Levels")
        ).toBeInTheDocument();
      });

      // Compact container header with children count summary
      expect(
        screen.getByText(/1 section below/)
      ).toBeInTheDocument();
      // Citation path is rendered as the eyebrow
      expect(
        screen.getByText("us/regulation/7/273/subpart-d")
      ).toBeInTheDocument();
      // Child section is surfaced in the tree list below, not dumped inline
      expect(screen.getByText("Income and deductions")).toBeInTheDocument();
      // Inline body of the child should NOT be rendered at the container level
      expect(
        screen.queryByText(/Income eligibility standards/)
      ).not.toBeInTheDocument();
    });

    it("shows Loading... in the non-container branch while useRule is still fetching", async () => {
      const currentRule = {
        id: "rule-load",
        jurisdiction: "us",
        doc_type: "statute",
        parent_id: "parent-load",
        level: 2,
        ordinal: 0,
        heading: "Loading demo",
        body: "Some body so this is treated as a non-container rule.",
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: null,
        citation_path: "us/statute/26/21",
        rac_path: null,
        has_rac: false,
        created_at: "",
        updated_at: "",
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
        currentRule,
      });

      // useRule still loading — forces the Loading... fallback in the
      // non-container render branch.
      vi.mocked(useRule).mockReturnValue({
        rule: null,
        children: [],
        loading: true,
        error: null,
      });

      render(<AtlasBrowser segments={["us", "statute", "26", "21"]} />);

      // "Loading..." appears in the detail panel area
      expect(screen.getAllByText("Loading...").length).toBeGreaterThan(0);
    });

    it("treats a whitespace-only body on a rule with children as a navigation container", async () => {
      // Hardening: a future ingestion writing body = "" or "   " should still
      // route through the compact navigation-container branch rather than
      // dumping an empty RuleDetailPanel above the children.
      const currentRule = {
        id: "subpart-ws",
        jurisdiction: "us",
        doc_type: "regulation",
        parent_id: "part-273",
        level: 1,
        ordinal: 1,
        heading: "Subpart with whitespace-only body",
        body: "   ",
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: null,
        citation_path: "us/regulation/7/273/subpart-ws",
        rac_path: null,
        has_rac: false,
        created_at: "",
        updated_at: "",
      };

      const childSection = {
        ...currentRule,
        id: "sec-ws-1",
        parent_id: "subpart-ws",
        level: 2,
        heading: "Child section",
        body: "Actual child content.",
        citation_path: "us/regulation/7/273/ws-1",
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "ws-1",
            label: "Child section",
            hasChildren: true,
            nodeType: "section",
            rule: childSection,
            hasRac: false,
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
        currentRule,
      });

      vi.mocked(useRule).mockReturnValue({
        rule: currentRule,
        children: [childSection],
        loading: false,
        error: null,
      });

      render(
        <AtlasBrowser
          segments={["us", "regulation", "7", "273", "subpart-ws"]}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Subpart with whitespace-only body")
        ).toBeInTheDocument();
      });

      // Compact container header is shown; child's actual content is NOT
      // dumped inline at the container level.
      expect(screen.getByText(/1 section below/)).toBeInTheDocument();
      expect(
        screen.queryByText("Actual child content.")
      ).not.toBeInTheDocument();
    });

    it("renders the RuleDetailPanel (non-container branch) when body is empty string but rule has no children", async () => {
      // body: "" with non-empty children → container; with zero children the
      // predicate falls through and the rule renders inline. This anchors the
      // non-container branch for the hardened predicate.
      const currentRule = {
        id: "rule-empty-body",
        jurisdiction: "us",
        doc_type: "statute",
        parent_id: "parent-eb",
        level: 2,
        ordinal: 0,
        heading: "Empty body rule",
        body: "",
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: null,
        citation_path: "us/statute/26/999",
        rac_path: null,
        has_rac: false,
        created_at: "",
        updated_at: "",
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
        currentRule,
      });

      vi.mocked(useRule).mockReturnValue({
        rule: currentRule,
        children: [],
        loading: false,
        error: null,
      });

      render(<AtlasBrowser segments={["us", "statute", "26", "999"]} />);

      await waitFor(() => {
        expect(screen.getAllByText("Empty body rule").length).toBeGreaterThan(
          0
        );
      });

      // Non-container branch renders via RuleDetailPanel, which does NOT emit
      // the "N sections below" compact container summary.
      expect(screen.queryByText(/sections? below/)).not.toBeInTheDocument();
    });

    it("pluralizes the section count for multi-child navigation containers", async () => {
      const currentRule = {
        id: "part-273",
        jurisdiction: "us",
        doc_type: "regulation",
        parent_id: null,
        level: 0,
        ordinal: 273,
        heading: "CERTIFICATION OF ELIGIBLE HOUSEHOLDS",
        body: null,
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: null,
        citation_path: "us/regulation/7/273",
        rac_path: null,
        has_rac: false,
        created_at: "",
        updated_at: "",
      };

      const children = ["a", "b", "c"].map((letter) => ({
        ...currentRule,
        id: `subpart-${letter}`,
        parent_id: "part-273",
        level: 1,
        heading: `Subpart ${letter.toUpperCase()}`,
        citation_path: `us/regulation/7/273/subpart-${letter}`,
      }));

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: children.map((c) => ({
          segment: c.citation_path.split("/").pop()!,
          label: c.heading!,
          hasChildren: true,
          nodeType: "section" as const,
          rule: c,
          hasRac: false,
        })),
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
        currentRule,
      });

      vi.mocked(useRule).mockReturnValue({
        rule: currentRule,
        children,
        loading: false,
        error: null,
      });

      render(<AtlasBrowser segments={["us", "regulation", "7", "273"]} />);

      await waitFor(() => {
        expect(screen.getByText(/3 sections below/)).toBeInTheDocument();
      });
    });

    it("falls back to 'Untitled' when a navigation container has no heading", async () => {
      const currentRule = {
        id: "subpart-x",
        jurisdiction: "us",
        doc_type: "regulation",
        parent_id: "part-999",
        level: 1,
        ordinal: 0,
        heading: null,
        body: null,
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: null,
        citation_path: "us/regulation/9/999/subpart-x",
        rac_path: null,
        has_rac: false,
        created_at: "",
        updated_at: "",
      };

      const child = {
        ...currentRule,
        id: "child-1",
        parent_id: "subpart-x",
        level: 2,
        heading: "Some section",
        body: "body",
        citation_path: "us/regulation/9/999/1",
      };

      vi.mocked(useTreeNodes).mockReturnValue({
        nodes: [
          {
            segment: "1",
            label: "Some section",
            hasChildren: true,
            nodeType: "section" as const,
            rule: child,
            hasRac: false,
          },
        ],
        loading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore,
        leafRule: null,
        currentRule,
      });

      vi.mocked(useRule).mockReturnValue({
        rule: currentRule,
        children: [child],
        loading: false,
        error: null,
      });

      render(
        <AtlasBrowser
          segments={["us", "regulation", "9", "999", "subpart-x"]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Untitled")).toBeInTheDocument();
      });
    });
  });
});
