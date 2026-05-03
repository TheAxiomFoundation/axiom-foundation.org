import { describe, it, expect } from "vitest";
import {
  parseRuleSpec,
  parseRuleSpecTests,
  tokenizeFormula,
} from "./doc";

const SAMPLE = `format: rulespec/v1
module:
  summary: |-
    Internal Revenue Code §3101(a) imposes the OASDI tax.
rules:
  - name: oasdi_wage_tax_rate
    kind: parameter
    dtype: Rate
    versions:
      - effective_from: '1990-01-01'
        formula: '0.062'
  - name: oasdi_wage_tax
    kind: derived
    entity: TaxUnit
    dtype: Money
    period: Year
    unit: USD
    source: 26 USC 3101(a)
    source_url: https://www.law.cornell.edu/uscode/text/26/3101
    versions:
      - effective_from: '1990-01-01'
        formula: wages * oasdi_wage_tax_rate
`;

describe("parseRuleSpec", () => {
  it("extracts module summary, format, and all declared rules", () => {
    const doc = parseRuleSpec(SAMPLE);
    expect(doc.format).toBe("rulespec/v1");
    expect(doc.module.summary).toMatch(/OASDI tax/);
    expect(doc.rules).toHaveLength(2);
    expect(doc.parseErrors).toEqual([]);

    const [param, derived] = doc.rules;
    expect(param.name).toBe("oasdi_wage_tax_rate");
    expect(param.kind).toBe("parameter");
    expect(param.dtype).toBe("Rate");
    expect(param.versions[0]).toEqual({
      effective_from: "1990-01-01",
      effective_to: null,
      formula: "0.062",
    });

    expect(derived.entity).toBe("TaxUnit");
    expect(derived.period).toBe("Year");
    expect(derived.unit).toBe("USD");
    expect(derived.source).toBe("26 USC 3101(a)");
    expect(derived.source_url).toBe(
      "https://www.law.cornell.edu/uscode/text/26/3101"
    );
    expect(derived.versions[0].formula).toBe("wages * oasdi_wage_tax_rate");
  });

  it("returns an empty doc with errors when YAML is malformed", () => {
    const doc = parseRuleSpec(":\n  bad: [unterminated");
    expect(doc.rules).toHaveLength(0);
    expect(doc.parseErrors[0]).toMatch(/YAML parse error/);
  });

  it("flags a non-mapping document root as a parse error", () => {
    const doc = parseRuleSpec("- just\n- a\n- list\n");
    expect(doc.rules).toHaveLength(0);
    expect(doc.parseErrors).toContain("document root is not a mapping");
  });

  it("records soft errors for missing rule names and stray rules-as-mapping", () => {
    const content = `rules:
  - kind: parameter
  - name: ok
    kind: parameter
`;
    const doc = parseRuleSpec(content);
    expect(doc.rules.map((r) => r.name)).toEqual(["ok"]);
    expect(doc.parseErrors.some((e) => e.includes("missing"))).toBe(true);
  });

  it("records a soft error when `rules` is not a list", () => {
    const doc = parseRuleSpec("rules:\n  not: a list\n");
    expect(doc.rules).toHaveLength(0);
    expect(doc.parseErrors).toContain("`rules` is not a list");
  });

  it("records a soft error for non-mapping rule entries", () => {
    const doc = parseRuleSpec("rules:\n  - just-a-string\n  - 42\n");
    expect(doc.rules).toHaveLength(0);
    expect(doc.parseErrors.filter((e) => e.includes("not a mapping"))).toHaveLength(2);
  });

  it("records a soft error when a rule has no `versions` list", () => {
    const doc = parseRuleSpec("rules:\n  - name: solo\n");
    expect(doc.rules[0].versions).toEqual([]);
    expect(doc.parseErrors.some((e) => e.includes("no `versions`"))).toBe(true);
  });

  it("flags non-mapping version entries", () => {
    const doc = parseRuleSpec(
      "rules:\n  - name: r\n    versions:\n      - just-a-string\n"
    );
    expect(doc.rules[0].versions[0]).toEqual({
      effective_from: null,
      formula: null,
    });
    expect(doc.parseErrors).toContain("version entry is not a mapping");
  });

  it("falls back to default module shape when ``module`` is missing", () => {
    const doc = parseRuleSpec("rules: []\n");
    expect(doc.module.summary).toBeNull();
  });

  it("preserves source_verification when present in module", () => {
    const doc = parseRuleSpec(`module:
  source_verification:
    values:
      foo: 1
rules: []
`);
    expect(doc.module.source_verification).toEqual({ values: { foo: 1 } });
  });

  it("coerces numeric scalars to strings in version fields", () => {
    const doc = parseRuleSpec(
      "rules:\n  - name: r\n    versions:\n      - effective_from: 2020\n        formula: 3\n"
    );
    expect(doc.rules[0].versions[0]).toEqual({
      effective_from: "2020",
      effective_to: null,
      formula: "3",
    });
  });
});

