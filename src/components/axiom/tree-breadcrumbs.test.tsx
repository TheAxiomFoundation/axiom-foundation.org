import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { TreeBreadcrumbs } from "./tree-breadcrumbs";

describe("TreeBreadcrumbs", () => {
  it("returns null for empty items", () => {
    const { container } = render(<TreeBreadcrumbs items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders single item as non-link (current page)", () => {
    render(
      <TreeBreadcrumbs items={[{ label: "Axiom", href: "/" }]} />
    );
    expect(screen.getByText("Axiom")).toBeInTheDocument();
    expect(screen.getByText("Axiom").closest("a")).toBeNull();
  });

  it("renders Axiom as a link when followed by other items", () => {
    render(
      <TreeBreadcrumbs
        items={[
          { label: "Axiom", href: "/" },
          { label: "United States", href: "/us" },
        ]}
      />
    );
    const axiomLink = screen.getByText("Axiom").closest("a");
    expect(axiomLink).not.toBeNull();
    expect(axiomLink?.getAttribute("href")).toBe("/");

    // Last item is not a link
    expect(screen.getByText("United States").closest("a")).toBeNull();
  });

  it("renders separator slashes between items", () => {
    render(
      <TreeBreadcrumbs
        items={[
          { label: "Axiom", href: "/" },
          { label: "US", href: "/us" },
          { label: "Statutes", href: "/us/statute" },
        ]}
      />
    );
    const slashes = screen.getAllByText("/");
    expect(slashes).toHaveLength(2);
  });

  it("renders full path with last item not linked", () => {
    render(
      <TreeBreadcrumbs
        items={[
          { label: "Axiom", href: "/" },
          { label: "US", href: "/us" },
          { label: "Title 26", href: "/us/statute/26" },
        ]}
      />
    );
    expect(screen.getByText("Axiom").closest("a")).not.toBeNull();
    expect(screen.getByText("US").closest("a")).not.toBeNull();
    expect(screen.getByText("Title 26").closest("a")).toBeNull();
  });
});
