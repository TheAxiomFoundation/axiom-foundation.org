import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import StackPage from "@/app/stack/page";

describe("StackPage", () => {
  it("renders the broader stack structure", () => {
    render(<StackPage />);

    expect(
      screen.getByRole("heading", { name: /from scraped documents to executable rules/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /layer explorer/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /runtime path/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /repository map/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open autorac system map/i })).toHaveAttribute(
      "href",
      "/autorac"
    );
  });

  it("switches layer detail panels", () => {
    render(<StackPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /normalize structure into akoma ntoso/i })
    );
    expect(screen.getAllByText(/AKN normalization/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/source\.akn/i).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: /compile, validate, test, and execute/i })
    );
    expect(screen.getAllByText(/rac\.validate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/python\/js\/rust codegen/i)).toBeInTheDocument();
  });
});
