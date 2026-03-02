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
      <TreeBreadcrumbs items={[{ label: "Atlas", href: "/atlas" }]} />
    );
    expect(screen.getByText("Atlas")).toBeInTheDocument();
    expect(screen.getByText("Atlas").closest("a")).toBeNull();
  });

  it("renders Atlas as a link when followed by other items", () => {
    render(
      <TreeBreadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "United States", href: "/atlas/us" },
        ]}
      />
    );
    const atlasLink = screen.getByText("Atlas").closest("a");
    expect(atlasLink).not.toBeNull();
    expect(atlasLink?.getAttribute("href")).toBe("/atlas");

    // Last item is not a link
    expect(screen.getByText("United States").closest("a")).toBeNull();
  });

  it("renders separator slashes between items", () => {
    render(
      <TreeBreadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "US", href: "/atlas/us" },
          { label: "Statutes", href: "/atlas/us/statute" },
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
          { label: "Atlas", href: "/atlas" },
          { label: "US", href: "/atlas/us" },
          { label: "Title 26", href: "/atlas/us/statute/26" },
        ]}
      />
    );
    expect(screen.getByText("Atlas").closest("a")).not.toBeNull();
    expect(screen.getByText("US").closest("a")).not.toBeNull();
    expect(screen.getByText("Title 26").closest("a")).toBeNull();
  });
});
