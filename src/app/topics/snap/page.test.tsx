import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SnapTopicPage from "./page";

describe("SNAP topic page", () => {
  it("renders the program title and description", () => {
    render(<SnapTopicPage />);
    expect(
      screen.getByRole("heading", {
        name: /Supplemental Nutrition Assistance Program/i,
      })
    ).toBeInTheDocument();
  });

  it("links to the 7 USC Chapter 51 statutes", () => {
    render(<SnapTopicPage />);
    expect(screen.getByText("§ 2014")).toBeInTheDocument();
    expect(screen.getByText("Eligible households")).toBeInTheDocument();
    const link = screen
      .getByText("§ 2014")
      .closest("a") as HTMLAnchorElement | null;
    expect(link?.getAttribute("href")).toBe("/atlas/us/statute/7/2014");
  });

  it("links to the 7 CFR regulation parts", () => {
    render(<SnapTopicPage />);
    expect(screen.getByText("Part 273")).toBeInTheDocument();
    const link = screen
      .getByText("Part 273")
      .closest("a") as HTMLAnchorElement | null;
    expect(link?.getAttribute("href")).toBe("/atlas/us/regulation/7/273");
  });

  it("surfaces key 7 CFR 273 sections", () => {
    render(<SnapTopicPage />);
    const link = screen
      .getByText("§ 273.9")
      .closest("a") as HTMLAnchorElement | null;
    expect(link?.getAttribute("href")).toBe("/atlas/us/regulation/7/273/9");
  });

  it("links out to state and federal guidance sources with external markers", () => {
    render(<SnapTopicPage />);
    const link = screen
      .getByText("Texas Works Handbook")
      .closest("a") as HTMLAnchorElement | null;
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("href")).toContain("hhs.texas.gov");
  });
});
