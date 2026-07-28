import { describe, it, expect } from "vitest";
import { filterStandaloneRules } from "./compose-filter";
import type { ProgramGraph, RuleNode } from "./types";

function rule(overrides: Partial<RuleNode>): RuleNode {
  return {
    legalId: "us:statutes/1#rule",
    name: "rule",
    fileLegalId: "us:statutes/1",
    kind: "derived",
    entity: null,
    dtype: null,
    period: null,
    unit: null,
    source: null,
    ruleDeps: [],
    inputDeps: [],
    relationDeps: [],
    ...overrides,
  };
}

function graph(rules: RuleNode[], outputs?: string[]): ProgramGraph {
  return {
    rules,
    inputs: [],
    relations: [],
    ownOutputs: outputs ?? rules.map((r) => r.legalId),
    terminalOutputs: outputs ?? rules.map((r) => r.legalId),
  };
}

describe("filterStandaloneRules", () => {
  const fosterCare = rule({
    legalId: "f#foster_care",
    name: "foster_care",
  });
  const netIncome = rule({
    legalId: "f#net_income",
    name: "net_income",
    ruleDeps: ["f#gross_income"],
  });
  const grossIncome = rule({
    legalId: "f#gross_income",
    name: "gross_income",
    inputDeps: ["f#input.wages"],
  });

  it("hides zero-dep zero-dependent rules and reports the count", () => {
    const { graph: filtered, hiddenCount } = filterStandaloneRules(
      graph([fosterCare, netIncome, grossIncome]),
    );
    expect(hiddenCount).toBe(1);
    expect(filtered.rules.map((r) => r.legalId)).toEqual([
      "f#net_income",
      "f#gross_income",
    ]);
    // Outputs lists shed the hidden ids too.
    expect(filtered.ownOutputs).not.toContain("f#foster_care");
  });

  it("keeps referenced no-dep rules (parameters someone consumes)", () => {
    const parameter = rule({
      legalId: "f#max_allotment",
      name: "max_allotment",
      kind: "parameter",
    });
    const consumer = rule({
      legalId: "f#allotment",
      name: "allotment",
      ruleDeps: ["f#max_allotment"],
    });
    const { graph: filtered, hiddenCount } = filterStandaloneRules(
      graph([parameter, consumer, fosterCare]),
    );
    expect(hiddenCount).toBe(1);
    expect(filtered.rules.map((r) => r.legalId)).toContain(
      "f#max_allotment",
    );
  });

  it("keeps input-fed rules even with no rule deps", () => {
    const { hiddenCount } = filterStandaloneRules(
      graph([grossIncome, fosterCare]),
    );
    expect(hiddenCount).toBe(1);
  });

  it("keeps relation-fed rules", () => {
    const relationFed = rule({
      legalId: "f#member_count",
      name: "member_count",
      relationDeps: ["f#relation.members"],
    });
    const { graph: filtered } = filterStandaloneRules(
      graph([relationFed, fosterCare, netIncome, grossIncome]),
    );
    expect(filtered.rules.map((r) => r.legalId)).toContain(
      "f#member_count",
    );
  });

  it("filters nothing when EVERY rule is standalone — a glossary page must still render", () => {
    const glossary = graph([
      fosterCare,
      rule({ legalId: "f#household", name: "household" }),
    ]);
    const { graph: filtered, hiddenCount } =
      filterStandaloneRules(glossary);
    expect(hiddenCount).toBe(0);
    expect(filtered).toBe(glossary);
  });

  it("is a no-op on graphs with no standalone rules", () => {
    const clean = graph([netIncome, grossIncome]);
    const { graph: filtered, hiddenCount } = filterStandaloneRules(clean);
    expect(hiddenCount).toBe(0);
    expect(filtered).toBe(clean);
  });
});
