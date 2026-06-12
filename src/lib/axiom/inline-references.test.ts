import { describe, expect, it } from "vitest";
import type { RuleReference } from "@/lib/supabase";
import {
  buildInlineReferences,
  inferRelativeReferences,
  reanchorReferences,
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

describe("inferRelativeReferences source-document qualifiers", () => {
  it("does not swallow prose parentheticals into subsection paths", () => {
    const refs = inferRelativeReferences(
      "See section 911 (relating to citizens or residents living abroad).",
      "us/statute/26/32",
      []
    );
    expect(refs).toHaveLength(1);
    expect(refs[0].other_citation_path).toBe("us/statute/26/911");
    expect(refs[0].citation_text).not.toContain("relating");
  });

  it("still accepts short subsection designators after the section", () => {
    const refs = inferRelativeReferences(
      "See section 32(n)(1)(B)(ii) for phase-out.",
      "us/statute/26/21",
      []
    );
    expect(refs[0]?.other_citation_path).toBe("us/statute/26/32/n/1/B/ii");
  });

  it("skips citations into a different named Act", () => {
    expect(
      inferRelativeReferences(
        "As defined in section 205(c)(2)(B)(i) of the Social Security Act.",
        "us/statute/26/32",
        []
      )
    ).toEqual([]);
  });

  it("skips 'of such Act' citations", () => {
    expect(
      inferRelativeReferences(
        "Under section 6(b) of such Act, the rate applies.",
        "us/statute/26/32",
        []
      )
    ).toEqual([]);
  });

  it("keeps 'of this title' citations", () => {
    const refs = inferRelativeReferences(
      "Pursuant to section 2012(m)(4) of this title.",
      "us/statute/7/2014",
      []
    );
    expect(refs[0]?.other_citation_path).toBe("us/statute/7/2012/m/4");
  });

  it("keeps Internal Revenue Code citations inside title 26 only", () => {
    const inTitle26 = inferRelativeReferences(
      "See section 21 of the Internal Revenue Code of 1986.",
      "us/statute/26/32",
      []
    );
    expect(inTitle26[0]?.other_citation_path).toBe("us/statute/26/21");

    expect(
      inferRelativeReferences(
        "See section 21 of the Internal Revenue Code of 1986.",
        "us/statute/42/601",
        []
      )
    ).toEqual([]);
  });

  it("keeps 'of title N' citations only inside title N", () => {
    const sameTitle = inferRelativeReferences(
      "See section 601 of title 42.",
      "us/statute/42/602",
      []
    );
    expect(sameTitle[0]?.other_citation_path).toBe("us/statute/42/601");

    expect(
      inferRelativeReferences(
        "See section 5312 of title 5.",
        "us/statute/7/2014",
        []
      )
    ).toEqual([]);
  });
});

describe("reanchorReferences", () => {
  it("returns refs with matching offsets by identity", () => {
    const body = "See 42 U.S.C. 9902 for definitions.";
    const start = body.indexOf("42 U.S.C. 9902");
    const existing = ref({
      citation_text: "42 U.S.C. 9902",
      start_offset: start,
      end_offset: start + "42 U.S.C. 9902".length,
    });
    const out = reanchorReferences(body, [existing]);
    expect(out[0]).toBe(existing);
  });

  it("re-anchors shifted offsets onto the citation text", () => {
    const body = "Aid is defined under 42 U.S.C. 601 in part A.";
    const out = reanchorReferences(body, [
      ref({ citation_text: "42 U.S.C. 601", start_offset: 0, end_offset: 13 }),
    ]);
    expect(body.slice(out[0].start_offset, out[0].end_offset)).toBe(
      "42 U.S.C. 601"
    );
  });

  it("re-anchors offsets that exceed the body length", () => {
    const body = "Refer to 26 U.S.C. 32.";
    const out = reanchorReferences(body, [
      ref({
        citation_text: "26 U.S.C. 32",
        start_offset: 72142,
        end_offset: 72154,
      }),
    ]);
    expect(body.slice(out[0].start_offset, out[0].end_offset)).toBe(
      "26 U.S.C. 32"
    );
  });

  it("assigns repeated citation texts to successive occurrences", () => {
    const body = "section 1931 first, then section 1931 again.";
    const stale = () =>
      ref({ citation_text: "section 1931", start_offset: 500, end_offset: 512 });
    const out = reanchorReferences(body, [stale(), stale()]);
    expect(out.map((r) => r.start_offset)).toEqual([
      body.indexOf("section 1931"),
      body.indexOf("section 1931", 1),
    ]);
  });

  it("unanchors refs whose text is absent so they stay panel-only", () => {
    const body = "Nothing cited here.";
    const out = reanchorReferences(body, [
      ref({ citation_text: "42 U.S.C. 601", start_offset: 3, end_offset: 16 }),
    ]);
    expect(out[0].start_offset).toBe(-1);
    expect(out[0].end_offset).toBe(-1);
  });

  it("leaves incoming refs untouched", () => {
    const incoming = ref({
      direction: "incoming",
      citation_text: "not in body",
      start_offset: 4,
      end_offset: 15,
    });
    const out = reanchorReferences("Some body.", [incoming]);
    expect(out[0]).toBe(incoming);
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
