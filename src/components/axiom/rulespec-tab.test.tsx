import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  RuleSpecTab,
  formatScalar,
  ownerRuleFor,
  groupTestsByRule,
} from "./rulespec-tab";
import type { RuleEncodingData } from "@/lib/supabase";
import type { RuleSpecTestCase } from "@/lib/axiom/rulespec/doc";
import { _resetRawFetchCache } from "@/lib/axiom/rulespec/raw-cache";

function makeEncoding(
  overrides: Partial<RuleEncodingData> = {}
): RuleEncodingData {
  return {
    encoding_run_id: "github:statutes/26/3101/a.yaml",
    citation: "26 USC 3101(a)",
    session_id: null,
    file_path: "statutes/26/3101/a.yaml",
    rulespec_content: "",
    final_scores: null,
    iterations: null,
    total_duration_ms: null,
    agent_type: null,
    agent_model: null,
    data_source: null,
    has_issues: null,
    note: null,
    timestamp: null,
    encoder_version: null,
    ...overrides,
  };
}

function makeTest(
  name: string,
  output: Record<string, unknown>,
  overrides: Partial<RuleSpecTestCase> = {}
): RuleSpecTestCase {
  return {
    name,
    period: null,
    input: { wages: 1 },
    output,
    raw: {},
    ...overrides,
  };
}

const TWO_RULES_DOC = `format: rulespec/v1
rules:
  - name: rate
    kind: parameter
    versions:
      - effective_from: '2020-01-01'
        effective_to: '2024-12-31'
        formula: '0.062'
  - name: tax
    kind: derived
    versions:
      - effective_from: '2020-01-01'
        formula: rate * wages
`;

describe("formatScalar", () => {
  it("renders nullish values as the literal 'null'", () => {
    expect(formatScalar(null)).toBe("null");
    expect(formatScalar(undefined)).toBe("null");
  });
  it("returns strings unchanged", () => {
    expect(formatScalar("yes")).toBe("yes");
  });
  it("stringifies numbers and booleans natively", () => {
    expect(formatScalar(0)).toBe("0");
    expect(formatScalar(6200)).toBe("6200");
    expect(formatScalar(true)).toBe("true");
    expect(formatScalar(false)).toBe("false");
  });
  it("falls back to JSON for objects and arrays", () => {
    expect(formatScalar({ a: 1 })).toBe('{"a":1}');
    expect(formatScalar([1, 2])).toBe("[1,2]");
  });
});

describe("ownerRuleFor", () => {
  it("returns the first output key that names a local rule", () => {
    expect(
      ownerRuleFor(makeTest("t", { tax: 100, other: 1 }), new Set(["tax"]))
    ).toBe("tax");
  });
  it("returns null when no output key matches a local rule", () => {
    expect(ownerRuleFor(makeTest("t", { other: 1 }), new Set(["tax"]))).toBeNull();
  });
});

describe("groupTestsByRule", () => {
  it("buckets tests under their owner rule and drops orphans", () => {
    const tests = [
      makeTest("a", { tax: 1 }),
      makeTest("b", { tax: 2 }),
      makeTest("orphan", { unrelated: 1 }),
      makeTest("c", { rate: 0.5 }),
    ];
    const grouped = groupTestsByRule(tests, new Set(["tax", "rate"]));
    expect(grouped.get("tax")?.map((t) => t.name)).toEqual(["a", "b"]);
    expect(grouped.get("rate")?.map((t) => t.name)).toEqual(["c"]);
    expect(grouped.has("orphan")).toBe(false);
  });
});

