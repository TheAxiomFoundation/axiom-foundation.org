import { describe, it, expect } from "vitest";
import {
  splitBodyIntoSubsections,
  refsForSubsection,
  type BodySubsection,
} from "./body-subsections";
import type { RuleReference } from "@/lib/supabase";

const TWO_SUBSECTIONS = `(a) Applicability. An individual enrolled at least half-time in an institution of higher education is ineligible.

Continuation of (a) here.

(b) Exemptions. The following individuals shall be exempted from this section.

Some additional language for (b).
`;

describe("splitBodyIntoSubsections", () => {
  it("returns null when fewer than two top-level labels are present", () => {
    expect(splitBodyIntoSubsections("")).toBeNull();
    expect(
      splitBodyIntoSubsections("Just one paragraph with no labels.")
    ).toBeNull();
    expect(
      splitBodyIntoSubsections("(a) Only one labelled paragraph here.")
    ).toBeNull();
  });

  it("groups continuation paragraphs under the most recent labelled one", () => {
    const out = splitBodyIntoSubsections(TWO_SUBSECTIONS)!;
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe("a");
    expect(out[0].text).toContain("Applicability");
    expect(out[0].text).toContain("Continuation of (a) here.");
    expect(out[1].label).toBe("b");
    expect(out[1].text).toContain("Exemptions");
    expect(out[1].text).toContain("Some additional language for (b).");
  });

  it("preserves byte offsets so callers can rebase ref ranges", () => {
    const out = splitBodyIntoSubsections(TWO_SUBSECTIONS)!;
    expect(out[0].offset).toBe(0);
    expect(TWO_SUBSECTIONS.slice(out[1].offset, out[1].offset + 3)).toBe("(b)");
  });

  it("captures leading prose before the first label as a labelless lead", () => {
    const body = `Lead paragraph with no label yet.\n\n(a) First labelled.\n\n(b) Second labelled.`;
    const out = splitBodyIntoSubsections(body)!;
    expect(out[0].label).toBeNull();
    expect(out[0].text).toBe("Lead paragraph with no label yet.");
    expect(out[1].label).toBe("a");
    expect(out[2].label).toBe("b");
  });

  it("ignores ``(X)`` tokens that appear inside a paragraph rather than at the start", () => {
    const body = `(a) First subsection mentions paragraph (b) of this section by reference.\n\n(b) Second subsection.`;
    const out = splitBodyIntoSubsections(body)!;
    expect(out.map((s) => s.label)).toEqual(["a", "b"]);
  });
});

describe("refsForSubsection", () => {
  function ref(start: number, end: number): RuleReference {
    return {
      direction: "outgoing",
      citation_text: "26 USC 32",
      pattern_kind: "usc",
      confidence: 1,
      start_offset: start,
      end_offset: end,
      other_citation_path: "us/statute/26/32",
      other_provision_id: "p",
      other_heading: "EITC",
      target_resolved: true,
    } as unknown as RuleReference;
  }

  const subsections = splitBodyIntoSubsections(TWO_SUBSECTIONS)!;

  it("rebases refs that fall entirely within the subsection's byte range", () => {
    const aOffset = subsections[0].offset;
    const aEnd = aOffset + subsections[0].text.length;
    const r = ref(aOffset + 10, aOffset + 20);
    const out = refsForSubsection(subsections[0], [r]);
    expect(out).toHaveLength(1);
    expect(out[0].start_offset).toBe(10);
    expect(out[0].end_offset).toBe(20);
    void aEnd;
  });

  it("drops refs that straddle a subsection boundary", () => {
    const a = subsections[0];
    const b = subsections[1];
    // Span covers the whole of (a) and the start of (b).
    const r = ref(a.offset, b.offset + 5);
    expect(refsForSubsection(a, [r])).toEqual([]);
    expect(refsForSubsection(b, [r])).toEqual([]);
  });

  it("drops refs that fall outside the subsection entirely", () => {
    const a = subsections[0];
    const b = subsections[1];
    const insideB = ref(b.offset + 2, b.offset + 10);
    expect(refsForSubsection(a, [insideB])).toEqual([]);
    expect(refsForSubsection(b, [insideB])).toHaveLength(1);
  });
});
