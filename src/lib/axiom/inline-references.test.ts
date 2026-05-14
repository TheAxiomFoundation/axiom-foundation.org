import { describe, expect, it } from "vitest";
import type { RuleReference } from "@/lib/supabase";
import {
  buildInlineReferences,
  inferRelativeReferences,
} from "./inline-references";

function ref(overrides: Partial<RuleReference> = {}): RuleReference {
  return {
    direction: "outgoing",
    citation_text: "section 39-22-104",
    pattern_kind: "relative-section",
    confidence: 1,
    start_offset: 4,
    end_offset: 21,
    other_citation_path: "us-co/statute/crs/39-22-104",
    other_provision_id: null,
    other_heading: null,
    target_resolved: true,
    ...overrides,
  };
}

describe("inferRelativeReferences", () => {
  it("infers same-collection statute links with subsection tails", () => {
    const body = "See section 39-22-104(1)(a) for the rate.";
    const refs = inferRelativeReferences(
      body,
      "us-co/statute/crs/39-22-105",
      []
    );

    expect(refs).toMatchObject([
      {
        citation_text: "section 39-22-104(1)(a)",
        other_citation_path: "us-co/statute/crs/39-22-104/1/a",
        inferred: true,
      },
    ]);
  });

  it("infers federal regulation section-symbol links", () => {
    const refs = inferRelativeReferences(
      "Handled under § 273.11(g).",
      "us/regulation/7/273/3",
      []
    );

    expect(refs[0]?.other_citation_path).toBe("us/regulation/7/273/11/g");
  });

  it("infers same-state regulation links", () => {
    const refs = inferRelativeReferences(
      "The allowance is described in section 4.407.3(B).",
      "us-co/regulation/10-ccr-2506-1/4.407.4",
      []
    );

    expect(refs[0]?.other_citation_path).toBe(
      "us-co/regulation/10-ccr-2506-1/4.407.3/B"
    );
  });

  it("skips missing context, unsupported paths, self-links, and overlaps", () => {
    expect(inferRelativeReferences("See section 1.2.", undefined, [])).toEqual([]);
    expect(
      inferRelativeReferences("See section 1.2.", "us/policy/usda", [])
    ).toEqual([]);
    expect(
      inferRelativeReferences(
        "See section 39-22-105.",
        "us-co/statute/crs/39-22-105",
        []
      )
    ).toEqual([]);
    expect(
      inferRelativeReferences(
        "See section 39-22-104 and section 39-22-104.",
        "us-co/statute/crs/39-22-105",
        [ref()]
      )
    ).toHaveLength(1);
  });

  it("skips federal regulation citations that cannot form section paths", () => {
    expect(
      inferRelativeReferences("See § 273.", "us/regulation/7/273/3", [])
    ).toEqual([]);
    expect(
      inferRelativeReferences("See § 273.11.", "us/regulation", [])
    ).toEqual([]);
  });
});

describe("buildInlineReferences", () => {
  it("returns existing refs unchanged when there is no body", () => {
    const existing = [ref()];
    expect(buildInlineReferences(null, "us-co/statute/crs/39-22-105", existing)).toBe(existing);
  });

  it("combines existing and inferred refs", () => {
    const existing = [
      ref({
        start_offset: 0,
        end_offset: 5,
        citation_text: "Intro",
      }),
    ];
    const refs = buildInlineReferences(
      "Intro. See section 39-22-104.",
      "us-co/statute/crs/39-22-105",
      existing
    );

    expect(refs).toHaveLength(2);
    expect(refs[0]).toBe(existing[0]);
    expect(refs[1]?.other_citation_path).toBe("us-co/statute/crs/39-22-104");
  });
});
