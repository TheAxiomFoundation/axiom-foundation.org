import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowseView } from "./browse-view";
import type { BrowsePageData } from "@/lib/axiom/browse-page";

function makeData(overrides: Partial<BrowsePageData> = {}): BrowsePageData {
  return {
    segments: ["us", "statute"],
    jurisdictionLabel: "US Federal",
    breadcrumbs: [
      { label: "Axiom", href: "/" },
      { label: "US Federal", href: "/us" },
      { label: "Statute", href: "/us/statute" },
    ],
    currentRule: null,
    nodes: [
      {
        segment: "7",
        label: "Title 7 — Agriculture",
        hasChildren: true,
        childCount: 12,
        nodeType: "title",
        hasRuleSpec: true,
      },
      {
        segment: "26",
        label: "Title 26 — Internal Revenue Code",
        hasChildren: true,
        nodeType: "title",
      },
    ],
    encodedCounts: {},
    hasMore: false,
    ...overrides,
  };
}

describe("BrowseView", () => {
  it("renders children as bare-path links with badges", () => {
    render(<BrowseView data={makeData()} />);
    expect(
      screen.getByText("Title 7 — Agriculture").closest("a")
    ).toHaveAttribute("href", "/us/statute/7");
    // No child-count column; encoded badge remains.
    expect(screen.queryByText("12")).not.toBeInTheDocument();
    expect(screen.getByTitle("Has RuleSpec encodings")).toBeInTheDocument();
    // Breadcrumb shows ancestors only (as links); the eyebrow repeats
    // the parent context; the current level is the H1, not a crumb.
    const crumbLink = screen
      .getAllByText("US Federal")
      .map((el) => el.closest("a"))
      .find(Boolean);
    expect(crumbLink).toHaveAttribute("href", "/us");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Statute"
    );
  });

  it("shows the empty state and the has-more note", () => {
    render(<BrowseView data={makeData({ nodes: [], hasMore: false })} />);
    expect(
      screen.getByText("Nothing has been ingested at this level yet.")
    ).toBeInTheDocument();
  });
});
