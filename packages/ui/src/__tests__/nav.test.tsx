import { render, screen, fireEvent } from "@testing-library/react";
import { Nav } from "../components/nav";

describe("Nav", () => {
  it("renders the full launch navigation links (pages only, no scroll anchors)", () => {
    render(<Nav />);
    expect(screen.getAllByText("Axiom")[0]).toHaveAttribute(
      "href",
      "https://app.axiom-foundation.org",
    );
    expect(screen.getAllByText("What's possible").length).toBeGreaterThan(0);
    // The preview surface carries a small beta tag.
    expect(screen.getAllByText("beta")[0].tagName).toBe("SUP");
    expect(screen.getAllByText("Validation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("About").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Team").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Docs").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "GitHub" }).length,
    ).toBeGreaterThan(0);
    // Landing scroll anchors live on the page, not in the header.
    expect(screen.queryByText("Why")).not.toBeInTheDocument();
    expect(screen.queryByText("Encoding")).not.toBeInTheDocument();
  });

  it("renders the demos dropdown grouped by stakeholder", () => {
    render(<Nav />);
    // Group headers mirror the demo-gallery taxonomy in axiom-demo-shell.
    expect(screen.getAllByText("Builders").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI labs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Government").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Small company checker")[0].closest("a"),
    ).toHaveAttribute("href", "/demos#reg-demo");
    expect(
      screen.getAllByText("Grounded benefits assistant")[0].closest("a"),
    ).toHaveAttribute("href", "/demos#finbot");
    expect(
      screen.getAllByText("Colorado SNAP cliffs")[0].closest("a"),
    ).toHaveAttribute("href", "/demos#co-snap-cliffs");
    expect(screen.getAllByText("All demos")[0].closest("a")).toHaveAttribute(
      "href",
      "/demos",
    );
  });

  it("renders the Axiom Foundation logo", () => {
    render(<Nav />);
    expect(screen.getByAltText("Axiom Foundation")).toBeInTheDocument();
  });

  it("applies baseUrl to links", () => {
    render(<Nav baseUrl="https://axiom-foundation.org" />);
    expect(screen.getAllByText("About")[0]).toHaveAttribute(
      "href",
      "https://axiom-foundation.org/about",
    );
    expect(screen.getAllByText("Team")[0]).toHaveAttribute(
      "href",
      "https://axiom-foundation.org/team",
    );
  });

  it("highlights active link based on pathname", () => {
    render(<Nav pathname="/about" />);
    const browseLinks = screen.getAllByText("About");
    // Desktop link should have the persistent-underline active class
    expect(browseLinks[0].className).toContain("is-active");
  });

  it("toggles mobile menu on hamburger click", () => {
    render(<Nav />);
    const hamburger = screen.getByLabelText("Open menu");
    expect(hamburger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(hamburger);
    expect(screen.getByLabelText("Close menu")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("renders extra links when provided", () => {
    render(
      <Nav extraLinks={[{ href: "/proposal", label: "Proposal" }]} />,
    );
    expect(screen.getAllByText("Proposal").length).toBeGreaterThan(0);
  });

  it("uses renderLink for internal navigation", () => {
    function TestLink({
      href,
      children,
      className,
    }: {
      href: string;
      children: React.ReactNode;
      className?: string;
    }) {
      return (
        <a href={href} className={className} data-testid="custom-link">
          {children}
        </a>
      );
    }

    render(<Nav renderLink={TestLink} pathname="/about" />);
    const customLinks = screen.getAllByTestId("custom-link");
    expect(customLinks.length).toBeGreaterThan(0);
  });

  it("uses plain <a> with absolute URLs when baseUrl is set", () => {
    render(<Nav baseUrl="https://axiom-foundation.org" />);
    const aboutLink = screen.getAllByText("About")[0];
    expect(aboutLink.tagName).toBe("A");
    expect(aboutLink).toHaveAttribute(
      "href",
      "https://axiom-foundation.org/about",
    );
  });
});
