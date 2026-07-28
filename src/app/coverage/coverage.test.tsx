import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetCoverageData } = vi.hoisted(() => ({
  mockGetCoverageData: vi.fn(),
}));

vi.mock("@/lib/axiom/coverage-page", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCoverageData: mockGetCoverageData,
}));

import CoveragePage from "./page";
import CoverageLoading from "./loading";
import type { CoverageData } from "@/lib/axiom/coverage-page";

const DATA: CoverageData = {
  totals: {
    jurisdictions: 2,
    documents: 405,
    provisions: 58624,
    encodingFiles: 4875,
  },
  docTypeTotals: [
    { type: "statute", count: 248 },
    { type: "regulation", count: 97 },
    { type: "guidance", count: 60 },
  ],
  jurisdictions: [
    {
      slug: "us",
      label: "US Federal",
      documents: { statute: 225, regulation: 80, guidance: 24, form: 2 },
      documentTotal: 331,
      provisionCount: 9897,
      encodingFileCount: 1200,
    },
    {
      slug: "us-ms",
      label: "Mississippi",
      documents: {},
      documentTotal: 0,
      provisionCount: 0,
      encodingFileCount: 300,
    },
    {
      slug: "uk",
      label: "United Kingdom",
      documents: {},
      documentTotal: 0,
      provisionCount: 0,
      encodingFileCount: 250,
    },
  ],
};

describe("CoveragePage", () => {
  beforeEach(() => {
    mockGetCoverageData.mockReset();
  });

  it("renders an explicit unavailable state when data cannot load", async () => {
    mockGetCoverageData.mockResolvedValue(null);
    render(await CoveragePage());
    expect(
      screen.getByText(/temporarily unavailable/i)
    ).toBeInTheDocument();
  });

  it("renders the stack hero layers and the jurisdiction breakdown", async () => {
    mockGetCoverageData.mockResolvedValue(DATA);
    render(await CoveragePage());

    // The three pipeline layers with their live totals.
    expect(screen.getByText("Source documents")).toBeInTheDocument();
    expect(screen.getByText("Provisions")).toBeInTheDocument();
    expect(screen.getByText("RuleSpec encodings")).toBeInTheDocument();
    // Hero totals come straight from the data layer — all
    // jurisdictions included.
    expect(screen.getByText("405")).toBeInTheDocument();
    expect(screen.getByText("58,624")).toBeInTheDocument();
    expect(screen.getByText("4,875")).toBeInTheDocument();
    // Each layer carries its serif support line.
    expect(
      screen.getByText(/Statutes, regulations, and agency guidance/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Machine-readable rules, each linked back/)
    ).toBeInTheDocument();

    // Jurisdiction rows: full breakdown — documents by type,
    // provisions, encodings. Corpus rows link to the browse tree.
    const usRow = screen.getByText("US Federal").closest("a");
    expect(usRow).toHaveAttribute("href", "/us");
    expect(
      screen.getByText(
        "331 documents — 225 statutes · 80 regulations · 24 guidance · 2 forms"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("9,897 provisions")).toBeInTheDocument();
    expect(screen.getByText("1,200 encodings")).toBeInTheDocument();

    // Encodings-only rows: unlinked, amber, ingestion pending.
    expect(screen.getByText("Mississippi").closest("a")).toBeNull();
    expect(screen.getByText("300 encodings")).toBeInTheDocument();
    expect(
      screen.getAllByText(/corpus ingestion pending/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/amber counts are encodings/)
    ).toBeInTheDocument();

    // No program concepts anywhere on the page.
    expect(screen.queryByText(/by program/i)).toBeNull();
    expect(screen.queryByText(/programs?\b/i)).toBeNull();
  });
});

describe("CoverageLoading", () => {
  it("renders the hero mid-count: planes on the left, reels spinning", () => {
    const { container } = render(<CoverageLoading />);
    // The isometric stack renders in the loading state too.
    expect(container.querySelectorAll(".pstack-plane").length).toBe(3);
    // Spin reels are server-renderable markup (pure CSS motion), so
    // they exist without any client hydration.
    expect(
      container.querySelectorAll(".roll-strip-spin").length
    ).toBeGreaterThanOrEqual(12);
    // Same layer names as the real hero (shared copy module).
    expect(screen.getByText("Source documents")).toBeInTheDocument();
    expect(screen.getByText("RuleSpec encodings")).toBeInTheDocument();
    expect(
      screen.getAllByText(/counting the corpus/).length,
    ).toBeGreaterThan(0);
  });
});
