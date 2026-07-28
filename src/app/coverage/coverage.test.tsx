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
      slug: "us-ok",
      label: "Oklahoma",
      documents: { manual: 1 },
      documentTotal: 1,
      provisionCount: 212,
      encodingFileCount: 0,
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
    // Hero totals are recomputed over the US scope — sums of the US
    // rows, not the data layer's global figures.
    expect(screen.getByText("332")).toBeInTheDocument();
    expect(screen.getByText("10,109")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.queryByText("405")).toBeNull();
    expect(screen.queryByText("58,624")).toBeNull();
    // Each layer carries its serif support line.
    expect(
      screen.getByText(/Statutes, regulations, and agency guidance/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Machine-readable rules, each linked back/)
    ).toBeInTheDocument();

    // Jurisdiction rows: one line each — documents, provisions,
    // encodings. No type breakdowns, and rows are never links.
    expect(screen.getByText("US Federal").closest("a")).toBeNull();
    expect(screen.getByText("331 documents")).toBeInTheDocument();
    expect(screen.getByText("9,897 provisions")).toBeInTheDocument();
    expect(screen.getByText("1,200 encodings")).toBeInTheDocument();
    expect(screen.queryByText(/225 statutes/)).toBeNull();
    // Singular document count reads naturally.
    expect(screen.getByText("1 document")).toBeInTheDocument();

    // Encodings-only rows show just their amber figure.
    expect(screen.getByText("Mississippi").closest("a")).toBeNull();
    expect(screen.getByText("300 encodings")).toBeInTheDocument();

    // Only US jurisdictions are public for now — non-US rows are held
    // back, and a single shown country means no filter row at all.
    const names = Array.from(
      document.querySelectorAll<HTMLElement>(".cov-rows .cov-row-name")
    ).map((el) => el.textContent);
    expect(names).toEqual(["Mississippi", "Oklahoma", "US Federal"]);
    expect(screen.queryByText("United Kingdom")).toBeNull();
    expect(
      screen.queryByRole("group", { name: /filter by country/i })
    ).toBeNull();

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
