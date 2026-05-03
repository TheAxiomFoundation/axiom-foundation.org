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
        name: /canonical docs live with the system that enforces them/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /documentation homes/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/repo-owned engineering docs/i)).toBeInTheDocument();
    expect(screen.getByText("axiom-corpus")).toBeInTheDocument();
    expect(screen.getAllByText("axiom-encode").length).toBeGreaterThan(0);
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
