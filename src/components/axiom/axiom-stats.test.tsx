import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAxiomStats = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getAxiomStats: (...args: unknown[]) => mockGetAxiomStats(...args),
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

import {
  AxiomStats,
  formatCompact,
  humanizeIdentifier,
  jurisdictionDisplay,
} from "./axiom-stats";

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
    expect(jurisdictionDisplay("mars")).toBe("Mars");
  });
  it("removes separators from unknown jurisdiction labels", () => {
    expect(jurisdictionDisplay("tribal_courts")).toBe("Tribal Courts");
    expect(jurisdictionDisplay("eu-member_states")).toBe("EU Member States");
    expect(humanizeIdentifier("new_policy_bucket")).toBe("New Policy Bucket");
  });
});

describe("AxiomStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fullPayload = {
    provisions_count: 658899,
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
    mockGetAxiomStats.mockReturnValue(new Promise(() => {}));
    const { container } = render(<AxiomStats />);
    expect(container.querySelector("[data-testid='axiom-stats']")).toBeNull();
  });

  it("renders nothing when the RPC resolves null", async () => {
    mockGetAxiomStats.mockResolvedValue(null);
    const { container } = render(<AxiomStats />);
    await waitFor(() => expect(mockGetAxiomStats).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector("[data-testid='axiom-stats']")).toBeNull();
  });

  it("renders the three stats with compact formatting", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByTestId("axiom-stats")).toBeInTheDocument()
    );
    expect(screen.getByText("659K")).toBeInTheDocument();
    expect(screen.getByText("149K")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("provisions indexed")).toBeInTheDocument();
    expect(screen.getByText("citations extracted")).toBeInTheDocument();
    expect(screen.getByText("jurisdictions")).toBeInTheDocument();
  });

  it("puts the full count in the title attribute for tooltip", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByTestId("axiom-stats")).toBeInTheDocument()
    );
    const rulesNumber = screen.getByText("659K");
    expect(rulesNumber).toHaveAttribute("title", "658,899");
  });

  it("renders one pill per jurisdiction as a clickable link", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByTestId("axiom-stats-pills")).toBeInTheDocument()
    );
    // Federal / national band appears on top with full labels; US
    // states render alphabetically beneath.
    expect(screen.getByText("US Federal")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("District of Columbia")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();

    // Every pill routes to /<slug>.
    const pills = screen
      .getByTestId("axiom-stats-pills")
      .querySelectorAll<HTMLAnchorElement>("a[href^='/']");
    const hrefs = Array.from(pills).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/us",
        "/uk",
        "/us-dc",
        "/us-ny",
      ])
    );
  });

  it("humanizes uncurated jurisdiction labels instead of showing underscores", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions: [
        ...fullPayload.jurisdictions,
        { jurisdiction: "tribal_courts", count: 12 },
      ],
    });
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByTestId("axiom-stats-pills")).toBeInTheDocument()
    );

    expect(screen.getByText("Tribal Courts")).toBeInTheDocument();
    expect(screen.queryByText("TRIBAL_COURTS")).not.toBeInTheDocument();
  });

  it("shows the full label + rule count in the pill title for hover", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByTestId("axiom-stats-pills")).toBeInTheDocument()
    );
    const dcPill = screen
      .getByTestId("axiom-stats-pills")
      .querySelector("a[title='District of Columbia — 130,617 rules']");
    expect(dcPill).not.toBeNull();
  });

  it("does not render the pills section when jurisdictions array is empty", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions: [],
    });
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByTestId("axiom-stats")).toBeInTheDocument()
    );
    expect(
      screen.queryByTestId("axiom-stats-pills")
    ).not.toBeInTheDocument();
  });
});
