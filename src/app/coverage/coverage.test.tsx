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
import { buildShelves } from "@/components/coverage/stacks";
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

  it("renders the stacks with per-jurisdiction runs and the table", async () => {
    mockGetCoverageData.mockResolvedValue(DATA);
    render(await CoveragePage());

    // Shelf labels carry the live totals ("Statutes" also names a
    // table column, so expect both).
    expect(screen.getAllByText("Statutes").length).toBe(2);
    expect(screen.getByText("RuleSpec encodings")).toBeInTheDocument();
    expect(screen.getByText(/225 documents · 1 jurisdiction\b/)).toBeInTheDocument();
    // Colophon states the quantum and the provisions headline.
    expect(screen.getByText(/one spine ≈/)).toBeInTheDocument();
    expect(
      screen.getByText(/58,624 provisions across 2 jurisdictions/)
    ).toBeInTheDocument();
    // A corpus jurisdiction's run links into the app browse surface.
    const usRuns = screen.getAllByRole("link", {
      name: /US Federal — .*Browse US Federal/i,
    });
    expect(usRuns.length).toBeGreaterThan(0);
    expect(usRuns[0]).toHaveAttribute("href", "/us");
    // Encodings-only jurisdictions get a focusable, unlinked run.
    const ukRun = screen.getByLabelText(/United Kingdom — 300 files/);
    expect(ukRun.closest("a")).toBeNull();

    // The table still carries exact numbers; UK row stays unlinked.
    expect(screen.getByText("9,897")).toBeInTheDocument();
    expect(screen.getByText("US Federal").closest("a")).toHaveAttribute(
      "href",
      "/us"
    );
    expect(screen.getByText("United Kingdom").closest("a")).toBeNull();
  });
});

describe("buildShelves", () => {
  it("quantizes runs, groups by jurisdiction, and links corpus rows", () => {
    const { shelves, quantum } = buildShelves(DATA);
    expect(quantum).toBe(25);
    const statutes = shelves.find((s) => s.key === "statute");
    expect(statutes?.total).toBe(225);
    expect(statutes?.groups).toEqual([
      { slug: "us", label: "US Federal", count: 225, volumes: 9, href: "/us" },
    ]);
    const encodings = shelves.find((s) => s.key === "encoding");
    expect(encodings?.total).toBe(1500);
    // UK has encodings but no corpus presence: present, unlinked.
    expect(encodings?.groups.find((g) => g.slug === "uk")).toMatchObject({
      href: null,
      volumes: 12,
    });
    // Every tiny jurisdiction still gets at least one spine.
    const other = shelves.find((s) => s.key === "other");
    expect(
      other?.groups.every((g) => g.volumes >= 1)
    ).toBe(true);
  });
});
