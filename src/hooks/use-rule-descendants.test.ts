import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetDescendants } = vi.hoisted(() => ({
  mockGetDescendants: vi.fn(),
}));

vi.mock("@/lib/axiom/rule-tree", () => ({
  getRuleDescendants: mockGetDescendants,
}));

import { useRuleDescendants } from "./use-rule-descendants";

describe("useRuleDescendants", () => {
  beforeEach(() => {
    mockGetDescendants.mockReset();
  });

  it("returns empty immediately when ruleId is null", () => {
    const { result } = renderHook(() => useRuleDescendants(null));
    expect(result.current.descendants).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockGetDescendants).not.toHaveBeenCalled();
  });

  it("fetches and returns descendants on mount", async () => {
    mockGetDescendants.mockResolvedValue([
      { id: "a" },
      { id: "b" },
    ]);
    const { result } = renderHook(() => useRuleDescendants("rule-1"));
    await waitFor(() =>
      expect(result.current.descendants.length).toBe(2)
    );
    expect(mockGetDescendants).toHaveBeenCalledWith("rule-1");
    expect(result.current.loading).toBe(false);
  });

  it("drops the descendants list on rejected fetch rather than surfacing stale data", async () => {
    mockGetDescendants.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useRuleDescendants("rule-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.descendants).toEqual([]);
  });
});
