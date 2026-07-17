import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("RunSample", () => {
  beforeEach(() => {
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
  afterEach(() => vi.unstubAllGlobals());

  it("runs the sample and renders outputs with section markers", async () => {
    render(<RunSample program={PROGRAM} sectionFocus="us:statutes/7/2017" />);
    fireEvent.click(screen.getByTestId("run-sample-button"));
    await waitFor(() =>
      expect(screen.getByTestId("run-sample-result")).toBeInTheDocument()
    );
    expect(screen.getByText("298")).toBeInTheDocument();
    expect(screen.getByText("yes")).toBeInTheDocument();
    // snap_benefit_amount traces to this section → marked; the
    // untraced snap_eligible is not.
    expect(screen.getByTitle("Computed by rules from this section")).toBeInTheDocument();
    const [call] = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(JSON.parse(call[1].body)).toEqual({
      jurisdiction: "us-co",
      program_id: "co-snap",
    });
  });

  it("shows a failure note when the run errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 })
    );
    render(<RunSample program={PROGRAM} sectionFocus={null} />);
    fireEvent.click(screen.getByTestId("run-sample-button"));
    await waitFor(() =>
      expect(
        screen.getByText("run failed — engine unavailable")
      ).toBeInTheDocument()
    );
  });
});
