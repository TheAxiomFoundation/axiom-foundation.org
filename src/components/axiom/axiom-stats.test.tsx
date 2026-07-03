import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAxiomStats, TEST_JURISDICTIONS } = vi.hoisted(() => ({
  mockGetAxiomStats: vi.fn(),
  TEST_JURISDICTIONS: [
    { slug: "us", label: "US Federal", hasCitationPaths: true },
    { slug: "uk", label: "United Kingdom", hasCitationPaths: true },
    { slug: "be", label: "Belgium", hasCitationPaths: true },
    { slug: "be-bru", label: "Brussels-Capital Region", hasCitationPaths: true },
    { slug: "be-vlg", label: "Flanders", hasCitationPaths: true },
    { slug: "be-wal", label: "Wallonia", hasCitationPaths: true },
    { slug: "be-dg", label: "German-speaking Community", hasCitationPaths: true },
    { slug: "ca", label: "Canada", hasCitationPaths: false },
    { slug: "us-co", label: "Colorado", hasCitationPaths: true },
    { slug: "us-dc", label: "District of Columbia", hasCitationPaths: true },
    { slug: "us-ny", label: "New York", hasCitationPaths: true },
    { slug: "us-pr", label: "Puerto Rico", hasCitationPaths: true },
  ],
}));

vi.mock("@/lib/supabase", () => ({
  getAxiomStats: (...args: unknown[]) => mockGetAxiomStats(...args),
}));

vi.mock("@/lib/tree-data", () => ({
  JURISDICTIONS: TEST_JURISDICTIONS,
  getJurisdictionBySlug: (slug: string) =>
    TEST_JURISDICTIONS.find((j) => j.slug === slug),
}));

