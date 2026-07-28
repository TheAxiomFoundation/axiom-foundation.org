import { describe, it, expect } from "vitest";
import { buildRunRequestBody, scenarioKey } from "./run-request";

describe("buildRunRequestBody", () => {
  it("compose mode: typed values travel verbatim as facts on the root shape", () => {
    const body = buildRunRequestBody(
      "us-co:regulations/10-ccr-2506-1/4.410#some_rule",
      { jurisdiction: "us-co", programId: "co-snap" },
      { household_vehicle_resource_value: 500, household_occupies_home: true },
      ["countable_resources"]
    );
    expect(body).toEqual({
      root: "us-co:regulations/10-ccr-2506-1/4.410",
      facts: {
        household_vehicle_resource_value: 500,
        household_occupies_home: true,
      },
      variables: ["countable_resources"],
    });
  });

  it("program mode keeps coordinates and values", () => {
    const body = buildRunRequestBody(
      null,
      { jurisdiction: "us-ny", programId: "snap" },
      { household_size: 3 },
      []
    );
    expect(body).toEqual({
      jurisdiction: "us-ny",
      program_id: "snap",
      values: { household_size: 3 },
      variables: [],
    });
  });
});

describe("scenarioKey (explicit runs only — edits mark staleness)", () => {
  it("ignores insertion order, catches value and key changes", () => {
    expect(
      scenarioKey({ household_size: 2, member_age: 40 }),
    ).toBe(scenarioKey({ member_age: 40, household_size: 2 }));
    expect(scenarioKey({ household_size: 2 })).not.toBe(
      scenarioKey({ household_size: 3 }),
    );
    expect(scenarioKey({ household_size: 2 })).not.toBe(
      scenarioKey({ household_size: 2, member_age: 40 }),
    );
    expect(scenarioKey({})).toBe(scenarioKey({}));
  });

  it("distinguishes boolean flips", () => {
    expect(scenarioKey({ occupies_home: true })).not.toBe(
      scenarioKey({ occupies_home: false }),
    );
  });
});
