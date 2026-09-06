import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

/**
 * Rendered-landing guard for a country the repo map knows but the
 * encoding read list excludes (today: Israel, whose ``rulespec-il``
 * pilot carries ``app_visibility = "experimental"``).
 *
 * Deliberately uses the REAL jurisdictions seed, the REAL landing
 * filter, and the REAL repo map — the defect this pins was invisible
 * to seed-level tests. ``RULESPEC_COUNTRY_SLUGS`` was derived from the
 * read list, so Israel never reached the country row: it rendered as a
 * disabled, unlabelled "IL Israel" chip in the anonymous "Other"
 * section, with no pending text and no tooltip.
 */
vi.mock("@/lib/supabase", () => ({
  getAxiomStats: vi.fn(),
}));

// The chips use next/link; a plain anchor keeps hrefs in the DOM.
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

import { AxiomStats } from "./axiom-stats";

/**
 * Populated US stats and no Israel rows — the state the landing is
 * actually in while the pilot is encoding.
 */
const US_STATS_NO_ISRAEL = {
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

const PILOT_TOOLTIP =
  "Israel — pilot encoding in progress, not yet published to the app";

function renderLanding() {
  render(<AxiomStats initialStats={US_STATS_NO_ISRAEL} />);
  return within(screen.getByTestId("axiom-stats-pills"));
}

describe("landing presentation for a country outside the read list", () => {
  it("renders Israel as a country tab marked pending, not an Other chip", () => {
    const pills = renderLanding();

    const israel = pills.getByRole("tab", { name: /Israel/i });
    expect(israel).toHaveTextContent("Israel");
    expect(israel).toHaveTextContent("pilot · pending");
    expect(israel).toHaveAttribute("title", PILOT_TOOLTIP);

    // The country row is the tablist; "Other" is the fallback chip
    // section this used to land in.
    expect(
      within(
        screen.getByRole("tablist", { name: /Federal & national/i })
      ).getByRole("tab", { name: /Israel/i })
    ).toBe(israel);
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });

  it("keeps the other country tabs and their counts intact", () => {
    const pills = renderLanding();

    for (const country of [
      /United States/i,
      /United Kingdom/i,
      /Belgium/i,
      /Canada/i,
      /New Zealand/i,
    ]) {
      expect(pills.getByRole("tab", { name: country })).toBeInTheDocument();
    }
    expect(
      pills.getByRole("tab", { name: /United States/i })
    ).toHaveAttribute("title", "United States — 625,248 rules total");
  });

  it("says why Israel is empty when its tab is opened", () => {
    const pills = renderLanding();

    fireEvent.click(pills.getByRole("tab", { name: /Israel/i }));

    expect(
      pills.getByText(
        /Israel is a pilot encoding in progress — nothing is published to the app yet\./
      )
    ).toBeInTheDocument();
    // The country's own corpus card stays non-clickable and carries
    // the same honest tooltip.
    const card = pills.getAllByTitle(PILOT_TOOLTIP).find(
      (el) => el.getAttribute("aria-disabled") === "true"
    );
    expect(card).toBeDefined();
    expect(pills.queryByRole("link", { name: /Israel/i })).toBeNull();
  });

  it("keeps Illinois a US state chip, distinct from Israel", () => {
    // ``il`` is Israel; ``us-il`` is Illinois. A prefix mix-up here
    // would collapse the two onto one tile.
    const pills = renderLanding();

    const illinois = pills.getByText("Illinois");
    expect(illinois).toBeInTheDocument();
    expect(illinois.closest("[role='tab']")).toBeNull();
    expect(pills.getByRole("tab", { name: /Israel/i })).not.toContainElement(
      illinois
    );
  });
});
