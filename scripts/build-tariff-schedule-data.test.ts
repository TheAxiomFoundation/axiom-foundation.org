import { describe, expect, it } from "vitest";
import { buildArtifact, EXPECTED_LINE_COUNT, renderMembershipExplanation } from "./build-tariff-schedule-data";

describe("tariff schedule builder", () => {
  const artifact = buildArtifact();
  it("is deterministic and contains the adjudicated rated-line count", () => {
    expect(buildArtifact()).toEqual(artifact);
    expect(artifact.lines).toHaveLength(EXPECTED_LINE_COUNT);
  });
  it("preserves non-ad-valorem statutory text", () => {
    const line = artifact.lines.find((item) => item.generalDisposition === "specific");
    expect(line).toBeDefined();
    expect(line?.generalRate).not.toBe("not determined");
    expect(line?.generalRate).toMatch(/[¢$\/]|kg|liter|each/i);
  });
  it("renders a human-readable incidence explanation", () => {
    expect(renderMembershipExplanation("note16", { name: "steel" }, { source: { corpus_citation_path: "us/statute/hts/chapter-99/page-237" }, context: { subdivision: "16(b)" } })).toBe("Section 232 steel scope — U.S. note 16(b), page 237");
  });
  it("keeps known witness values and the fail-closed Canada warning", () => {
    const beer = artifact.lines.find((item) => item.hts10 === "2203000000");
    expect(beer).toMatchObject({ description: "Beer made from malt", generalRate: "Free", column2Rate: "13.2¢/liter", canada338Warning: true });
  });
});
