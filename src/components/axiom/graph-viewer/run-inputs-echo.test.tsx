import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RunInputsEcho } from "./run-inputs-echo";

describe("RunInputsEcho", () => {
  it("lists every typed fact with a humanized name and its value", () => {
    render(
      <RunInputsEcho
        items={[
          {
            name: "snap_gross_monthly_earned_income",
            value: 1200,
            isDefault: false,
          },
          { name: "household_occupies_home", value: true, isDefault: false },
          { name: "is_cdcc_child_dependent", value: false, isDefault: false },
        ]}
      />
    );
    const section = screen.getByTestId("results-inputs");
    expect(section.textContent).toContain("Inputs in this run");
    expect(section.textContent).toContain("SNAP Gross Monthly Earned Income");
    expect(section.textContent).toContain("1,200");
    expect(section.textContent).toContain("Household Occupies Home");
    expect(section.textContent).toContain("Yes");
    expect(section.textContent).toContain("Is CDCC Child Dependent");
    expect(section.textContent).toContain("No");
    // Typed values carry no "default" tag.
    expect(screen.queryByTestId("results-input-default")).toBeNull();
  });

  it("selected-but-untouched inputs show their default with a muted tag", () => {
    render(
      <RunInputsEcho
        items={[
          {
            name: "snap_gross_monthly_earned_income",
            value: 2000,
            isDefault: false,
          },
          { name: "household_size", value: 1, isDefault: true },
          { name: "member_is_disabled", value: false, isDefault: true },
          // The registry may carry no default — the engine still
          // defaults it server-side; the sheet stays honest with "—".
          { name: "household_shelter_costs_incurred", value: null, isDefault: true },
        ]}
      />
    );
    const section = screen.getByTestId("results-inputs");
    // Every SELECTED input is present, not only the typed one.
    expect(section.textContent).toContain("Household Size");
    expect(section.textContent).toContain("Member Is Disabled");
    expect(section.textContent).toContain(
      "Household Shelter Costs Incurred"
    );
    expect(section.textContent).toContain("—");
    const tags = screen.getAllByTestId("results-input-default");
    expect(tags).toHaveLength(3);
    expect(tags[0]!.textContent).toBe("default");
    // The typed row keeps its plain value.
    expect(section.textContent).toContain("2,000");
  });

  it("renders nothing when nothing was selected", () => {
    render(<RunInputsEcho items={[]} />);
    expect(screen.queryByTestId("results-inputs")).toBeNull();
  });
});
