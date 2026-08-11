import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReceiptPaperPage from "./page";

describe("receipt working paper wrapper", () => {
  it("renders the paper headline and the manuscript embed", () => {
    render(<ReceiptPaperPage />);

    expect(
      screen.getByRole("heading", {
        name: /verifiable custody of agent-produced records/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByTitle("receipt working paper manuscript")
    ).toBeInTheDocument();
  });

  it("keeps the iframe and every manuscript link on one version param", () => {
    const { container } = render(<ReceiptPaperPage />);

    const sources = [
      container.querySelector("iframe")?.getAttribute("src"),
      ...Array.from(container.querySelectorAll("a"))
        .map((a) => a.getAttribute("href"))
        .filter((href) => href?.includes("/receipt/paper/web/")),
    ];

    expect(sources.length).toBeGreaterThanOrEqual(4);
    const versions = new Set(
      sources.map((src) => src?.split("?v=")[1] ?? "MISSING")
    );
    expect(versions.size).toBe(1);
    expect(versions.has("MISSING")).toBe(false);
  });

  it("links the package page and the repository", () => {
    render(<ReceiptPaperPage />);

    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/receipt");
    expect(hrefs).toContain("https://github.com/TheAxiomFoundation/receipt");
  });
});
