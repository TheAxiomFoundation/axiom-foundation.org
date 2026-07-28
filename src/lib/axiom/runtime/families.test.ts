import { describe, expect, it } from "vitest";
import { programFamily, programFamilySummary } from "./families";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";

function program(
  jurisdiction: string,
  programId: string
): ProvisionProgramCoverage {
  return { jurisdiction, programId } as ProvisionProgramCoverage;
}

describe("programFamily", () => {
  it("folds a state-prefixed program id into its base program", () => {
    expect(programFamily(program("us-co", "co-snap"))).toBe("snap");
  });

  it("keeps an unprefixed program id in a state jurisdiction", () => {
    expect(programFamily(program("us-co", "snap"))).toBe("snap");
  });

  it("keeps program ids in dashless jurisdictions verbatim", () => {
    expect(programFamily(program("us", "snap"))).toBe("snap");
    expect(programFamily(program("uk", "uk-ctc"))).toBe("uk-ctc");
  });
});

describe("programFamilySummary", () => {
  it("returns null for an empty program list", () => {
    expect(programFamilySummary([])).toBeNull();
  });

  it("names a single-jurisdiction family without a count", () => {
    expect(programFamilySummary([program("us", "tanf")])).toBe("tanf");
  });

  it("counts jurisdictions per family and joins with a separator", () => {
    expect(
      programFamilySummary([
        program("us-co", "co-snap"),
        program("us-tx", "tx-snap"),
        program("us", "snap"),
        program("us", "tanf"),
      ])
    ).toBe("snap (3 jurisdictions) · tanf");
  });
});
