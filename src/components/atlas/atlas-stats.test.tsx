import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAtlasStats = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getAtlasStats: (...args: unknown[]) => mockGetAtlasStats(...args),
}));

import { AtlasStats, formatCompact, jurisdictionDisplay } from "./atlas-stats";

describe("formatCompact", () => {
  it("leaves small numbers unformatted", () => {
    expect(formatCompact(17)).toBe("17");
    expect(formatCompact(999)).toBe("999");
  });
  it("formats low-thousand with one decimal", () => {
    expect(formatCompact(1_234)).toBe("1.2K");
    expect(formatCompact(9_999)).toBe("10.0K");
  });
  it("formats mid-thousand with no decimals", () => {
    expect(formatCompact(148_604)).toBe("149K");
    expect(formatCompact(658_899)).toBe("659K");
  });
  it("formats millions with one decimal", () => {
    expect(formatCompact(1_500_000)).toBe("1.5M");
    expect(formatCompact(12_345_678)).toBe("12.3M");
  });
});

describe("jurisdictionDisplay", () => {
  it("maps federal to the combined USC+CFR label", () => {
    expect(jurisdictionDisplay("us")).toBe("USC+CFR");
  });
  it("strips the us- prefix and uppercases", () => {
    expect(jurisdictionDisplay("us-ny")).toBe("NY");
    expect(jurisdictionDisplay("us-dc")).toBe("DC");
    expect(jurisdictionDisplay("us-tx")).toBe("TX");
  });
  it("maps uk and canada to 2-letter codes", () => {
    expect(jurisdictionDisplay("uk")).toBe("UK");
    expect(jurisdictionDisplay("canada")).toBe("CA");
  });
  it("falls back to uppercasing an unknown jurisdiction", () => {
    expect(jurisdictionDisplay("mars")).toBe("MARS");
  });
});

describe("AtlasStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fullPayload = {
    rules_count: 658899,
    references_count: 148604,
    jurisdictions_count: 17,
    jurisdictions: [
      { jurisdiction: "us", count: 467993 },
      { jurisdiction: "us-dc", count: 130617 },
      { jurisdiction: "us-ny", count: 26638 },
      { jurisdiction: "uk", count: 4705 },
    ],
  };

  it("renders nothing while the RPC is in flight", () => {
    mockGetAtlasStats.mockReturnValue(new Promise(() => {}));
    const { container } = render(<AtlasStats />);
    expect(container.querySelector("[data-testid='atlas-stats']")).toBeNull();
  });

  it("renders nothing when the RPC resolves null", async () => {
    mockGetAtlasStats.mockResolvedValue(null);
    const { container } = render(<AtlasStats />);
    await waitFor(() => expect(mockGetAtlasStats).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector("[data-testid='atlas-stats']")).toBeNull();
  });

  it("renders the three stats with compact formatting", async () => {
    mockGetAtlasStats.mockResolvedValue(fullPayload);
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats")).toBeInTheDocument()
    );
    expect(screen.getByText("659K")).toBeInTheDocument();
    expect(screen.getByText("149K")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("documents indexed")).toBeInTheDocument();
    expect(screen.getByText("citations extracted")).toBeInTheDocument();
    expect(screen.getByText("jurisdictions")).toBeInTheDocument();
  });

  it("puts the full count in the title attribute for tooltip", async () => {
    mockGetAtlasStats.mockResolvedValue(fullPayload);
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats")).toBeInTheDocument()
    );
    const rulesNumber = screen.getByText("659K");
    expect(rulesNumber).toHaveAttribute("title", "658,899");
  });

  it("renders one pill per jurisdiction in the returned order", async () => {
    mockGetAtlasStats.mockResolvedValue(fullPayload);
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats-pills")).toBeInTheDocument()
    );
    expect(screen.getByText("USC+CFR")).toBeInTheDocument();
    expect(screen.getByText("DC")).toBeInTheDocument();
    expect(screen.getByText("NY")).toBeInTheDocument();
    expect(screen.getByText("UK")).toBeInTheDocument();
    // Sorted order preserved (us first).
    const pills = screen
      .getByTestId("atlas-stats-pills")
      .querySelectorAll("span[title]");
    expect(pills[0]).toHaveTextContent("USC+CFR");
    expect(pills[1]).toHaveTextContent("DC");
  });

  it("shows the full jurisdiction count on pill hover", async () => {
    mockGetAtlasStats.mockResolvedValue(fullPayload);
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats-pills")).toBeInTheDocument()
    );
    const pills = screen.getByTestId("atlas-stats-pills");
    const dcPill = pills.querySelector(
      "span[title='130,617 documents']"
    );
    expect(dcPill).not.toBeNull();
  });

  it("does not render the pills section when jurisdictions array is empty", async () => {
    mockGetAtlasStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions: [],
    });
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats")).toBeInTheDocument()
    );
    expect(
      screen.queryByTestId("atlas-stats-pills")
    ).not.toBeInTheDocument();
  });
});
