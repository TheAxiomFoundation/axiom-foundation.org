import { render, screen, fireEvent } from "@testing-library/react";
import { Nav } from "../components/nav";

describe("Nav", () => {
  it("renders all default navigation links", () => {
    render(<Nav />);
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText(".yaml")).toBeInTheDocument();
    expect(screen.getByText("AutoRuleSpec")).toBeInTheDocument();
    expect(screen.getByText("Spec")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
  });

  it("renders the Axiom Foundation logo", () => {
    render(<Nav />);
    expect(screen.getByAltText("Axiom Foundation")).toBeInTheDocument();
  });

  it("gives the desktop GitHub icon link an accessible name", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/TheAxiomFoundation",
    );
  });

  it("applies baseUrl to links", () => {
    render(<Nav baseUrl="https://axiom-foundation.org" />);
    const browseLink = screen.getAllByText("Browse")[0];
    expect(browseLink).toHaveAttribute(
      "href",
      "https://app.axiom-foundation.org",
    );
  });

  it("highlights active link based on pathname", () => {
    render(<Nav pathname="/about" />);
    const browseLinks = screen.getAllByText("About");
    // Desktop link should have opacity-100 (active)
    expect(browseLinks[0].className).toContain("opacity-100");
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
