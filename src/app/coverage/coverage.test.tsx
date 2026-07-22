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

  it("renders the stack hero layers and the jurisdiction cards", async () => {
    mockGetCoverageData.mockResolvedValue(DATA);
    render(await CoveragePage());

    // The three pipeline layers with their live totals ("Provisions"
    // also names a table column in the details fold).
    expect(screen.getByText("Source documents")).toBeInTheDocument();
    expect(screen.getAllByText("Provisions").length).toBeGreaterThan(0);
    expect(screen.getByText("RuleSpec encodings")).toBeInTheDocument();
    // Hero totals are recomputed for the US-only launch scope:
    // documents 331, provisions 9,897 (hero + card), encodings
    // 1,200 + 300 = 1,500 — the UK fixture is excluded entirely.
    expect(screen.getByText("331")).toBeInTheDocument();
    expect(screen.getAllByText("9,897").length).toBeGreaterThan(1);
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.queryByText("United Kingdom")).toBeNull();
    // Each layer carries its serif support line.
    expect(
      screen.getByText(/Statutes, regulations, and agency guidance/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Machine-readable rules, each linked back/)
    ).toBeInTheDocument();

    // Jurisdiction cards: US links into the app, UK (encodings-only)
    // does not, and the exact figures are printed on the card.
    const usCard = screen
      .getAllByText("US Federal")
      .map((el) => el.closest("a.cov-card"))
      .find(Boolean);
    expect(usCard).toHaveAttribute("href", "/us");
    expect(
      screen
        .getAllByText("Mississippi")
        .every((el) => el.closest("a.cov-card") === null)
    ).toBe(true);
    expect(
      screen.getByText(/encodings published ahead of corpus ingestion/)
    ).toBeInTheDocument();
    // Sort controls.
    expect(
      screen.getByRole("group", { name: /sort jurisdictions/i })
    ).toBeInTheDocument();
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
    expect(screen.getByText(/counting the corpus/)).toBeInTheDocument();
  });
});
