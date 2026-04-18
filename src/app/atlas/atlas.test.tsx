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
    leafRule: null,
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
  getRuleReferences: vi.fn().mockResolvedValue([]),
  getAtlasStats: vi.fn().mockResolvedValue(null),
  getJurisdictionFlows: vi.fn().mockResolvedValue([]),
}));

import { AtlasBrowser } from "@/components/atlas/document-browser";

describe("AtlasBrowser (tree-based)", () => {
  it("renders the Atlas heading and description", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(
      screen.getByRole("heading", { name: "Atlas" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Explore encoded law/)).toBeInTheDocument();
  });

  it("shows jurisdiction picker when no segments", () => {
    render(<AtlasBrowser segments={[]} />);
    expect(screen.getByText("Choose a jurisdiction")).toBeInTheDocument();
  });
});
