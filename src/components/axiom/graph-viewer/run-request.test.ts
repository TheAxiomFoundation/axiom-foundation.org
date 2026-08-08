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

  it("compose mode: extra members ride as people; empty people is omitted", () => {
    const withPeople = buildRunRequestBody(
      "us:statutes/26/32",
      null,
      { age: 40 },
      ["eitc"],
      { person_2: { age: 38 }, person_3: {} }
    );
    expect(withPeople).toEqual({
      root: "us:statutes/26/32",
      facts: { age: 40 },
      people: { person_2: { age: 38 }, person_3: {} },
      variables: ["eitc"],
    });
    // Single-filer runs must send the exact pre-people shape — older
    // upstreams feature-detect on it.
    const solo = buildRunRequestBody(
      "us:statutes/26/32",
      null,
      { age: 40 },
      ["eitc"],
      {}
    );
    expect(solo).toEqual({
      root: "us:statutes/26/32",
      facts: { age: 40 },
      variables: ["eitc"],
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
