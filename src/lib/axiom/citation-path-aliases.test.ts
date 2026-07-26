import { describe, it, expect } from "vitest";
import { ukGovukTaxonomyTwin } from "./citation-path-aliases";

describe("ukGovukTaxonomyTwin", () => {
  it("maps policy paths to their guidance twins and back", () => {
    expect(ukGovukTaxonomyTwin("uk/policy/govuk/carers-allowance")).toBe(
      "uk/guidance/govuk/carers-allowance"
    );
    expect(
      ukGovukTaxonomyTwin("uk/guidance/govuk/carers-allowance/eligibility")
    ).toBe("uk/policy/govuk/carers-allowance/eligibility");
  });

  it("leaves non-govuk paths alone", () => {
    expect(ukGovukTaxonomyTwin("uk/policy/dwp/something")).toBeNull();
    expect(ukGovukTaxonomyTwin("uk/statute/ukpga/1992/4/141")).toBeNull();
    expect(ukGovukTaxonomyTwin("us/policy/govuk/x")).toBeNull();
  });
});
