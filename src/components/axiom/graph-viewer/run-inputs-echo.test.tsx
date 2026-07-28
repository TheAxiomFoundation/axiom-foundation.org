import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RunInputsEcho } from "./run-inputs-echo";

describe("RunInputsEcho", () => {
  it("lists every entered fact with a humanized name and its value", () => {
    render(
      <RunInputsEcho
        scenario={{
          snap_gross_monthly_earned_income: 1200,
          household_occupies_home: true,
          is_cdcc_child_dependent: false,
        }}
      />
    );
    const section = screen.getByTestId("results-inputs");
    expect(section.textContent).toContain("Inputs you set");
    expect(section.textContent).toContain("SNAP Gross Monthly Earned Income");
    expect(section.textContent).toContain("1,200");
    expect(section.textContent).toContain("Household Occupies Home");
    expect(section.textContent).toContain("Yes");
    expect(section.textContent).toContain("Is CDCC Child Dependent");
    expect(section.textContent).toContain("No");
  });

  it("renders nothing when no facts were set", () => {
    render(<RunInputsEcho scenario={{}} />);
    expect(screen.queryByTestId("results-inputs")).toBeNull();
  });
});