describe("RuleSpecTab — rendering edge cases", () => {
  beforeEach(() => {
    _resetRawFetchCache();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("emits each rule's YAML inside a code block", () => {
    const { container } = render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: TWO_RULES_DOC })}
        loading={false}
        jurisdiction="us"
      />
    );
    // Both effective dates show up in the dumped YAML — Prism
    // splits text into spans so we look at concatenated text.
    expect(container.textContent).toContain("2020-01-01");
    expect(container.textContent).toContain("2024-12-31");
    // The derived rule's formula round-trips through dump.
    expect(container.textContent).toContain("rate * wages");
  });

  it("expands the per-rule tests block on click and shows input/output rows", async () => {
    const tests = [
      {
        name: "zero_in_zero_out",
        period: { period_kind: "tax_year" },
        input: { wages: 0 },
        output: { tax: 0 },
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `- name: zero_in_zero_out
  period: { period_kind: tax_year }
  input:
    wages: 0
  output:
    tax: 0
`,
      })
    );
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: TWO_RULES_DOC })}
        loading={false}
        jurisdiction="us"
      />
    );
    // The fetch resolves async — wait for the (1) test count next to
    // the disclosure to appear before clicking it open.
    await waitFor(() =>
      expect(screen.getByText(/^\(1\)$/)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /Tests/i }));
    expect(screen.getByText("zero_in_zero_out")).toBeInTheDocument();
    expect(screen.getAllByText("wages")[0]).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    void tests; // silence unused warning if shape evolves
  });

  it("does not render tests whose output keys do not match any local rule", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `- name: stranded
  input: {}
  output:
    unrelated_key: 1
`,
      })
    );
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: TWO_RULES_DOC })}
        loading={false}
        jurisdiction="us"
      />
    );
    // Give the fetch a tick to settle, then assert that the test
    // case never rendered: orphan tests are dropped silently rather
    // than surfaced in their own section.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("stranded")).toBeNull();
    expect(
      screen.queryByText(/Tests not bound to a rule/i)
    ).toBeNull();
  });

  it("surfaces parse warnings when the doc has soft errors", () => {
    const broken = `format: rulespec/v1
rules:
  - kind: parameter
    versions: []
`;
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: broken })}
        loading={false}
        jurisdiction="us"
      />
    );
    expect(screen.getByText(/Parse warnings/i)).toBeInTheDocument();
    expect(screen.getByText(/missing `name`/i)).toBeInTheDocument();
  });

  it("renders source relations as first-class non-executable RuleSpec records", () => {
    const content = `format: rulespec/v1
rules:
  - name: restates_standard_deduction
    kind: source_relation
    source: 10 CCR 2506-1 section 4.407.1
    source_relation:
      type: restates
      target: us:policies/usda/snap/fy-2026-cola/deductions#snap_standard_deduction
      authority: federal
`;
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: content })}
        loading={false}
        jurisdiction="us-co"
      />
    );
    expect(
      screen.getByText("Restates snap_standard_deduction")
    ).toBeInTheDocument();
    expect(screen.getByText("#restates_standard_deduction")).toBeInTheDocument();
    expect(screen.getAllByText(/us:policies\/usda\/snap/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/no `versions`/i)).toBeNull();
  });

  it("renders data relations without binding tests to relation declarations", () => {
    const content = `format: rulespec/v1
rules:
  - name: member_of_household
    kind: data_relation
    data_relation:
      predicate: us:statutes/7/2012/j#relation.member_of_household
      arity: 2
`;
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: content })}
        loading={false}
        jurisdiction="us"
      />
    );
    expect(
      screen.getByText("Data relation relation.member_of_household")
    ).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.queryByText(/no `versions`/i)).toBeNull();
  });

  it("renders an encoded-subsections list when the rule has no YAML but its descendants do", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tree: [
            { path: "statutes/26/3101/a.yaml", type: "blob" },
            { path: "statutes/26/3101/b/1.yaml", type: "blob" },
            { path: "statutes/26/3101/b/2.yaml", type: "blob" },
            { path: "statutes/26/63/c/5.yaml", type: "blob" },
          ],
        }),
      })
    );
    render(
      <RuleSpecTab
        encoding={null}
        loading={false}
        jurisdiction="us"
        citationPath="us/statute/26/3101"
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/Encoded in subsections/i)).toBeInTheDocument()
    );
    expect(
      screen.getByText(/3 subsections have a RuleSpec encoding/i)
    ).toBeInTheDocument();
    // Each descendant becomes a link to its rule page, labelled
    // relative to the parent so it reads as "(a)" / "(b)/(1)".
    expect(screen.getByText("(a)").closest("a")).toHaveAttribute(
      "href",
      "/axiom/us/statute/26/3101/a"
    );
    expect(screen.getByText("(b)/(1)").closest("a")).toHaveAttribute(
      "href",
      "/axiom/us/statute/26/3101/b/1"
    );
  });

  it("falls back to the bare 'Not yet encoded' state when no descendants are encoded either", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tree: [] }),
      })
    );
    render(
      <RuleSpecTab
        encoding={null}
        loading={false}
        jurisdiction="us"
        citationPath="us/statute/26/9999"
      />
    );
    expect(screen.getByText(/Not yet encoded/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Encoded in subsections/i)
    ).toBeNull();
  });

  it("anchors each rule by name so cross-rule links scroll into view", () => {
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: TWO_RULES_DOC })}
        loading={false}
        jurisdiction="us"
      />
    );
    // Each rule renders as an article anchored at #rule-<name> so the
    // jurisdiction-level URL hash drops the reader into the right card.
    expect(document.getElementById("rule-rate")).not.toBeNull();
    expect(document.getElementById("rule-tax")).not.toBeNull();
  });

  it("handles an empty input/output table without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `- name: bare
  output:
    tax: 0
`,
      })
    );
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: TWO_RULES_DOC })}
        loading={false}
        jurisdiction="us"
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/^\(1\)$/)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /Tests/i }));
    // The empty-input branch renders a ∅ glyph.
    expect(screen.getByText("∅")).toBeInTheDocument();
  });
});
