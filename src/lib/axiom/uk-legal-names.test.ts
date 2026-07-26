import { describe, it, expect } from "vitest";
import {
  ukInstrumentNameForPath,
  ukLabelForPath,
  ukSegmentLabel,
} from "./uk-legal-names";

describe("uk legal names registry", () => {
  it("names an act from any path at or below it", () => {
    expect(ukInstrumentNameForPath("uk/statute/ukpga/1992/4")).toBe(
      "Social Security Contributions and Benefits Act 1992"
    );
    expect(ukInstrumentNameForPath("uk/statute/ukpga/1992/4/141")).toBe(
      "Social Security Contributions and Benefits Act 1992"
    );
  });

  it("names statutory instruments across classes", () => {
    expect(ukLabelForPath("uk/regulation/uksi/2006/965")).toBe(
      "The Child Benefit (Rates) Regulations 2006"
    );
    expect(ukLabelForPath("uk/regulation/ssi/2020/351")).toBe(
      "The Scottish Child Payment Regulations 2020"
    );
  });

  it("expands legislation.gov.uk classes at class depth", () => {
    expect(ukSegmentLabel(["uk", "statute", "ukpga"], 2)).toBe(
      "Public General Acts"
    );
    expect(ukSegmentLabel(["uk", "regulation", "uksi", "2006", "965"], 2)).toBe(
      "UK Statutory Instruments"
    );
  });

  it("returns null outside uk legislation paths and unknown instruments", () => {
    expect(ukLabelForPath("us/statute/26/32")).toBeNull();
    expect(ukLabelForPath("uk/policy/govuk/something")).toBeNull();
    expect(ukLabelForPath("uk/statute/ukpga/1900/99")).toBeNull();
    // Year depth carries no registry label — the year is the label.
    expect(ukSegmentLabel(["uk", "statute", "ukpga", "1992", "4"], 3)).toBeNull();
  });
});
