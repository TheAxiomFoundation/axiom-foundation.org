import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetCoverageData, mockGetProgramCoverage } = vi.hoisted(() => ({
  mockGetCoverageData: vi.fn(),
  mockGetProgramCoverage: vi.fn(),
}));

vi.mock("@/lib/axiom/coverage-page", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCoverageData: mockGetCoverageData,
}));

vi.mock("@/lib/axiom/program-coverage", () => ({
  getProgramCoverage: mockGetProgramCoverage,
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

const PROGRAMS = [
  { family: "snap", jurisdictions: ["us-al", "us-co"] },
  { family: "medicaid", jurisdictions: ["us-co"] },
];

describe("CoveragePage", () => {
  beforeEach(() => {
    mockGetCoverageData.mockReset();
    mockGetProgramCoverage.mockReset();
    mockGetProgramCoverage.mockResolvedValue(PROGRAMS);
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

    // Default view: by program — family rows with jurisdiction lists.
    expect(
      screen.getByRole("group", { name: /coverage view/i })
    ).toBeInTheDocument();
    expect(screen.getByText("SNAP")).toBeInTheDocument();
    expect(
      screen.getByText("Supplemental Nutrition Assistance Program")
    ).toBeInTheDocument();
    // Real jurisdiction names, not slugs; unknown families humanize.
    expect(screen.getByText("Alabama · Colorado")).toBeInTheDocument();
    expect(screen.getByText("Medicaid")).toBeInTheDocument();

    // Toggle to by jurisdiction: dense tiles, corpus rows linked,
    // encodings-only rows unlinked and amber.
    fireEvent.click(screen.getByRole("button", { name: /by jurisdiction/i }));
    const usTile = screen.getByText("US Federal").closest("a");
    expect(usTile).toHaveAttribute("href", "/us");
    expect(screen.getByText("Mississippi").closest("a")).toBeNull();
    expect(screen.getAllByText("United Kingdom").length).toBeGreaterThan(0);
    expect(screen.getByText(/figures are provisions/)).toBeInTheDocument();
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
