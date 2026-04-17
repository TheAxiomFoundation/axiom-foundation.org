import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAtlasStats = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getAtlasStats: (...args: unknown[]) => mockGetAtlasStats(...args),
}));

import { AtlasStats, formatCompact } from "./atlas-stats";

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

describe("AtlasStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    mockGetAtlasStats.mockResolvedValue({
      rules_count: 658899,
      references_count: 148604,
      jurisdictions_count: 17,
    });
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
    mockGetAtlasStats.mockResolvedValue({
      rules_count: 658899,
      references_count: 148604,
      jurisdictions_count: 17,
    });
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats")).toBeInTheDocument()
    );
    // Full count shown on hover — formatted with thousands separators
    const rulesNumber = screen.getByText("659K");
    expect(rulesNumber).toHaveAttribute("title", "658,899");
  });
});
