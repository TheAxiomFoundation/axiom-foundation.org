import { render, screen, fireEvent } from "@testing-library/react";
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

// Mock supabaseArch
vi.mock("@/lib/supabase", () => ({
  supabaseArch: { from: vi.fn() },
  supabase: { from: vi.fn() },
}));

import { useTreeNodes } from "@/hooks/use-tree-nodes";
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
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });
  });

  it("shows loading state", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: true,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: false,
      error: "Failed to connect",
      hasMore: false,
      loadMore: mockLoadMore,
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("Failed to connect")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("renders tree nodes when data is present", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [
        {
          segment: "us",
          label: "United States",
          hasChildren: true,
          childCount: 60000,
          nodeType: "jurisdiction",
        },
      ],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("60,000")).toBeInTheDocument();
  });

  it("shows load more button when hasMore is true", () => {
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
      loadMore: mockLoadMore,
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    const loadMoreBtn = screen.getByRole("button", { name: /load more/i });
    expect(loadMoreBtn).toBeInTheDocument();
    fireEvent.click(loadMoreBtn);
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('shows "Loading..." on load more button when loading', () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [
        {
          segment: "us",
          label: "United States",
          hasChildren: true,
          nodeType: "jurisdiction",
        },
      ],
      loading: true,
      error: null,
      hasMore: true,
      loadMore: mockLoadMore,
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    expect(
      screen.getByRole("button", { name: /loading\.\.\./i })
    ).toBeInTheDocument();
  });

  it("navigates on node click", () => {
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
      hasMore: false,
      loadMore: mockLoadMore,
      breadcrumbs: [{ label: "Atlas", href: "/atlas" }],
      leafRule: null,
    });

    render(<AtlasBrowser segments={[]} />);
    fireEvent.click(screen.getByText("United States"));
    expect(mockPush).toHaveBeenCalledWith("/atlas/us");
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
      breadcrumbs: [
        { label: "Atlas", href: "/atlas" },
        { label: "US", href: "/atlas/us" },
        { label: "Statutes", href: "/atlas/us/statute" },
      ],
      leafRule: null,
    });

    render(<AtlasBrowser segments={["us", "statute"]} />);
    fireEvent.click(screen.getByText("Title 26"));
    expect(mockPush).toHaveBeenCalledWith("/atlas/us/statute/26");
  });

  it("renders breadcrumbs", () => {
    vi.mocked(useTreeNodes).mockReturnValue({
      nodes: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
      breadcrumbs: [
        { label: "Atlas", href: "/atlas" },
        { label: "United States", href: "/atlas/us" },
      ],
      leafRule: null,
    });

    render(<AtlasBrowser segments={["us"]} />);
    // "Atlas" appears in both breadcrumb and heading
    const atlasElements = screen.getAllByText("Atlas");
    expect(atlasElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("United States")).toBeInTheDocument();
  });
});
