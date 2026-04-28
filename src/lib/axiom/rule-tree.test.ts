import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIn, mockOrder } = vi.hoisted(() => ({
  mockIn: vi.fn(),
  mockOrder: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseCorpus: {
    from: () => ({
      select: () => ({
        in: (...args: unknown[]) => {
          mockIn(...args);
          // getRuleDescendants chains a single ``.order()`` after
          // ``.in(...)`` which then resolves (awaitable).
          return {
            order: (...ordArgs: unknown[]) => {
              mockOrder(...ordArgs);
              return mockQueryResult;
            },
          };
        },
      }),
    }),
  },
}));

type Rule = {
  id: string;
  parent_id: string | null;
  citation_path: string;
  heading: string | null;
  body: string | null;
  ordinal: number | null;
};

let mockQueryResult: Promise<{ data: Rule[] | null; error: unknown }> =
  Promise.resolve({ data: [], error: null });

import {
  buildRuleTree,
  stripBodyLabel,
  hasSubstantiveBody,
  getRuleDescendants,
} from "./rule-tree";

function r(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "root",
    parent_id: null,
    citation_path: "us/statute/26/32",
    heading: null,
    body: null,
    ordinal: 0,
    ...overrides,
  };
}

describe("stripBodyLabel", () => {
  it("returns empty string for null/empty body", () => {
    expect(stripBodyLabel(r({ body: null }) as never)).toBe("");
    expect(stripBodyLabel(r({ body: "" }) as never)).toBe("");
    expect(stripBodyLabel(r({ body: "   " }) as never)).toBe("");
  });

  it("strips the leading (id) prefix from the body", () => {
    expect(
      stripBodyLabel(
        r({ citation_path: "us/statute/26/24/d", body: "(d) Married text" }) as never
      )
    ).toBe("Married text");
  });

  it("strips a trailing repeat of the heading after the id prefix", () => {
    expect(
      stripBodyLabel(
        r({
          citation_path: "us/statute/26/24/d",
          heading: "Married individuals",
          body: "(d) Married individuals In the case of a married individual",
        }) as never
      )
    ).toBe("In the case of a married individual");
  });

  it("is case-insensitive on the id prefix", () => {
    expect(
      stripBodyLabel(
        r({ citation_path: "us/statute/26/24/A", body: "( A ) Heading text" }) as never
      )
    ).toBe("Heading text");
  });

  it("handles unusual tail characters in the id without breaking the regex", () => {
    // Citation tail "2.5" contains a regex special char.
    expect(
      stripBodyLabel(
        r({
          citation_path: "us-co/statute/crs/26-2-703/2.5",
          body: "(2.5) Something important",
        }) as never
      )
    ).toBe("Something important");
  });

  it("strips leading dashes/em-dashes left by label removal", () => {
    expect(
      stripBodyLabel(
        r({
          citation_path: "us/statute/26/32/a",
          body: "(a) — Allowance — Opens the credit",
        }) as never
      )
    ).toBe("Allowance — Opens the credit");
  });
});

describe("hasSubstantiveBody", () => {
  it("returns true for a rule with real prose", () => {
    expect(
      hasSubstantiveBody(
        r({ body: "(a) Allowance — In the case of an eligible individual" }) as never
      )
    ).toBe(true);
  });

  it("returns false for a stub body that's just the label + heading", () => {
    expect(
      hasSubstantiveBody(
        r({
          citation_path: "us/statute/26/24/d",
          heading: "Married individuals",
          body: "(d) Married individuals",
        }) as never
      )
    ).toBe(false);
  });

  it("returns false for missing body", () => {
    expect(hasSubstantiveBody(r({ body: null }) as never)).toBe(false);
  });
});

describe("buildRuleTree", () => {
  it("returns a root with no children when the descendant list is empty", () => {
    const root = r({ id: "root" });
    const tree = buildRuleTree(root as never, []);
    expect(tree.rule.id).toBe("root");
    expect(tree.children).toEqual([]);
  });

  it("attaches direct children to the root by parent_id", () => {
    const root = r({ id: "root" });
    const descendants = [
      r({ id: "a", parent_id: "root", ordinal: 1, citation_path: "x/a" }),
      r({ id: "b", parent_id: "root", ordinal: 2, citation_path: "x/b" }),
    ];
    const tree = buildRuleTree(root as never, descendants as never);
    expect(tree.children.map((c) => c.rule.id)).toEqual(["a", "b"]);
  });

  it("nests grandchildren under their immediate parent", () => {
    const root = r({ id: "root" });
    const descendants = [
      r({ id: "a", parent_id: "root", ordinal: 1, citation_path: "x/a" }),
      r({ id: "a1", parent_id: "a", ordinal: 1, citation_path: "x/a/1" }),
      r({ id: "a2", parent_id: "a", ordinal: 2, citation_path: "x/a/2" }),
    ];
    const tree = buildRuleTree(root as never, descendants as never);
    expect(tree.children[0].children.map((c) => c.rule.id)).toEqual(["a1", "a2"]);
  });

  it("sorts children by ordinal defensively even when input is out of order", () => {
    const root = r({ id: "root" });
    const descendants = [
      r({ id: "b", parent_id: "root", ordinal: 2, citation_path: "x/b" }),
      r({ id: "a", parent_id: "root", ordinal: 1, citation_path: "x/a" }),
    ];
    const tree = buildRuleTree(root as never, descendants as never);
    expect(tree.children.map((c) => c.rule.id)).toEqual(["a", "b"]);
  });

  it("ignores descendants whose parent is not reachable from the root", () => {
    const root = r({ id: "root" });
    const descendants = [
      r({ id: "orphan", parent_id: "other", citation_path: "x/orphan" }),
    ];
    const tree = buildRuleTree(root as never, descendants as never);
    expect(tree.children).toEqual([]);
  });
});

describe("getRuleDescendants", () => {
  beforeEach(() => {
    mockIn.mockReset();
    mockOrder.mockReset();
  });

  it("returns empty when called with an empty root id", async () => {
    const out = await getRuleDescendants("");
    expect(out).toEqual([]);
    expect(mockIn).not.toHaveBeenCalled();
  });

  it("stops BFS when a level returns no rows", async () => {
    mockQueryResult = Promise.resolve({ data: [], error: null });
    const out = await getRuleDescendants("root");
    expect(out).toEqual([]);
  });

  it("stops BFS when a level errors", async () => {
    mockQueryResult = Promise.resolve({
      data: null,
      error: { message: "boom" },
    });
    const out = await getRuleDescendants("root");
    expect(out).toEqual([]);
  });

  it("collects rules returned by the first level of BFS", async () => {
    mockQueryResult = Promise.resolve({
      data: [
        r({ id: "a", parent_id: "root", citation_path: "x/a" }),
        r({ id: "b", parent_id: "root", citation_path: "x/b" }),
      ],
      error: null,
    });
    const out = await getRuleDescendants("root", 1);
    expect(out.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect(mockIn).toHaveBeenCalledWith("parent_id", ["root"]);
  });
});
