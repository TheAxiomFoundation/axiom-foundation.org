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

  it("renders totals and the per-jurisdiction table", async () => {
    mockGetCoverageData.mockResolvedValue({
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
    });
    render(await CoveragePage());

    // Stat band with formatted numbers.
    expect(screen.getByText("58,624")).toBeInTheDocument();
    expect(screen.getByText("4,875")).toBeInTheDocument();
    // Doc-type totals line.
    expect(
      screen.getByText(/248 statutes · 97 regulations · 60 guidance documents/i)
    ).toBeInTheDocument();
    // Corpus jurisdictions link into the app browse surface.
    expect(screen.getByText("US Federal").closest("a")).toHaveAttribute(
      "href",
      "/us"
    );
    // Encodings-only jurisdictions render without a browse link and
    // with dashes for corpus columns.
    expect(screen.getByText("United Kingdom").closest("a")).toBeNull();
    expect(screen.getByText("1,200")).toBeInTheDocument();
  });
});
