import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import DocsPage from "@/app/docs/page";

describe("DocsPage", () => {
  it("renders the documentation ownership model", () => {
    render(<DocsPage />);

    expect(
      screen.getByRole("heading", {
        name: /docs live with the system that enforces them/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/docs live in the repo that owns the code or contract/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("axiom-corpus").length).toBeGreaterThan(0);
    expect(screen.getAllByText("axiom-encode").length).toBeGreaterThan(0);
  });

  it("no longer indexes the per-repo doc links (Documentation homes removed)", () => {
    render(<DocsPage />);
    expect(
      screen.queryByRole("heading", { name: /documentation homes/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /signed corpus releases/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /oracle adapters/i })
    ).not.toBeInTheDocument();
    // The internal lab notebook stays in the repo, not on the index.
    expect(screen.queryByText(/methods log/i)).not.toBeInTheDocument();
  });

  it("renders the pipeline strip natively — no architecture iframe", () => {
    render(<DocsPage />);
    expect(screen.queryByTitle("Cross-system architecture map")).toBeNull();
    expect(
      screen.getByRole("heading", { name: /^the architecture$/i })
    ).toBeInTheDocument();
    // The strip mounts client-side (jsdom runs effects, so it's here).
    expect(
      screen.getByRole("img", { name: /five equal stations/i })
    ).toBeInTheDocument();
  });

  it("links to related maps", () => {
    render(<DocsPage />);

    expect(
      screen.getByRole("link", { name: /technical stack/i })
    ).toHaveAttribute("href", "/stack");
    expect(
      screen.getByRole("link", { name: /encoder system map/i })
    ).toHaveAttribute("href", "/encoder");
  });
});
