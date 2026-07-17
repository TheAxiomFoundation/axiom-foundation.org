import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TraceProvider } from "./trace-context";
import { ChunkTraceChips } from "./chunk-trace";
import { RunSample } from "./run-sample";

const PROGRAM = {
  jurisdiction: "us-co",
  programId: "co-snap",
  mode: "compiled" as const,
  status: "ready" as const,
  ruleCount: 6,
  anchors: ["a"],
  ruleNames: ["snap_allotment"],
};

const RUN_RESPONSE = {
  outputs: { snap_benefit_amount: 298 },
  trace: [
    {
      rule_id: "snap_regular_month_allotment",
      variable: "snap_benefit_amount",
      value: 298,
      sources: ["us:statutes/7/2017/a#snap_regular_month_allotment"],
    },
    {
      rule_id: "gross_income",
      variable: "gross_income",
      value: 0,
      sources: ["us-co:policies/cdhs/snap/fy-2026-benefit-calculation#gross_income"],
    },
  ],
  period: "2026-01",
  sample: true,
};

function mountOverlay() {
  return render(
    <TraceProvider>
      <ChunkTraceChips anchor="a" sectionFocus="us:statutes/7/2017" />
      <ChunkTraceChips anchor="b" sectionFocus="us:statutes/7/2017" />
      <RunSample programs={[PROGRAM]} sectionFocus="us:statutes/7/2017" />
    </TraceProvider>
  );
}

describe("trace overlay", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/us/statute/7/2017");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => RUN_RESPONSE })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lights up the traced subsection after a permalink run and clears on ×", async () => {
    window.history.replaceState(
      {},
      "",
      "/us/statute/7/2017?run=us-co/co-snap"
    );
    mountOverlay();
    await waitFor(() =>
      expect(screen.getByTestId("trace-chips-a")).toBeInTheDocument()
    );
    // (a) shows its computed value, linked to the rule card; (b) — and
    // out-of-section sources — get nothing.
    const chip = screen.getByTestId("trace-chips-a").querySelector("a");
    expect(chip!.getAttribute("href")).toBe(
      "#rule-snap_regular_month_allotment"
    );
    expect(chip!.textContent).toContain("snap_benefit_amount");
    expect(chip!.textContent).toContain("298");
    expect(screen.queryByTestId("trace-chips-b")).not.toBeInTheDocument();
    // The run is URL-addressable.
    expect(window.location.search).toContain("run=us-co%2Fco-snap");

    fireEvent.click(screen.getByTitle("Clear result"));
    expect(screen.queryByTestId("trace-chips-a")).not.toBeInTheDocument();
    expect(window.location.search).not.toContain("run=");
  });

  it("auto-runs from a ?run= permalink for the matching program only", async () => {
    window.history.replaceState(
      {},
      "",
      "/us/statute/7/2017?run=us-co/co-snap"
    );
    mountOverlay();
    await waitFor(() =>
      expect(screen.getByTestId("trace-chips-a")).toBeInTheDocument()
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("auto-runs the matching program even when it is not the group default", async () => {
    const alabama = { ...PROGRAM, jurisdiction: "us-al", programId: "snap" };
    window.history.replaceState(
      {},
      "",
      "/us/statute/7/2017?run=us-co/co-snap"
    );
    render(
      <TraceProvider>
        <RunSample
          programs={[alabama, PROGRAM]}
          sectionFocus="us:statutes/7/2017"
        />
      </TraceProvider>
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [call] = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(JSON.parse(call[1].body)).toEqual({
      jurisdiction: "us-co",
      program_id: "co-snap",
    });
    // The result header names the program that actually ran.
    await waitFor(() =>
      expect(screen.getByTestId("run-sample-result")).toBeInTheDocument()
    );
    expect(
      screen.getByText(/sample household · us-co/)
    ).toBeInTheDocument();
  });

  it("does not auto-run for a non-matching ?run= param", async () => {
    window.history.replaceState(
      {},
      "",
      "/us/statute/7/2017?run=us-al/snap"
    );
    mountOverlay();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetch).not.toHaveBeenCalled();
  });
});
