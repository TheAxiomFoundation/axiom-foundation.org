import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExpandableCode } from "./expandable-code";

// Generate a ``code`` string with N lines so we can push the block
// over the expand chrome's line threshold without pasting a giant
// fixture.
function code(lines: number): string {
  return Array.from({ length: lines }, (_, i) => `line ${i}`).join("\n");
}

describe("ExpandableCode inline", () => {
  it("renders the code inline with an Expand button that shows the line count", () => {
    render(
      <ExpandableCode code={code(25)} language="yaml" label="foo.yaml" />
    );
    const btn = screen.getByRole("button", { name: /Expand · 25 lines/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-haspopup", "dialog");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the code (as before) even for very short snippets", () => {
    render(<ExpandableCode code="short" language="yaml" />);
    expect(screen.getByText("short")).toBeInTheDocument();
  });
});

describe("ExpandableCode overlay", () => {
  it("opens a dialog when the Expand button is clicked", () => {
    render(
      <ExpandableCode
        code={code(50)}
        language="yaml"
        label="us/statute/26/32.yaml"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Expand/i }));
    const dialog = screen.getByRole("dialog", { name: /expanded view/i });
    expect(dialog).toBeInTheDocument();
    // Header includes label + line count
    expect(screen.getByText("us/statute/26/32.yaml")).toBeInTheDocument();
    expect(screen.getByText("50 lines")).toBeInTheDocument();
  });

  it("closes when the Escape key is pressed", () => {
    render(<ExpandableCode code={code(50)} language="yaml" />);
    fireEvent.click(screen.getByRole("button", { name: /Expand/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes when the backdrop is clicked", () => {
    const { container } = render(
      <ExpandableCode code={code(50)} language="yaml" />
    );
    fireEvent.click(screen.getByRole("button", { name: /Expand/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The backdrop sits as the first absolutely-positioned sibling
    // inside the dialog and carries aria-hidden.
    const backdrop = container.querySelector(
      '[role="dialog"] [aria-hidden="true"]'
    ) as HTMLElement | null;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on the explicit Close button", () => {
    render(<ExpandableCode code={code(50)} language="yaml" />);
    fireEvent.click(screen.getByRole("button", { name: /Expand/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /close expanded view/i })
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("scroll-locks the body while open and restores on close", () => {
    render(<ExpandableCode code={code(50)} language="yaml" />);
    fireEvent.click(screen.getByRole("button", { name: /Expand/i }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("uses a default label when none is provided", () => {
    render(<ExpandableCode code={code(30)} language="yaml" />);
    fireEvent.click(screen.getByRole("button", { name: /Expand/i }));
    // eyebrow still renders
    expect(screen.getByText(/RuleSpec encoding/i)).toBeInTheDocument();
  });
});
