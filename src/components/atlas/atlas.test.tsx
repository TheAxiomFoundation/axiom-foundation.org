import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/atlas",
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
    breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
    leafRule: null,
  }),
}));

// Mock tree-data
vi.mock("@/lib/tree-data", () => ({
  isUUID: vi.fn().mockReturnValue(false),
  buildBreadcrumbs: vi.fn().mockReturnValue([]),
  getJurisdiction: vi.fn(),
  JURISDICTIONS: [],
}));

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabaseArch: { from: vi.fn() },
  supabase: { from: vi.fn() },
}));

import { useTreeNodes } from "@/hooks/use-tree-nodes";
import { AtlasBrowser } from "./document-browser";

describe("AtlasBrowser integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Atlas header and description", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByRole("heading", { name: "Atlas" })).toBeInTheDocument();
    expect(
      screen.getByText(/Explore encoded law/)
    ).toBeInTheDocument();
  });

  it("shows No items found when empty", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("renders nodes with jurisdiction counts", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [
        {
          segment: "us",
          label: "United States",
          hasChildren: true,
          childCount: 60519,
          nodeType: "jurisdiction",
        },
        {
          segment: "uk",
          label: "United Kingdom",
          hasChildren: true,
          childCount: 1558,
          nodeType: "jurisdiction",
        },
      ],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("60,519")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("1,558")).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      breadcrumbs: [
        { label: "Atlas", href: "/atlas" },
        { label: "United States", href: "/atlas/us" },
        { label: "Statutes", href: "/atlas/us/statute" },
      ],
      leafRule: null,
    });

    render(<AtlasBrowser segments={["us", "statute"]} />);
    // "Atlas" appears in both breadcrumb and heading
    const atlasElements = screen.getAllByText("Atlas");
    expect(atlasElements.length).toBeGreaterThanOrEqual(1);
    // "United States" appears in both breadcrumb and possibly node list
    const usElements = screen.getAllByText("United States");
    expect(usElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Statutes")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders load more button", () => {
    const loadMore = vi.fn();
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [
        {
          segment: "us",
          label: "United States",
          hasChildren: true,
          nodeType: "jurisdiction",
        },
      ],
      loading: false,
      error: null,
      hasMore: true,
      loadMore,
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    const btn = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(btn);
    expect(loadMore).toHaveBeenCalled();
  });
});
