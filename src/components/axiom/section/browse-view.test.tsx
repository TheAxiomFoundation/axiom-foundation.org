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
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByTitle("Has RuleSpec encodings")).toBeInTheDocument();
    // Breadcrumb ancestors are links; the leaf is the current page.
    expect(screen.getByText("US Federal").closest("a")).toHaveAttribute(
      "href",
      "/us"
    );
  });

  it("shows the empty state and the has-more note", () => {
    render(<BrowseView data={makeData({ nodes: [], hasMore: false })} />);
    expect(
      screen.getByText("Nothing has been ingested at this level yet.")
    ).toBeInTheDocument();
  });
});
