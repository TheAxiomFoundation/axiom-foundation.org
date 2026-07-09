import { describe, expect, it } from "vitest";
import { parseCitationInput } from "./citation-jump";

describe("parseCitationInput", () => {
  it("parses USC citations", () => {
    expect(parseCitationInput("26 USC 32")).toBe("us/statute/26/32");
    expect(parseCitationInput("26 U.S.C. § 32")).toBe("us/statute/26/32");
    expect(parseCitationInput("7 usc 2017")).toBe("us/statute/7/2017");
  });

  it("parses subsection tails", () => {
    expect(parseCitationInput("26 USC 32(c)(1)")).toBe(
      "us/statute/26/32/c/1"
    );
    expect(parseCitationInput("26 usc § 32 (a)")).toBe("us/statute/26/32/a");
  });

  it("parses IRC as title 26", () => {
    expect(parseCitationInput("IRC 32(b)")).toBe("us/statute/26/32/b");
  });

  it("parses CFR part.section citations", () => {
    expect(parseCitationInput("7 CFR 273.9")).toBe("us/regulation/7/273/9");
    expect(parseCitationInput("26 cfr 1.32-2")).toBe(
      "us/regulation/26/1/32-2"
    );
  });

  it("parses Colorado CRS citations", () => {
    expect(parseCitationInput("CRS 26-2-706")).toBe(
      "us-co/statute/26/26-2-706"
    );
  });

  it("passes through existing citation paths", () => {
    expect(parseCitationInput("us/statute/26/32")).toBe("us/statute/26/32");
    expect(parseCitationInput("us-co/statute/26/26-2-706")).toBe(
      "us-co/statute/26/26-2-706"
    );
  });

  it("handles lettered USC titles", () => {
    expect(parseCitationInput("42 usc 1396a")).toBe("us/statute/42/1396a");
  });

  it("rejects unparseable input", () => {
    expect(parseCitationInput("")).toBeNull();
    expect(parseCitationInput("earned income credit")).toBeNull();
    expect(parseCitationInput("section 32")).toBeNull();
  });
});
