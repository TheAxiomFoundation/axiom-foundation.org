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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an effective-from → effective-to arrow when a sunset is declared", () => {
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: TWO_RULES_DOC })}
        loading={false}
        jurisdiction="us"
      />
    );
    expect(screen.getAllByText("2020-01-01").length).toBeGreaterThan(0);
    expect(screen.getByText("2024-12-31")).toBeInTheDocument();
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

  it("renders an orphan-tests block when output keys do not match any local rule", async () => {
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
    await waitFor(() =>
      expect(
        screen.getByText(/Tests not bound to a rule \(1\)/i)
      ).toBeInTheDocument()
    );
    expect(screen.getByText("stranded")).toBeInTheDocument();
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

  it("does not link a formula identifier that is not a local rule name", () => {
    const onlyOne = `format: rulespec/v1
rules:
  - name: tax
    versions:
      - effective_from: '2020-01-01'
        formula: rate * wages
`;
    render(
      <RuleSpecTab
        encoding={makeEncoding({ rulespec_content: onlyOne })}
        loading={false}
        jurisdiction="us"
      />
    );
    // ``rate`` and ``wages`` are not declared in this doc, so no
    // anchor element should be emitted for them.
    expect(screen.queryByText("rate", { selector: "a" })).toBeNull();
    expect(screen.queryByText("wages", { selector: "a" })).toBeNull();
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
