import { describe, expect, it } from "vitest";
import { budgetedChunks } from "./budgeted-chunks.mjs";

const row = (bytes: number) => ({ rule_yaml: "x".repeat(bytes) });

describe("budgetedChunks", () => {
  it("splits on the byte budget before the row bound", () => {
    const rows = [row(400_000), row(400_000), row(400_000)];
    const chunks = budgetedChunks(rows, 200, 700_000);
    expect(chunks.map((chunk) => chunk.length)).toEqual([1, 1, 1]);
  });

  it("splits on the row bound for small rows", () => {
    const rows = Array.from({ length: 5 }, () => row(10));
    expect(budgetedChunks(rows, 2, 700_000).map((c) => c.length)).toEqual([
      2, 2, 1,
    ]);
  });

  it("ships an oversized row alone instead of dropping it", () => {
    const rows = [row(10), row(2_000_000), row(10)];
    const chunks = budgetedChunks(rows, 200, 700_000);
    expect(chunks.map((chunk) => chunk.length)).toEqual([1, 1, 1]);
    expect(chunks.flat()).toHaveLength(3);
  });

  it("returns nothing for no rows", () => {
    expect(budgetedChunks([], 200, 700_000)).toEqual([]);
  });
});
