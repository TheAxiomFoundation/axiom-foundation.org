import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SubtreeDoors, SubtreeSearch } from "./subtree-picker";
import { humanizeCitation } from "./citations";
import type { CorpusModule } from "@/lib/axiom/corpus-field";

function module(overrides: Partial<CorpusModule>): CorpusModule {
  return {
    target: "us:statutes/7/2014",
    jurisdiction: "us",
    bucket: "statutes",
    ruleCount: 5,
    linkedRuleCount: 5,
    importCount: 0,
    imports: [],
    ...overrides,
  };
}

const MODULES: CorpusModule[] = [
  module({ target: "us:regulations/7-cfr/273/10", bucket: "regulations", ruleCount: 40, linkedRuleCount: 40 }),
  module({ target: "us:statutes/7/2014/e/6/A", ruleCount: 22, linkedRuleCount: 22, importCount: 3 }),
  module({ target: "us-ny:regulations/18-nycrr/387/14", jurisdiction: "us-ny", bucket: "regulations", ruleCount: 9, linkedRuleCount: 9 }),
  module({ target: "us-fl:policies/dcf/ess-program-policy-manual/appendix-a-1", jurisdiction: "us-fl", bucket: "policies", ruleCount: 3, linkedRuleCount: 3 }),
];

describe("SubtreeDoors", () => {
  it("offers the computed doors — citations, never program cards", () => {
    const onPick = vi.fn();
    render(<SubtreeDoors modules={MODULES} onPick={onPick} />);
    const doors = screen.getAllByTestId("picker-door");
    expect(doors).toHaveLength(MODULES.length);
    expect(
      doors.some((el) =>
        el.textContent?.includes(
          humanizeCitation("us:regulations/7-cfr/273/10")
        )
      )
    ).toBe(true);
    expect(document.querySelector(".plane-launcher-card")).toBeNull();
    expect(document.querySelector(".constellation-summit")).toBeNull();
    fireEvent.click(doors[0]!);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(MODULES.map((m) => m.target)).toContain(
      onPick.mock.calls[0]![0]
    );
  });
});

describe("SubtreeSearch", () => {
  it("matches against the humanized citation and picks on click", () => {
    const onPick = vi.fn();
    render(<SubtreeSearch modules={MODULES} onPick={onPick} />);
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "273.10" },
    });
    const results = screen.getAllByTestId("picker-result");
    expect(results).toHaveLength(1);
    expect(results[0]!.textContent).toContain("7 CFR § 273.10");
    fireEvent.click(results[0]!);
    expect(onPick).toHaveBeenCalledWith("us:regulations/7-cfr/273/10");
  });

  it("matches against the raw target string too", () => {
    const onPick = vi.fn();
    render(<SubtreeSearch modules={MODULES} onPick={onPick} />);
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "ess-program appendix" },
    });
    const results = screen.getAllByTestId("picker-result");
    expect(results).toHaveLength(1);
    fireEvent.click(results[0]!);
    expect(onPick).toHaveBeenCalledWith(
      "us-fl:policies/dcf/ess-program-policy-manual/appendix-a-1"
    );
  });

  it("every query word must match, any order", () => {
    render(<SubtreeSearch modules={MODULES} onPick={vi.fn()} />);
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "2014 usc 7" },
    });
    const results = screen.getAllByTestId("picker-result");
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const result of results) {
      expect(result.textContent).toContain("7 USC § 2014");
    }
  });

  it("says so when nothing matches", () => {
    render(<SubtreeSearch modules={MODULES} onPick={vi.fn()} />);
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "zzz-nothing" },
    });
    expect(screen.queryAllByTestId("picker-result")).toHaveLength(0);
    expect(screen.getByText(/No provision matches/i)).toBeInTheDocument();
  });

  it("compact mode floats its results (the top-right cluster)", () => {
    render(<SubtreeSearch modules={MODULES} onPick={vi.fn()} compact />);
    expect(document.querySelector(".subtree-search.is-compact")).not.toBeNull();
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "273.10" },
    });
    expect(
      document.querySelector(".picker-results.picker-results-floating")
    ).not.toBeNull();
    // Clearing the query closes the dropdown.
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "" },
    });
    expect(document.querySelector(".picker-results")).toBeNull();
  });
});
