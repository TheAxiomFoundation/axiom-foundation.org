import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CitationJump } from "./citation-jump";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("CitationJump", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("navigates to the parsed citation path on submit", () => {
    render(<CitationJump />);
    const input = screen.getByLabelText("Go to citation");
    fireEvent.change(input, { target: { value: "26 USC 32(c)" } });
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).toHaveBeenCalledWith("/axiom/v2/us/statute/26/32/c");
  });

  it("marks the input invalid instead of navigating on unparseable input", () => {
    render(<CitationJump />);
    const input = screen.getByLabelText("Go to citation");
    fireEvent.change(input, { target: { value: "earned income" } });
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the invalid state when the user types again", () => {
    render(<CitationJump />);
    const input = screen.getByLabelText("Go to citation");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.submit(input.closest("form")!);
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "26 usc 32" } });
    expect(input).toHaveAttribute("aria-invalid", "false");
  });
});
