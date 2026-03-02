import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/atlas",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock useTreeNodes
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

import { AtlasBrowser } from "@/components/atlas/document-browser";

describe("AtlasBrowser (tree-based)", () => {
  it("renders the Atlas heading and description", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByRole("heading", { name: "Atlas" })).toBeInTheDocument();
    expect(
      screen.getByText(/Explore encoded law/)
    ).toBeInTheDocument();
  });

  it("shows empty state when no nodes", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });
});
