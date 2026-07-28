import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RunSample, _resetAttemptedRuns } from "./run-sample";
import { TraceProvider } from "./trace-context";

const PROGRAM = {
  jurisdiction: "us-co",
  programId: "co-snap",
  mode: "compiled" as const,
  status: "ready" as const,
  ruleCount: 6,
  anchors: ["a"],
  ruleNames: ["snap_allotment"],
};

describe("RunSample", () => {
  beforeEach(() => {
    _resetAttemptedRuns();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          outputs: { snap_benefit_amount: 298, snap_eligible: true },
          trace: [
            {
              rule_id: "snap_net_income",
              variable: "snap_benefit_amount",
              value: 298,
              sources: ["us:statutes/7/2017/a#snap_regular_month_allotment"],
            },
          ],
          period: "2026-01",
          sample: true,
        }),
      })
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("renders nothing without a ?run= permalink — no inline run button", () => {
    window.history.replaceState({}, "", "/us/statute/7/2017");
    const { container } = render(
      <TraceProvider>
        <RunSample programs={[PROGRAM]} sectionFocus="us:statutes/7/2017" />
      </TraceProvider>
    );
    expect(container.innerHTML).toBe("");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("executes a ?run= permalink and renders outputs with section markers", async () => {
    window.history.replaceState(
      {},
      "",
      "/us/statute/7/2017?run=us-co/co-snap"
    );
    render(
      <TraceProvider>
        <RunSample programs={[PROGRAM]} sectionFocus="us:statutes/7/2017" />
      </TraceProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("run-sample-result")).toBeInTheDocument()
    );
    expect(screen.getByText("298")).toBeInTheDocument();
    expect(screen.getByText("yes")).toBeInTheDocument();
    expect(
      screen.getByTitle("Computed by rules from this section")
    ).toBeInTheDocument();
    const [call] = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(JSON.parse(call[1].body)).toEqual({
      jurisdiction: "us-co",
      program_id: "co-snap",
      section_rules: [],
    });
  });

  it("shows a failure note when a permalink run errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 })
    );
    window.history.replaceState(
      {},
      "",
      "/us/statute/7/2017?run=us-co/co-snap"
    );
    render(
      <TraceProvider>
        <RunSample programs={[PROGRAM]} sectionFocus={null} />
      </TraceProvider>
    );
    await waitFor(() =>
      expect(
        screen.getByText("run failed — engine unavailable")
      ).toBeInTheDocument()
    );
  });
});
