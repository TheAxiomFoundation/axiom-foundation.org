import { describe, it, expect } from "vitest";
import { formatLegalCitation } from "./format";

describe("formatLegalCitation", () => {
  it("formats federal statutes with and without subsections", () => {
    expect(formatLegalCitation("us/statute/7/2017")).toBe("7 U.S.C. § 2017");
    expect(formatLegalCitation("us/statute/7/2017", "a")).toBe(
      "7 U.S.C. § 2017(a)"
    );
    expect(formatLegalCitation("us/statute/26/32/b/1", "A")).toBe(
      "26 U.S.C. § 32(b)(1)(A)"
    );
  });

  it("formats federal regulations", () => {
    expect(formatLegalCitation("us/regulation/26/1/32-2")).toBe(
      "26 C.F.R. § 1.32-2"
    );
    expect(formatLegalCitation("us/regulation/7/273/9", "d")).toBe(
      "7 C.F.R. § 273.9(d)"
    );
  });

  it("falls back to the raw path for unformatted jurisdictions", () => {
    expect(
      formatLegalCitation("us-co/statute/26/26-2-706", "a")
    ).toBe("us-co/statute/26/26-2-706/a");
  });
});
