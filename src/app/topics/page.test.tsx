import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TopicsIndexPage from "./page";

describe("Topics index page", () => {
  it("renders the Topics heading", () => {
    render(<TopicsIndexPage />);
    expect(
      screen.getByRole("heading", { name: "Topics", level: 1 })
    ).toBeInTheDocument();
  });

  it("links to /topics/snap", () => {
    render(<TopicsIndexPage />);
    const snapLink = screen
      .getByText("SNAP")
      .closest("a") as HTMLAnchorElement | null;
    expect(snapLink?.getAttribute("href")).toBe("/topics/snap");
  });

  it("renders a breadcrumb with Axiom linking home", () => {
    render(<TopicsIndexPage />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    const axiomLink = screen
      .getByText("Axiom")
      .closest("a") as HTMLAnchorElement | null;
    expect(axiomLink?.getAttribute("href")).toBe("/");
  });

  it("links out to the GitHub issues page for new topic requests", () => {
    render(<TopicsIndexPage />);
    const gh = screen.getByText("GitHub").closest("a") as HTMLAnchorElement | null;
    expect(gh?.getAttribute("href")).toBe(
      "https://github.com/TheAxiomFoundation/axiom-foundation.org/issues"
    );
    expect(gh?.getAttribute("target")).toBe("_blank");
  });
});
