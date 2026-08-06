import { describe, expect, it } from "vitest";

import { evalAst, parseFormula } from "./formula";

describe("exactly_one in the formula surface", () => {
  it("parses as one call node with n arguments", () => {
    const ast = parseFormula("exactly_one(a, b, c, d)");
    expect(ast.kind).toBe("call");
    if (ast.kind !== "call") return;
    expect(ast.name).toBe("exactly_one");
    expect(ast.args).toHaveLength(4);
    expect(ast.args.every((arg) => arg.kind === "ident")).toBe(true);
  });

  it("evaluates the gate over boolean arguments", () => {
    const ast = parseFormula("exactly_one(a, b, c)");
    const truth = (values: Record<string, boolean>) =>
      evalAst(ast, (name) => values[name] ?? null);
    expect(truth({ a: true, b: false, c: false })).toBe(true);
    expect(truth({ a: false, b: true, c: false })).toBe(true);
    expect(truth({ a: true, b: true, c: false })).toBe(false);
    expect(truth({ a: false, b: false, c: false })).toBe(false);
    expect(truth({ a: true, b: true, c: true })).toBe(false);
  });

  it("stays null when any argument is unknown — the trace owns the verdict", () => {
    const ast = parseFormula("exactly_one(a, b)");
    expect(evalAst(ast, (name) => (name === "a" ? true : null))).toBeNull();
  });
});
