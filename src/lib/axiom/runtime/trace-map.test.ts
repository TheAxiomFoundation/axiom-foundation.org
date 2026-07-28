import { describe, it, expect } from "vitest";
import { anchorForTraceSource, traceByAnchor } from "./trace-map";

const FOCUS = "us:statutes/7/2017";

describe("anchorForTraceSource", () => {
  it("maps sources under the section to their top-level anchor", () => {
    expect(
      anchorForTraceSource("us:statutes/7/2017/a#snap_allotment", FOCUS)
    ).toBe("a");
    expect(
      anchorForTraceSource("us:statutes/7/2014/e/6/A#x", "us:statutes/7/2014")
    ).toBe("e");
  });

  it("returns null for other sections and section-root sources", () => {
    expect(anchorForTraceSource("us:statutes/7/2014/e#x", FOCUS)).toBeNull();
    expect(anchorForTraceSource("us:statutes/7/2017#x", FOCUS)).toBeNull();
    expect(
      anchorForTraceSource("us-co:regulations/10-ccr-2506-1/4.207.2#x", FOCUS)
    ).toBeNull();
  });
});

describe("traceByAnchor", () => {
  const entry = (variable: string, sources: string[]) => ({
    rule_id: variable,
    variable,
    value: 1,
    sources,
  });

  it("groups entries by anchor, deduping multi-source repeats", () => {
    const grouped = traceByAnchor(
      [
        entry("snap_allotment", [
          "us:statutes/7/2017/a#one",
          "us:statutes/7/2017/a#two",
        ]),
        entry("net_income", ["us:statutes/7/2014/e#x"]),
      ],
      FOCUS
    );
    expect(grouped.get("a")).toHaveLength(1);
    expect(grouped.has("e")).toBe(false);
  });

  it("is empty without a section focus", () => {
    expect(
      traceByAnchor([entry("x", ["us:statutes/7/2017/a#x"])], null).size
    ).toBe(0);
  });
});
