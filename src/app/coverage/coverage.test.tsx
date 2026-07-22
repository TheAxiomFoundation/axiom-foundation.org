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
      slug: "uk",
      label: "United Kingdom",
      documents: {},
      documentTotal: 0,
      provisionCount: 0,
      encodingFileCount: 300,
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
    const { container } = render(await CoveragePage());

    // The three pipeline layers with their live totals ("Provisions"
    // also names a table column in the details fold).
    expect(screen.getByText("Source documents")).toBeInTheDocument();
    expect(screen.getAllByText("Provisions").length).toBeGreaterThan(0);
    expect(screen.getByText("RuleSpec encodings")).toBeInTheDocument();
    expect(screen.getByText(/^405/)).toBeInTheDocument();
    expect(screen.getByText(/^58,624/)).toBeInTheDocument();
    expect(screen.getByText(/^4,875/)).toBeInTheDocument();
    // Breadth rides in the callout fact lines (weighted numbers are
    // separate spans, so assert on assembled text): corpus
    // jurisdictions (1 of the 2 fixtures has provisions), doc types,
    // derived density (58,624 / 405 ≈ 145), and the encoding leader.
    const text = container.textContent ?? "";
    expect(text).toContain("1 jurisdiction — US federal");
    expect(text).toContain("≈ 145 per document");
    expect(text).toContain("2 jurisdictions encoded · US Federal leads with 1,200");

    // Jurisdiction cards: US links into the app, UK (encodings-only)
    // does not, and the exact figures are printed on the card.
    const usCard = screen
      .getAllByText("US Federal")
      .map((el) => el.closest("a.cov-card"))
      .find(Boolean);
    expect(usCard).toHaveAttribute("href", "/us");
    expect(
      screen
        .getAllByText("United Kingdom")
        .every((el) => el.closest("a.cov-card") === null)
    ).toBe(true);
    expect(screen.getByText("9,897")).toBeInTheDocument();
    expect(
      screen.getByText(/encodings published ahead of corpus ingestion/)
    ).toBeInTheDocument();
    // Sort controls.
    expect(
      screen.getByRole("group", { name: /sort jurisdictions/i })
    ).toBeInTheDocument();
  });
});
