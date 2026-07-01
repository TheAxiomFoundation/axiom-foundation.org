import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
const mockOpen = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock("./command-palette-provider", () => ({
  useCommandPalette: () => ({ open: mockOpen, close: vi.fn() }),
}));

import { HeroSearchBar } from "./hero-search-bar";

describe("HeroSearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to the full search page with the query on submit", () => {
    render(<HeroSearchBar />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "colorado snap deduction" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith(
      "/axiom/search?q=colorado%20snap%20deduction"
    );
  });

  it("does not navigate on an empty query", () => {
    render(<HeroSearchBar />);
    fireEvent.submit(screen.getByRole("searchbox").closest("form")!);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to the full search page when a suggestion is clicked", () => {
    render(<HeroSearchBar />);
    fireEvent.click(
      screen.getByRole("button", { name: "colorado snap deduction" })
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/axiom/search?q=colorado%20snap%20deduction"
    );
  });

  it("opens the command palette from the shortcut chip", () => {
    render(<HeroSearchBar />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open quick-jump palette" })
    );
    expect(mockOpen).toHaveBeenCalled();
  });
});
