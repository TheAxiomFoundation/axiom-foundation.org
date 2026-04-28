import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCapture } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: mockCapture,
  },
}));

import { trackAxiomEvent } from "./analytics";

describe("trackAxiomEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call posthog.capture when POSTHOG_KEY is not set", () => {
    trackAxiomEvent("axiom_rule_viewed", {
      citation_path: "us/statute/26/1",
      jurisdiction: "us",
      has_rulespec: false,
    });
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("exports trackAxiomEvent as a function", () => {
    expect(typeof trackAxiomEvent).toBe("function");
  });
});
