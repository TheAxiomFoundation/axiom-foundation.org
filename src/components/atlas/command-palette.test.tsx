import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const { mockSearchRules } = vi.hoisted(() => ({
  mockSearchRules: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  searchRules: (...args: unknown[]) => mockSearchRules(...args),
}));

import { CommandPalette } from "./command-palette";

describe("CommandPalette", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSearchRules.mockReset();
    mockSearchRules.mockResolvedValue([]);
    // jsdom doesn't implement scrollIntoView; stub it so the
    // cursor-follows-selection effect doesn't blow up.
    (Element.prototype as unknown as {
      scrollIntoView: () => void;
    }).scrollIntoView = () => {};
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <CommandPalette open={false} onClose={vi.fn()} />
    );
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("renders the dialog and input when open", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("shows the empty-state hint when query is empty", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(
      screen.getByText(/Type a citation to jump directly/i)
    ).toBeInTheDocument();
  });

  it("shows a citation row when the input parses as a citation", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "26 USC 32(b)(1)" } });
    expect(screen.getByText("Citation")).toBeInTheDocument();
    expect(screen.getByText("26 U.S.C. § 32(b)(1)")).toBeInTheDocument();
    expect(screen.getByText("us/statute/26/32/b/1")).toBeInTheDocument();
  });

  it("shows program anchors when the input matches a program", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "SNAP" } });
    expect(screen.getByText("Programs")).toBeInTheDocument();
    // The program name appears on every anchor row; at least one row.
    expect(
      screen.getAllByText("Supplemental Nutrition Assistance Program")
        .length
    ).toBeGreaterThan(0);
    // At least one anchor label appears — "Standard deduction" per seed
    expect(screen.getByText("Standard deduction")).toBeInTheDocument();
  });

  it("routes to citation_path when Enter is pressed on a parsed citation", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "26 USC 32" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/atlas/us/statute/26/32");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("moves the cursor with ArrowDown", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "SNAP" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    // The second option should be aria-selected after one ArrowDown.
    const selected = dialog.querySelectorAll("[aria-selected='true']");
    expect(selected.length).toBe(1);
  });

  it("falls back to full-text search for free-text queries", async () => {
    mockSearchRules.mockResolvedValue([
      {
        id: "r1",
        jurisdiction: "us",
        doc_type: "statute",
        citation_path: "us/statute/26/1",
        heading: "Tax imposed",
        snippet: "hits",
        has_rac: true,
        rank: 1,
      },
    ]);
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "tax imposed" } });
    await waitFor(() => expect(mockSearchRules).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByText("Search")).toBeInTheDocument()
    );
    expect(screen.getByText("Tax imposed")).toBeInTheDocument();
  });
});
