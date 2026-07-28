import { describe, it, expect } from "vitest";
import { humanizeRuleName } from "./citations";

describe("humanizeRuleName", () => {
  it("title-cases snake_case rule names", () => {
    expect(humanizeRuleName("elderly_disabled_credit")).toBe(
      "Elderly Disabled Credit"
    );
    expect(humanizeRuleName("snap_monthly_allotment")).toBe(
      "SNAP Monthly Allotment"
    );
  });

  it("keeps acronyms upper-case", () => {
    expect(humanizeRuleName("cdcc")).toBe("CDCC");
    expect(humanizeRuleName("snap_agi_limit")).toBe("SNAP AGI Limit");
  });

  it("survives odd input", () => {
    expect(humanizeRuleName("")).toBe("");
    expect(humanizeRuleName("__x__")).toBe("X");
  });
});
