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
    leafRule: null,
    currentRule: null,
  }),
}));

// Mock tree-data — use real resolveAtlasPath/buildBreadcrumbs
vi.mock("@/lib/tree-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tree-data")>();
  return {
    ...actual,
    getJurisdictionCounts: vi.fn().mockResolvedValue(new Map()),
  };
});

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabaseAkn: { from: vi.fn() },
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
    expect(
      screen.getByRole("heading", { name: "Atlas" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Explore encoded law/)).toBeInTheDocument();
  });

  it("shows jurisdiction picker at root", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("Choose a jurisdiction")).toBeInTheDocument();
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

    render(<AtlasBrowser segments={["us", "federal"]} />);
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

    render(<AtlasBrowser segments={["us", "federal", "statute"]} />);
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

    render(<AtlasBrowser segments={["us", "federal"]} />);
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

    render(<AtlasBrowser segments={["us", "federal"]} />);
    const btn = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(btn);
    expect(loadMore).toHaveBeenCalled();
  });
});
