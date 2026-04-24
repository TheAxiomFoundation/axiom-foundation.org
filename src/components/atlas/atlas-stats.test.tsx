import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAtlasStats = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getAtlasStats: (...args: unknown[]) => mockGetAtlasStats(...args),
}));

// The pill nav uses next/link; use a plain anchor so hrefs land in
// the DOM for assertion.
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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
  it("maps uk and canada to short codes", () => {
    // Canada goes to CAN (three letters) to avoid colliding with
    // California's CA display — now that every ingested jurisdiction
    // is a clickable pill on the landing, collisions are real.
    expect(jurisdictionDisplay("uk")).toBe("UK");
    expect(jurisdictionDisplay("canada")).toBe("CAN");
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

  it("renders one pill per jurisdiction as a clickable link", async () => {
    mockGetAtlasStats.mockResolvedValue(fullPayload);
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats-pills")).toBeInTheDocument()
    );
    // Federal / national band appears on top with full labels; US
    // states render alphabetically beneath.
    expect(screen.getByText("US Federal")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("District of Columbia")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();

    // Every pill routes to /atlas/<slug>.
    const pills = screen
      .getByTestId("atlas-stats-pills")
      .querySelectorAll<HTMLAnchorElement>("a[href^='/atlas/']");
    const hrefs = Array.from(pills).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/atlas/us",
        "/atlas/uk",
        "/atlas/us-dc",
        "/atlas/us-ny",
      ])
    );
  });

  it("shows the full label + rule count in the pill title for hover", async () => {
    mockGetAtlasStats.mockResolvedValue(fullPayload);
    render(<AtlasStats />);
    await waitFor(() =>
      expect(screen.getByTestId("atlas-stats-pills")).toBeInTheDocument()
    );
    const dcPill = screen
      .getByTestId("atlas-stats-pills")
      .querySelector("a[title='District of Columbia — 130,617 rules']");
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
