import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackAxiomEvent: mockTrack }));

import { TrackView } from "./track-view";

describe("TrackView", () => {
  beforeEach(() => mockTrack.mockClear());

  it("fires the event once on mount, not again on re-render", () => {
    const { rerender } = render(
      <TrackView
        event="axiom_tree_navigated"
        properties={{ depth: 2, segment: "statute" }}
      />
    );
    rerender(
      <TrackView
        event="axiom_tree_navigated"
        properties={{ depth: 2, segment: "statute" }}
      />
    );
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("axiom_tree_navigated", {
      depth: 2,
      segment: "statute",
    });
  });

  it("fires again when the payload changes (client-side navigation)", () => {
    const { rerender } = render(
      <TrackView
        event="axiom_tree_navigated"
        properties={{ depth: 2, segment: "statute" }}
      />
    );
    rerender(
      <TrackView
        event="axiom_tree_navigated"
        properties={{ depth: 3, segment: "26" }}
      />
    );
    expect(mockTrack).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenLastCalledWith("axiom_tree_navigated", {
      depth: 3,
      segment: "26",
    });
  });
});
