import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
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
vi.mock("@/hooks/use-tree-nodes", () => ({
  useTreeNodes: vi.fn().mockReturnValue({
    nodes: [],
    loading: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    leafRule: null,
    currentRule: null,
  }),
}));

// Mock tree-data — use real resolveAxiomPath/buildBreadcrumbs
vi.mock("@/lib/tree-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tree-data")>();
  return {
    ...actual,
    getJurisdictionCounts: vi.fn().mockResolvedValue(new Map()),
  };
});

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabaseCorpus: { from: vi.fn() },
  supabase: { from: vi.fn() },
  getRuleReferences: vi.fn().mockResolvedValue([]),
  getAxiomStats: vi.fn().mockResolvedValue({
    provisions_count: 1000,
    references_count: 1000,
    jurisdictions_count: 2,
    jurisdictions: [
      { jurisdiction: "us", count: 500 },
      { jurisdiction: "uk", count: 500 },
    ],
  }),
}));

import { useTreeNodes } from "@/hooks/use-tree-nodes";
import { AxiomBrowser } from "./document-browser";

describe("AxiomBrowser integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Axiom header and description", () => {
    render(<AxiomBrowser segments={[]} />);
    expect(
      screen.getByRole("heading", { name: "Axiom" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Explore encoded law/)).toBeInTheDocument();
  });

  it("shows the primary jurisdiction navigation at root", async () => {
    render(<AxiomBrowser segments={[]} />);
    await waitFor(() =>
      expect(
        screen.getByLabelText(/Choose a jurisdiction/i)
      ).toBeInTheDocument()
    );
  });

  it("renders nodes in rule tree phase", () => {
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
      loadMore: vi.fn(),
      leafRule: null,
      currentRule: null,
    });

    render(<AxiomBrowser segments={["us", "federal"]} />);
    expect(screen.getByText("Statutes")).toBeInTheDocument();
  });

  it("renders breadcrumb navigation in rule phase", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      leafRule: null,
      currentRule: null,
    });

    render(<AxiomBrowser segments={["us", "federal", "statute"]} />);
    const breadcrumbNav = screen.getByRole("navigation", {
      name: "Breadcrumb",
    });
    expect(breadcrumbNav).toBeInTheDocument();
  });

  it("renders loading state in rule phase", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      leafRule: null,
      currentRule: null,
    });

    render(<AxiomBrowser segments={["us", "federal"]} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders load more button in rule phase", () => {
    const loadMore = vi.fn();
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
      loadMore,
      leafRule: null,
      currentRule: null,
    });

    render(<AxiomBrowser segments={["us", "federal"]} />);
    const btn = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(btn);
    expect(loadMore).toHaveBeenCalled();
  });
});
