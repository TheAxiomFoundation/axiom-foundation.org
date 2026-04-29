import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { mockGetSiblings } = vi.hoisted(() => ({
  mockGetSiblings: vi.fn(),
}));

vi.mock("@/lib/axiom/resolver", () => ({
  getSiblings: mockGetSiblings,
}));

import type { Rule } from "@/lib/supabase";

let SiblingStrip: (typeof import("./sibling-strip"))["SiblingStrip"];

function r(citationPath: string, id = citationPath): Rule {
  return {
    id,
    jurisdiction: "us",
    doc_type: "statute",
    parent_id: "p1",
    level: 2,
    ordinal: parseInt(citationPath.split("/").pop() || "0", 10) || 0,
    heading: null,
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: null,
    citation_path: citationPath,
    rulespec_path: null,
    has_rulespec: false,
    created_at: "",
    updated_at: "",
  };
}

describe("SiblingStrip", () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ SiblingStrip } = await import("./sibling-strip"));
    mockPush.mockReset();
    mockGetSiblings.mockReset();
  });

  it("renders nothing when there are fewer than two siblings", async () => {
    mockGetSiblings.mockResolvedValue([r("us/statute/26/32")]);
    const { container } = render(<SiblingStrip rule={r("us/statute/26/32")} />);
    await waitFor(() => expect(mockGetSiblings).toHaveBeenCalled());
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders a sibling strip with the current rule highlighted", async () => {
    const siblings = [
      r("us/statute/26/30"),
      r("us/statute/26/31"),
      r("us/statute/26/32"),
      r("us/statute/26/33"),
    ];
    mockGetSiblings.mockResolvedValue(siblings);
    render(<SiblingStrip rule={r("us/statute/26/32")} />);
    await waitFor(() =>
      expect(screen.getByRole("navigation")).toBeInTheDocument()
    );
    const current = screen
      .getAllByText("§ 32")
      .find((el) => el.getAttribute("aria-current") === "true");
    expect(current).toBeDefined();
    expect(screen.getByText(/3 of 4/)).toBeInTheDocument();
  });

  it("navigates to the next sibling on ArrowRight", async () => {
    const siblings = [r("us/statute/26/32"), r("us/statute/26/33")];
    mockGetSiblings.mockResolvedValue(siblings);
    render(<SiblingStrip rule={r("us/statute/26/32")} />);
    await waitFor(() =>
      expect(screen.getByRole("navigation")).toBeInTheDocument()
    );
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/us/statute/26/33")
    );
  });

  it("navigates to the previous sibling on ArrowLeft", async () => {
    const siblings = [r("us/statute/26/32"), r("us/statute/26/33")];
    mockGetSiblings.mockResolvedValue(siblings);
    render(<SiblingStrip rule={r("us/statute/26/33")} />);
    await waitFor(() =>
      expect(screen.getByRole("navigation")).toBeInTheDocument()
    );
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/us/statute/26/32")
    );
  });

  it("ignores arrow keys when an input is focused", async () => {
    const siblings = [r("us/statute/26/32"), r("us/statute/26/33")];
    mockGetSiblings.mockResolvedValue(siblings);
    render(
      <>
        <input data-testid="typing" />
        <SiblingStrip rule={r("us/statute/26/32")} />
      </>
    );
    await waitFor(() =>
      expect(screen.getByRole("navigation")).toBeInTheDocument()
    );
    const input = screen.getByTestId("typing");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignores modified arrow keys (e.g. ⌘←)", async () => {
    const siblings = [r("us/statute/26/32"), r("us/statute/26/33")];
    mockGetSiblings.mockResolvedValue(siblings);
    render(<SiblingStrip rule={r("us/statute/26/32")} />);
    await waitFor(() =>
      expect(screen.getByRole("navigation")).toBeInTheDocument()
    );
    fireEvent.keyDown(window, { key: "ArrowRight", metaKey: true });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows overflow indicators when there are many siblings", async () => {
    const siblings = Array.from({ length: 12 }, (_, i) =>
      r(`us/statute/26/${i + 1}`, `r${i}`)
    );
    mockGetSiblings.mockResolvedValue(siblings);
    render(<SiblingStrip rule={r("us/statute/26/6", "r5")} />);
    await waitFor(() =>
      expect(screen.getByRole("navigation")).toBeInTheDocument()
    );
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it("degrades gracefully when getSiblings rejects", async () => {
    mockGetSiblings.mockRejectedValue(new Error("boom"));
    const { container } = render(<SiblingStrip rule={r("us/statute/26/32")} />);
    await waitFor(() => expect(mockGetSiblings).toHaveBeenCalled());
    // No nav is rendered — the page does not crash.
    expect(container.querySelector("nav")).toBeNull();
  });
});
