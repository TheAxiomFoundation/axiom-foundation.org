import { describe, it, expect } from "vitest";
import {
  axiomAppUrl,
  humanizeCitation,
  humanizeRuleName,
  humanizeSource,
} from "./citations";

describe("manual-bucket citations", () => {
  const moBlock =
    "us-mo:manual/dss/snap/1115-000-00/1115-035-00/1115-035-25/block-1";

  it("links a manual home to its deepest real section (block leaves drop)", () => {
    expect(axiomAppUrl(moBlock)).toBe(
      "/us-mo/manual/dss/snap/1115-000-00/1115-035-00/1115-035-25",
    );
  });

  it("humanizes a manual citation", () => {
    expect(humanizeCitation(moBlock)).toBe("MO DSS SNAP Manual 1115.035.25");
  });

  it("recognizes slash-form manual sources", () => {
    expect(
      humanizeSource("us-mo/manual/dss/snap/1115-000-00/1115-035-00/1115-035-25"),
    ).toBe("MO DSS SNAP Manual 1115.035.25");
  });

  it("leaves statute and regulation links untouched", () => {
    expect(axiomAppUrl("us:regulations/7-cfr/273/10")).toBe(
      "/us/regulation/7/273/10",
    );
    expect(axiomAppUrl("us:statutes/7/2017/a")).toBe("/us/statute/7/2017/a");
  });
});

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
