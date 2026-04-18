import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetFlows = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getJurisdictionFlows: (...args: unknown[]) => mockGetFlows(...args),
}));

import {
  CitationFlowDiagram,
  computeLayout,
  ribbonPath,
  LAYOUT,
} from "./citation-flow";
import type { JurisdictionFlow } from "@/lib/supabase";

describe("ribbonPath", () => {
  it("builds a closed cubic-bezier area path between two y-ranges", () => {
    const d = ribbonPath(100, 0, 10, 200, 50, 60);
    // Starts with Move, includes two Cubic curves, a Line across the far
    // side, closes back. Specific numbers depend on the 60% ctrl offset.
    expect(d).toMatch(/^M 100 0 C /);
    expect(d).toMatch(/Z$/);
    // Far-side line segment is present.
    expect(d).toMatch(/L 200 60/);
  });
});

describe("computeLayout", () => {
  const cross: JurisdictionFlow[] = [
    { source: "us-dc", target: "us", count: 3548 },
    { source: "us-ny", target: "us", count: 790 },
    { source: "us-ca", target: "us", count: 43 },
  ];

  it("returns source + target nodes plus one ribbon per flow", () => {
    const out = computeLayout(cross);
    const sources = out.nodes.filter((n) => n.side === "source");
    const targets = out.nodes.filter((n) => n.side === "target");
    expect(sources.map((n) => n.jurisdiction).sort()).toEqual([
      "us-ca",
      "us-dc",
      "us-ny",
    ]);
    expect(targets.map((n) => n.jurisdiction)).toEqual(["us"]);
    expect(out.ribbons).toHaveLength(3);
  });

  it("sorts source nodes DESC by total outflow", () => {
    const out = computeLayout(cross);
    const sources = out.nodes.filter((n) => n.side === "source");
    const byY = [...sources].sort((a, b) => a.y - b.y);
    expect(byY.map((n) => n.jurisdiction)).toEqual([
      "us-dc",
      "us-ny",
      "us-ca",
    ]);
  });

  it("gives bigger sources taller node heights", () => {
    const out = computeLayout(cross);
    const dc = out.nodes.find(
      (n) => n.side === "source" && n.jurisdiction === "us-dc"
    )!;
    const ca = out.nodes.find(
      (n) => n.side === "source" && n.jurisdiction === "us-ca"
    )!;
    expect(dc.height).toBeGreaterThan(ca.height);
  });

  it("floors tiny nodes at minNodeHeight", () => {
    const lopsided: JurisdictionFlow[] = [
      { source: "big", target: "us", count: 100_000 },
      { source: "tiny", target: "us", count: 1 },
    ];
    const out = computeLayout(lopsided);
    const tiny = out.nodes.find(
      (n) => n.side === "source" && n.jurisdiction === "tiny"
    )!;
    expect(tiny.height).toBeGreaterThanOrEqual(LAYOUT.minNodeHeight);
  });

  it("places source nodes on the left and targets on the right", () => {
    const out = computeLayout(cross);
    for (const n of out.nodes) {
      if (n.side === "source") {
        expect(n.x).toBe(LAYOUT.marginH);
      } else {
        expect(n.x).toBe(LAYOUT.width - LAYOUT.marginH - LAYOUT.nodeWidth);
      }
    }
  });

  it("emits one ribbon per cross-edge with the right count metadata", () => {
    const out = computeLayout(cross);
    const counts = out.ribbons.map((r) => r.count).sort((a, b) => b - a);
    expect(counts).toEqual([3548, 790, 43]);
  });
});

describe("CitationFlowDiagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while the RPC is loading", () => {
    mockGetFlows.mockReturnValue(new Promise(() => {}));
    const { container } = render(<CitationFlowDiagram />);
    expect(container.querySelector("[data-testid='citation-flow']")).toBeNull();
  });

  it("renders nothing when only self-citations exist", async () => {
    mockGetFlows.mockResolvedValue([
      { source: "us", target: "us", count: 100 },
      { source: "us-dc", target: "us-dc", count: 50 },
    ]);
    const { container } = render(<CitationFlowDiagram />);
    await waitFor(() => expect(mockGetFlows).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector("[data-testid='citation-flow']")).toBeNull();
  });

  it("renders the diagram, title, and one ribbon per cross-flow", async () => {
    mockGetFlows.mockResolvedValue([
      { source: "us", target: "us", count: 100 }, // self — excluded
      { source: "us-dc", target: "us", count: 30 },
      { source: "us-ny", target: "us", count: 10 },
    ]);
    const { container } = render(<CitationFlowDiagram />);
    await waitFor(() =>
      expect(screen.getByTestId("citation-flow")).toBeInTheDocument()
    );
    expect(
      screen.getByText("Cross-jurisdictional citations")
    ).toBeInTheDocument();
    // Two ribbons (for the two cross-flows) rendered as <path>s.
    const paths = container.querySelectorAll("svg path");
    expect(paths).toHaveLength(2);
  });

  it("labels source and target nodes with their display code + total", async () => {
    mockGetFlows.mockResolvedValue([
      { source: "us-dc", target: "us", count: 42 },
    ]);
    render(<CitationFlowDiagram />);
    await waitFor(() =>
      expect(screen.getByTestId("citation-flow")).toBeInTheDocument()
    );
    expect(screen.getByText(/^DC · 42$/)).toBeInTheDocument();
    // Target is the federal layer — uses the combined label.
    expect(screen.getByText(/^USC\+CFR · 42$/)).toBeInTheDocument();
  });
});
