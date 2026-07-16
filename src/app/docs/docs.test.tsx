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
      screen.getByRole("heading", { name: /documentation homes/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/docs live in the repo that owns the code or contract/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("axiom-corpus").length).toBeGreaterThan(0);
    expect(screen.getAllByText("axiom-encode").length).toBeGreaterThan(0);
  });

  it("indexes the canonical docs across the pipeline", () => {
    render(<DocsPage />);
    expect(
      screen.getByRole("link", { name: /signed corpus releases/i })
    ).toHaveAttribute(
      "href",
      "https://github.com/TheAxiomFoundation/axiom-corpus/blob/main/docs/named-release-publication.md"
    );
    expect(
      screen.getByRole("link", { name: /the rulespec schema/i })
    ).toHaveAttribute(
      "href",
      "https://github.com/TheAxiomFoundation/axiom-rules-engine/blob/main/docs/rulespec.md"
    );
    expect(
      screen.getByRole("link", { name: /source claims format/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /bitemporal semantics/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /jurisdiction repositories/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /oracle adapters/i })
    ).toHaveAttribute("href", "https://github.com/TheAxiomFoundation/axiom-oracles");
    // The internal lab notebook stays in the repo, not on the index.
    expect(screen.queryByText(/methods log/i)).not.toBeInTheDocument();
  });

  it("embeds the live architecture map", () => {
    render(<DocsPage />);
    expect(
      screen.getByTitle("Cross-system architecture map")
    ).toHaveAttribute("src", "https://axiom-architecture-one.vercel.app");
  });

  it("links to canonical repo docs and related maps", () => {
    render(<DocsPage />);

    expect(
      screen.getByRole("link", { name: /rulespec proof validation/i })
    ).toHaveAttribute(
      "href",
      "https://github.com/TheAxiomFoundation/axiom-encode/blob/main/docs/rulespec-proof-validation.md"
    );
    expect(
      screen.getByRole("link", { name: /technical stack/i })
    ).toHaveAttribute("href", "/stack");
    expect(
      screen.getByRole("link", { name: /encoder system map/i })
    ).toHaveAttribute("href", "/encoder");
  });
});