describe("parseRuleSpecTests", () => {
  it("returns the test cases verbatim", () => {
    const content = `- name: zero_in_zero_out
  period:
    period_kind: tax_year
    start: '2026-01-01'
    end: '2026-12-31'
  input:
    wages: 0
  output:
    oasdi_wage_tax: 0
- name: pays_six_two_percent
  period: { period_kind: tax_year, start: '2026-01-01', end: '2026-12-31' }
  input:
    wages: 100000
  output:
    oasdi_wage_tax: 6200
`;
    const tests = parseRuleSpecTests(content);
    expect(tests).toHaveLength(2);
    expect(tests[0].name).toBe("zero_in_zero_out");
    expect(tests[0].input).toEqual({ wages: 0 });
    expect(tests[1].output).toEqual({ oasdi_wage_tax: 6200 });
  });

  it("returns an empty list when YAML is malformed", () => {
    expect(parseRuleSpecTests(":\n  -\nbad")).toEqual([]);
  });

  it("returns an empty list when the root is not a list", () => {
    expect(parseRuleSpecTests("name: x\ninput: {}\n")).toEqual([]);
  });

  it("skips entries without a name and entries that are not mappings", () => {
    const content = `- input: { wages: 1 }
- just-a-scalar
- name: keeper
  input:
    wages: 2
`;
    const tests = parseRuleSpecTests(content);
    expect(tests.map((t) => t.name)).toEqual(["keeper"]);
  });

  it("defaults missing input/output blocks to empty objects", () => {
    const content = "- name: bare\n";
    const tests = parseRuleSpecTests(content);
    expect(tests[0]).toMatchObject({
      name: "bare",
      input: {},
      output: {},
      period: null,
    });
  });
});

describe("tokenizeFormula", () => {
  it("flags identifiers but leaves operators and numbers as plain text", () => {
    const segs = tokenizeFormula("wages * oasdi_wage_tax_rate");
    expect(segs).toEqual([
      { text: "wages", isIdentifier: true },
      { text: " * ", isIdentifier: false },
      { text: "oasdi_wage_tax_rate", isIdentifier: true },
    ]);
  });

  it("does not flag reserved words like ``and``, ``or``, ``max``", () => {
    const segs = tokenizeFormula("max(0, a) and not b");
    const ids = segs.filter((s) => s.isIdentifier).map((s) => s.text);
    expect(ids).toEqual(["a", "b"]);
  });

  it("emits a single non-identifier segment for purely-symbolic formulas", () => {
    expect(tokenizeFormula("0.062")).toEqual([
      { text: "0.062", isIdentifier: false },
    ]);
  });

  it("preserves trailing non-identifier text", () => {
    const segs = tokenizeFormula("a + 1");
    expect(segs[segs.length - 1]).toEqual({ text: " + 1", isIdentifier: false });
  });

  it("returns an empty list for an empty formula", () => {
    expect(tokenizeFormula("")).toEqual([]);
  });
});
