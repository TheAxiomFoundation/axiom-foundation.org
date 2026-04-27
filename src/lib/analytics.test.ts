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

import { trackAtlasEvent } from "./analytics";

describe("trackAtlasEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call posthog.capture when POSTHOG_KEY is not set", () => {
    trackAtlasEvent("atlas_rule_viewed", {
      citation_path: "us/statute/26/1",
      jurisdiction: "us",
      has_rulespec: false,
    });
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("exports trackAtlasEvent as a function", () => {
    expect(typeof trackAtlasEvent).toBe("function");
  });
});
