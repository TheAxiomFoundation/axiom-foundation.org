import { render, screen } from "@testing-library/react";
import { Footer } from "../components/footer";

describe("Footer", () => {
  it("renders the logo", () => {
    render(<Footer />);
    expect(screen.getByAltText("Axiom Foundation")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<Footer />);
    expect(
      screen.getByText(/Computable law for all/),
    ).toBeInTheDocument();
  });

  it("renders all footer links", () => {
    render(<Footer />);
    expect(screen.getByText("Axiom platform")).toBeInTheDocument();
    expect(screen.getByText("Demos")).toBeInTheDocument();
    expect(screen.getByText("Validation")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("RuleSpec")).toBeInTheDocument();
    expect(screen.getByText("Encoder")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("Get updates")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("points Get updates at the provided updatesUrl", () => {
    render(<Footer updatesUrl="https://example.us1.list-manage.com/subscribe" />);
    expect(screen.getByText("Get updates")).toHaveAttribute(
      "href",
      "https://example.us1.list-manage.com/subscribe",
    );
  });

  it("applies baseUrl to internal links", () => {
    render(<Footer baseUrl="https://axiom-foundation.org" />);
    expect(screen.getByText("About")).toHaveAttribute(
      "href",
      "https://axiom-foundation.org/about",
    );
    expect(screen.getByText("Team")).toHaveAttribute(
      "href",
      "https://axiom-foundation.org/team",
    );
    expect(screen.getByText("Privacy")).toHaveAttribute(
      "href",
      "https://axiom-foundation.org/privacy",
    );
  });

  it("does not apply baseUrl to external links", () => {
    render(<Footer baseUrl="https://axiom-foundation.org" />);
    expect(screen.getByText("Contact")).toHaveAttribute(
      "href",
      "mailto:hello@axiom-foundation.org",
    );
  });

  it("uses renderLink for internal links when no baseUrl", () => {
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

    render(<Footer renderLink={TestLink} />);
    const customLinks = screen.getAllByTestId("custom-link");
    expect(customLinks.length).toBe(5); // Demos, Validation, About, Team, and Privacy
  });
});
