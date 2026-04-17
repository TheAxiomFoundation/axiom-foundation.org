import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetRuleReferences = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getRuleReferences: (...args: unknown[]) => mockGetRuleReferences(...args),
}));

import { useRuleReferences } from "./use-rule-references";

const refRow = (overrides: Record<string, unknown>) => ({
  direction: "outgoing",
  citation_text: "42 U.S.C. 9902",
  pattern_kind: "usc",
  confidence: 1,
  start_offset: 0,
  end_offset: 10,
  other_citation_path: "us/statute/42/9902",
  other_rule_id: "x",
  other_heading: "x",
  target_resolved: true,
  ...overrides,
});

describe("useRuleReferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty arrays when citationPath is null", async () => {
    const { result } = renderHook(() => useRuleReferences(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.outgoing).toEqual([]);
    expect(result.current.incoming).toEqual([]);
    expect(mockGetRuleReferences).not.toHaveBeenCalled();
  });

  it("partitions rows by direction and sorts outgoing by start_offset", async () => {
    mockGetRuleReferences.mockResolvedValue([
      refRow({ direction: "outgoing", start_offset: 100, other_citation_path: "us/statute/26/32" }),
      refRow({ direction: "outgoing", start_offset: 10, other_citation_path: "us/statute/42/9902" }),
      refRow({ direction: "incoming", other_citation_path: "us/regulation/7/273/9" }),
    ]);
    const { result } = renderHook(() => useRuleReferences("us/statute/7/2014"));
    await waitFor(() =>
      expect(result.current.loading).toBe(false)
    );
    expect(result.current.outgoing.map((r) => r.start_offset)).toEqual([10, 100]);
    expect(result.current.incoming.map((r) => r.other_citation_path)).toEqual([
      "us/regulation/7/273/9",
    ]);
  });

  it("sorts incoming refs alphabetically by other_citation_path", async () => {
    mockGetRuleReferences.mockResolvedValue([
      refRow({ direction: "incoming", other_citation_path: "us/statute/26/32" }),
      refRow({ direction: "incoming", other_citation_path: "us/regulation/7/273/9" }),
    ]);
    const { result } = renderHook(() => useRuleReferences("us/statute/7/2014"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.incoming.map((r) => r.other_citation_path)).toEqual([
      "us/regulation/7/273/9",
      "us/statute/26/32",
    ]);
  });

  it("sets error when RPC rejects", async () => {
    mockGetRuleReferences.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useRuleReferences("us/statute/7/2014"));
    await waitFor(() => expect(result.current.error).toBe("boom"));
  });

  it("discards stale responses when the path changes mid-flight", async () => {
    let resolveFirst!: (v: unknown) => void;
    mockGetRuleReferences.mockReturnValueOnce(
      new Promise((r) => (resolveFirst = r))
    );
    mockGetRuleReferences.mockResolvedValueOnce([
      refRow({ other_citation_path: "us/statute/new/42" }),
    ]);

    const { result, rerender } = renderHook(
      ({ path }: { path: string }) => useRuleReferences(path),
      { initialProps: { path: "us/statute/old/1" } }
    );

    rerender({ path: "us/statute/new/2" });

    resolveFirst([refRow({ other_citation_path: "us/statute/old/stale" })]);

    await waitFor(() =>
      expect(result.current.outgoing[0]?.other_citation_path).toBe(
        "us/statute/new/42"
      )
    );
    expect(result.current.outgoing.map((r) => r.other_citation_path)).not.toContain(
      "us/statute/old/stale"
    );
  });
});