vi.mock("@/lib/axiom/landing-jurisdictions", () => ({
  getLandingJurisdictions: (countedSlugs = new Set<string>()) =>
    TEST_JURISDICTIONS.filter(
      (j) => j.slug !== "us-pr" || countedSlugs.has(j.slug)
    ),
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
    expect(jurisdictionDisplay("be")).toBe("BE");
    expect(jurisdictionDisplay("ca")).toBe("CAN");
  });
  it("falls back to uppercasing an unknown jurisdiction", () => {
    // jurisdictionDisplay renders the slug as the code chip; for
    // uncurated slugs it returns the raw slug uppercased so the chip
    // stays distinct from the humanized label rendered alongside it.
    expect(jurisdictionDisplay("mars")).toBe("MARS");
  });
  it("preserves separators in the unknown jurisdiction code", () => {
    expect(jurisdictionDisplay("tribal_courts")).toBe("TRIBAL_COURTS");
    expect(jurisdictionDisplay("eu-member_states")).toBe("EU-MEMBER_STATES");
    // humanizeIdentifier is still the source of the *label* (separate
    // from the code chip) and continues to title-case the slug.
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

  it("renders jurisdiction links while the RPC is in flight", () => {
    mockGetAxiomStats.mockReturnValue(new Promise(() => {}));
    render(<AxiomStats />);
    const pills = within(screen.getByTestId("axiom-stats-pills"));
    // "US Federal" appears twice — as a federal tab and as the panel
    // heading for the active selection. Scope to the tablist for the
    // tab assertion and let the state chip carry the panel check.
    expect(
      pills.getByRole("tab", { name: /United States/i })
    ).toBeInTheDocument();
    expect(pills.getByText("Colorado")).toBeInTheDocument();
    expect(screen.getByText("provisions indexed")).toBeInTheDocument();
    expect(screen.queryByText("659K")).not.toBeInTheDocument();
  });

  it("keeps jurisdiction links when the RPC resolves null", async () => {
    mockGetAxiomStats.mockResolvedValue(null);
    render(<AxiomStats />);
    await waitFor(() => expect(mockGetAxiomStats).toHaveBeenCalledTimes(1));
    const pills = within(screen.getByTestId("axiom-stats-pills"));
    expect(
      pills.getByRole("tab", { name: /United States/i })
    ).toBeInTheDocument();
  });

  it("uses client Axiom navigation for jurisdiction clicks when provided", () => {
    mockGetAxiomStats.mockReturnValue(new Promise(() => {}));
    const onNavigateHref = vi.fn();
    render(<AxiomStats onNavigateHref={onNavigateHref} />);

    const pills = within(screen.getByTestId("axiom-stats-pills"));
    fireEvent.click(pills.getByText("Colorado").closest("a")!);

    expect(onNavigateHref).toHaveBeenCalledWith("/us-co");
  });

  it("leaves jurisdiction links as normal anchors without a client navigator", () => {
    mockGetAxiomStats.mockReturnValue(new Promise(() => {}));
    render(<AxiomStats />);

    const pills = within(screen.getByTestId("axiom-stats-pills"));
    const colorado = pills.getByText("Colorado").closest("a");
    expect(colorado).toHaveAttribute("href", "/us-co");
    colorado?.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(colorado!);
  });

  it("renders the three stats with compact formatting", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByText("659K")).toBeInTheDocument()
    );
    expect(screen.getByText("149K")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("provisions indexed")).toBeInTheDocument();
    expect(screen.getByText("citations extracted")).toBeInTheDocument();
    expect(screen.getByText("jurisdictions")).toBeInTheDocument();
  });

  it("shows Canada once generated navigation roots are available", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions_count: 18,
      jurisdictions: [
        ...fullPayload.jurisdictions,
        { jurisdiction: "ca", count: 2_000 },
      ],
    });
    render(<AxiomStats />);

    await waitFor(() => {
      const pills = within(screen.getByTestId("axiom-stats-pills"));
      expect(pills.getByText("Canada")).toBeInTheDocument();
    });

    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("keeps the stable jurisdiction seed when stats return a partial jurisdiction list", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions_count: 2,
      jurisdictions: [
        { jurisdiction: "us", count: 467993 },
        { jurisdiction: "us-dc", count: 130617 },
      ],
    });
    render(<AxiomStats />);

    await waitFor(() => {
      const pills = within(screen.getByTestId("axiom-stats-pills"));
      expect(
        pills.getByRole("tab", { name: /United States/i })
      ).toBeInTheDocument();
    });

    const pills = within(screen.getByTestId("axiom-stats-pills"));
    // Federal tabs surface UK, Belgium, and Canada even when the stats payload
    // omits them; state chips render inside the active US panel.
    expect(
      pills.getByRole("tab", { name: /United Kingdom/i })
    ).toBeInTheDocument();
    expect(
      pills.getByRole("tab", { name: /Canada/i })
    ).toBeInTheDocument();
    expect(
      pills.getByRole("tab", { name: /Belgium/i })
    ).toBeInTheDocument();
    expect(pills.getByText("Colorado")).toBeInTheDocument();
    expect(pills.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  it("shows Belgium sub-jurisdictions when RuleSpec counts are present", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions: [
        ...fullPayload.jurisdictions,
        { jurisdiction: "be", count: 58 },
        { jurisdiction: "be-bru", count: 12 },
        { jurisdiction: "be-vlg", count: 7 },
        { jurisdiction: "be-wal", count: 6 },
        { jurisdiction: "be-dg", count: 2 },
      ],
    });
    render(<AxiomStats />);

    const pills = within(screen.getByTestId("axiom-stats-pills"));
    await waitFor(() => {
      expect(
        pills.getByRole("tab", { name: /Belgium/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(pills.getByRole("tab", { name: /Belgium/i }));

    expect(pills.getByText("Brussels-Capital Region")).toBeInTheDocument();
    expect(pills.getByText("Flanders")).toBeInTheDocument();
    expect(pills.getByText("Wallonia")).toBeInTheDocument();
    expect(pills.getByText("German-speaking Community")).toBeInTheDocument();
    expect(
      screen.queryByText(/Belgium ingestion is pending/i)
    ).not.toBeInTheDocument();
  });

  it("does not create uncounted territory links from the static seed", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);

    await waitFor(() => {
      const pills = within(screen.getByTestId("axiom-stats-pills"));
      expect(
        pills.getByRole("tab", { name: /United States/i })
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Puerto Rico")).not.toBeInTheDocument();
  });

  it("keeps territories visible when the stats payload confirms they exist", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions: [
        ...fullPayload.jurisdictions,
        { jurisdiction: "us-pr", count: 321 },
      ],
    });
    render(<AxiomStats />);

    await waitFor(() => {
      const pills = within(screen.getByTestId("axiom-stats-pills"));
      expect(pills.getByText("Puerto Rico")).toBeInTheDocument();
    });
  });

  it("renders server-provided stats immediately without the client RPC tick", () => {
    render(<AxiomStats initialStats={fullPayload} />);

    expect(screen.getByText("659K")).toBeInTheDocument();
    expect(screen.getByText("149K")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(mockGetAxiomStats).not.toHaveBeenCalled();
  });

  it("puts the full count in the title attribute for tooltip", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByText("659K")).toBeInTheDocument()
    );
    const rulesNumber = screen.getByText("659K");
    expect(rulesNumber).toHaveAttribute("title", "658,899");
  });

  it("renders state chips and a federal open-link under the active tab", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(
        screen
          .getByTestId("axiom-stats-pills")
          .querySelector("a[title='District of Columbia — 130,617 rules']")
      ).not.toBeNull()
    );
    // Federal trio renders as tab buttons; the active selection's
    // panel renders state chips beneath plus an "Open US Federal →"
    // link so users can navigate straight to the federal corpus.
    const pills = within(screen.getByTestId("axiom-stats-pills"));
    expect(
      pills.getByRole("tab", { name: /United States/i })
    ).toBeInTheDocument();
    expect(
      pills.getByRole("tab", { name: /United Kingdom/i })
    ).toBeInTheDocument();
    expect(pills.getByText("District of Columbia")).toBeInTheDocument();
    expect(pills.getByText("New York")).toBeInTheDocument();

    // State chip anchors route to /<state-slug>.
    const stateAnchorHrefs = Array.from(
      screen
        .getByTestId("axiom-stats-pills")
        .querySelectorAll<HTMLAnchorElement>("a[href^='/us-']")
    ).map((a) => a.getAttribute("href"));
    expect(stateAnchorHrefs).toEqual(
      expect.arrayContaining(["/us-dc", "/us-ny"])
    );
    // The federal corpus card on the left of the chip wall is an
    // anchor routing to /us — the federal tab carries the same title
    // text on its button, so scope the lookup to anchors only.
    const federalCard = pills
      .getAllByTitle("US Federal — 467,993 rules")
      .find((el) => el.tagName === "A");
    expect(federalCard).toHaveAttribute("href", "/us");
  });

  it("humanizes uncurated jurisdiction labels into title case", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions: [
        ...fullPayload.jurisdictions,
        { jurisdiction: "tribal_courts", count: 12 },
      ],
    });
    render(<AxiomStats />);
    // The visible station label is humanized title-case ("Tribal
    // Courts") so the user-facing copy never shows raw slug
    // separators. The mono code chip beside it does render the raw
    // slug uppercased on purpose, so it can coexist on the same tile.
    await waitFor(() =>
      expect(screen.getByText("Tribal Courts")).toBeInTheDocument()
    );
  });

  it("shows the full label + rule count in the pill title for hover", async () => {
    mockGetAxiomStats.mockResolvedValue(fullPayload);
    render(<AxiomStats />);
    await waitFor(() =>
      expect(
        screen
          .getByTestId("axiom-stats-pills")
          .querySelector("a[title='District of Columbia — 130,617 rules']")
      ).not.toBeNull()
    );
    const dcPill = screen
      .getByTestId("axiom-stats-pills")
      .querySelector("a[title='District of Columbia — 130,617 rules']");
    expect(dcPill).not.toBeNull();
  });

  it("falls back to seeded jurisdictions when the stats payload has no jurisdiction counts", async () => {
    mockGetAxiomStats.mockResolvedValue({
      ...fullPayload,
      jurisdictions: [],
    });
    render(<AxiomStats />);
    await waitFor(() =>
      expect(screen.getByTestId("axiom-stats")).toBeInTheDocument()
    );
    const pills = within(screen.getByTestId("axiom-stats-pills"));
    expect(
      pills.getByRole("tab", { name: /United States/i })
    ).toBeInTheDocument();
    expect(
      pills.getByRole("tab", { name: /Canada/i })
    ).toBeInTheDocument();
    expect(pills.getByText("Colorado")).toBeInTheDocument();
  });

});
