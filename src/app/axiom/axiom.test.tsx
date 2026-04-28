import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
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

import { AxiomBrowser } from "@/components/axiom/document-browser";

describe("AxiomBrowser (tree-based)", () => {
  it("renders the Axiom heading and description", () => {
    render(<AxiomBrowser segments={[]} />);
    expect(
      screen.getByRole("heading", { name: "Axiom" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Explore encoded law/)).toBeInTheDocument();
  });

  it("shows the primary jurisdiction navigation when no segments", async () => {
    render(<AxiomBrowser segments={[]} />);
    await waitFor(() =>
      expect(
        screen.getByLabelText(/Choose a jurisdiction/i)
      ).toBeInTheDocument()
    );
  });
});
