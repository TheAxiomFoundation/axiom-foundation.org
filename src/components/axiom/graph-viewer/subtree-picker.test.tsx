import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SubtreePicker } from "./subtree-picker";
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
  module({ target: "us:regulations/7-cfr/273/10", bucket: "regulations", ruleCount: 40 }),
  module({ target: "us:statutes/7/2014/e/6/A", ruleCount: 22, importCount: 3 }),
  module({ target: "us-ny:regulations/18-nycrr/387/14", jurisdiction: "us-ny", bucket: "regulations", ruleCount: 9 }),
  module({ target: "be:policies/euromod_benefit_income_list", jurisdiction: "be", bucket: "policies", ruleCount: 3 }),
];

describe("SubtreePicker", () => {
  it("offers the computed doors when the query is empty — and no program cards", () => {
    render(<SubtreePicker modules={MODULES} onPick={vi.fn()} />);
    const doors = screen.getAllByTestId("picker-door");
    expect(doors).toHaveLength(MODULES.length);
    // Doors are citations, not program names.
    expect(
      doors.some(
        (el) =>
          el.textContent?.includes(
            humanizeCitation("us:regulations/7-cfr/273/10")
          )
      )
    ).toBe(true);
    expect(document.querySelector(".plane-launcher-card")).toBeNull();
    expect(document.querySelector(".constellation-summit")).toBeNull();
  });

  it("matches against the humanized citation", () => {
    const onPick = vi.fn();
    render(<SubtreePicker modules={MODULES} onPick={onPick} />);
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
    render(<SubtreePicker modules={MODULES} onPick={onPick} />);
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "euromod benefit" },
    });
    const results = screen.getAllByTestId("picker-result");
    expect(results).toHaveLength(1);
    fireEvent.click(results[0]!);
    expect(onPick).toHaveBeenCalledWith(
      "be:policies/euromod_benefit_income_list"
    );
  });

  it("every query word must match, any order", () => {
    render(<SubtreePicker modules={MODULES} onPick={vi.fn()} />);
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "2014 usc 7" },
    });
    const results = screen.getAllByTestId("picker-result");
    // Both /7/2014 targets humanize to "7 USC § 2014…".
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const result of results) {
      expect(result.textContent).toContain("7 USC § 2014");
    }
  });

  it("says so when nothing matches", () => {
    render(<SubtreePicker modules={MODULES} onPick={vi.fn()} />);
    fireEvent.change(screen.getByTestId("picker-search"), {
      target: { value: "zzz-nothing" },
    });
    expect(screen.queryAllByTestId("picker-result")).toHaveLength(0);
    expect(screen.getByText(/No provision matches/i)).toBeInTheDocument();
  });

  it("a door click picks its target", () => {
    const onPick = vi.fn();
    render(<SubtreePicker modules={MODULES} onPick={onPick} />);
    fireEvent.click(screen.getAllByTestId("picker-door")[0]!);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(MODULES.map((m) => m.target)).toContain(
      onPick.mock.calls[0]![0]
    );
  });
});
