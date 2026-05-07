import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, builders } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  builders: [] as QueryBuilder[],
}));

vi.mock("@/lib/supabase", () => ({
  supabaseCorpus: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  getNavigationDocTypes,
  getNavigationIndexChildren,
  getNavigationIndexNode,
  getNavigationIndexPrefixRows,
  getProvisionForNavigationNode,
  navigationDocTypeToTreeNode,
  navigationRowToTreeNode,
  NavigationIndexMissingError,
  NavigationIndexUnavailableError,
} from "./read";
import type { NavigationNodeRow } from "./types";

type QueryResult = {
  data?: unknown;
  count?: number | null;
  error?: unknown;
};

class QueryBuilder implements PromiseLike<QueryResult> {
  calls: Array<{ method: string; args: unknown[] }> = [];

  constructor(private readonly result: QueryResult | Promise<QueryResult>) {}

  select(...args: unknown[]) {
    return this.call("select", args);
  }

  eq(...args: unknown[]) {
    return this.call("eq", args);
  }

  gte(...args: unknown[]) {
    return this.call("gte", args);
  }

  lt(...args: unknown[]) {
    return this.call("lt", args);
  }

  is(...args: unknown[]) {
    return this.call("is", args);
  }

  order(...args: unknown[]) {
    return this.call("order", args);
  }

  limit(...args: unknown[]) {
    return this.call("limit", args);
  }

  range(...args: unknown[]) {
    return this.call("range", args);
  }

  or(...args: unknown[]) {
    return this.call("or", args);
  }

  maybeSingle(...args: unknown[]) {
    return this.call("maybeSingle", args);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }

  private call(method: string, args: unknown[]) {
    this.calls.push({ method, args });
    return this;
  }
}

function enqueue(result: QueryResult | Promise<QueryResult>): QueryBuilder {
  const builder = new QueryBuilder(result);
  builders.push(builder);
  mockFrom.mockReturnValueOnce(builder);
  return builder;
}

function navRow(
  overrides: Partial<NavigationNodeRow> = {}
): NavigationNodeRow {
  return {
    id: "nav-1",
    jurisdiction: "us",
    doc_type: "statute",
    path: "us/statute/26",
    parent_path: null,
    segment: "26",
    label: "Title 26",
    sort_key: "000026",
    depth: 2,
    provision_id: "provision-1",
    citation_path: "us/statute/26",
    has_children: true,
    child_count: 12,
    has_rulespec: false,
    encoded_descendant_count: 0,
    status: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
    ...overrides,
  };
}

function calls(builder: QueryBuilder, method: string): unknown[][] {
  return builder.calls
    .filter((call) => call.method === method)
    .map((call) => call.args);
}

beforeEach(() => {
  mockFrom.mockReset();
  builders.length = 0;
});

describe("navigation index read helpers", () => {
  it("loads distinct root document segments and maps explicit roots", async () => {
    const builder = enqueue({
      data: [
        { doc_type: "regulation", path: "uk/legislation" },
        { doc_type: "regulation", path: "uk/legislation" },
        { doc_type: "statute", path: "us/statute/26" },
      ],
    });

    await expect(getNavigationDocTypes("uk", false)).resolves.toEqual({
      docTypes: ["legislation", "statute"],
    });

    expect(mockFrom).toHaveBeenCalledWith("navigation_nodes");
    expect(calls(builder, "select")[0]).toEqual([
      "doc_type,path,has_rulespec,encoded_descendant_count",
    ]);
    expect(calls(builder, "eq")).toContainEqual(["jurisdiction", "uk"]);
    expect(calls(builder, "is")).toContainEqual(["parent_path", null]);
  });

  it("filters root document segments for encoded descendants", async () => {
    const builder = enqueue({
      data: [{ doc_type: "regulation", path: "us/regulation" }],
    });

    await expect(getNavigationDocTypes("us", true)).resolves.toEqual({
      docTypes: ["regulation"],
    });

    expect(calls(builder, "or")).toContainEqual([
      "has_rulespec.eq.true,encoded_descendant_count.gt.0",
    ]);
  });

  it("throws a missing-index error for an empty unfiltered jurisdiction", async () => {
    enqueue({ data: [] });

    await expect(getNavigationDocTypes("canada", false)).rejects.toThrow(
      NavigationIndexMissingError
    );
  });

  it("throws an unavailable error when the index query errors", async () => {
    enqueue({ error: { message: "statement timeout" } });

    await expect(getNavigationDocTypes("us", false)).rejects.toThrow(
      NavigationIndexUnavailableError
    );
  });

  it("loads paged child rows and computes hasMore from the exact count", async () => {
    const row = navRow();
    const builder = enqueue({ data: [row], count: 201 });

    const result = await getNavigationIndexChildren({
      jurisdiction: "us",
      docType: "statute",
      parentPath: "us/statute",
      encodedOnly: true,
      page: 1,
    });

    expect(result).toEqual({ rows: [row], total: 201, hasMore: true });
    expect(calls(builder, "eq")).toContainEqual(["doc_type", "statute"]);
    expect(calls(builder, "eq")).toContainEqual([
      "parent_path",
      "us/statute",
    ]);
    expect(calls(builder, "range")).toContainEqual([100, 199]);
    expect(calls(builder, "or")).toContainEqual([
      "has_rulespec.eq.true,encoded_descendant_count.gt.0",
    ]);
  });

  it("loads sparse prefix rows for paths whose intermediate parents are omitted", async () => {
    const row = navRow({
      path: "us/guidance/usda/fns/snap-fy2026-cola",
      doc_type: "guidance",
    });
    const builder = enqueue({ data: [row] });

    const result = await getNavigationIndexPrefixRows({
      jurisdiction: "us",
      docType: "guidance",
      pathPrefix: "us/guidance/usda",
      encodedOnly: true,
    });

    expect(result).toEqual([row]);
    expect(calls(builder, "eq")).toContainEqual(["jurisdiction", "us"]);
    expect(calls(builder, "eq")).toContainEqual(["doc_type", "guidance"]);
    expect(calls(builder, "gte")).toContainEqual([
      "path",
      "us/guidance/usda/",
    ]);
    expect(calls(builder, "lt")).toContainEqual(["path", "us/guidance/usda~"]);
    expect(calls(builder, "or")).toContainEqual([
      "has_rulespec.eq.true,encoded_descendant_count.gt.0",
    ]);
  });

  it("loads root child rows with a null parent path", async () => {
    const builder = enqueue({ data: [], count: 0 });

    await getNavigationIndexChildren({
      jurisdiction: "us",
      docType: "statute",
      parentPath: null,
      encodedOnly: false,
      page: 0,
    });

    expect(calls(builder, "is")).toContainEqual(["parent_path", null]);
  });

  it("loads a single navigation node by path", async () => {
    const row = navRow();
    const builder = enqueue({ data: row });

    await expect(getNavigationIndexNode("us/statute/26")).resolves.toEqual(row);

    expect(calls(builder, "eq")).toContainEqual(["path", "us/statute/26"]);
    expect(calls(builder, "maybeSingle")).toHaveLength(1);
  });

  it("loads the provision linked from a navigation node id", async () => {
    const provision = { id: "provision-1", citation_path: "us/statute/26" };
    const builder = enqueue({ data: provision });

    await expect(
      getProvisionForNavigationNode(navRow({ provision_id: "provision-1" }))
    ).resolves.toEqual(provision);

    expect(mockFrom).toHaveBeenCalledWith("provisions");
    expect(calls(builder, "eq")).toContainEqual(["id", "provision-1"]);
  });

  it("loads the provision by path when no provision id exists", async () => {
    const builder = enqueue({ data: null });

    await expect(
      getProvisionForNavigationNode(navRow({ provision_id: null }))
    ).resolves.toBeNull();

    expect(calls(builder, "eq")).toContainEqual([
      "citation_path",
      "us/statute/26",
    ]);
  });

  it("maps document types and navigation rows into tree nodes", () => {
    expect(navigationDocTypeToTreeNode("statute")).toEqual(
      expect.objectContaining({ segment: "statute", label: "Statutes" })
    );
    expect(navigationDocTypeToTreeNode("policy-guidance")).toEqual(
      expect.objectContaining({
        segment: "policy-guidance",
        label: "Policy Guidance",
      })
    );

    const treeNode = navigationRowToTreeNode(
      navRow({
        child_count: 0,
        has_rulespec: false,
        encoded_descendant_count: 3,
      })
    );

    expect(treeNode).toEqual(
      expect.objectContaining({
        segment: "26",
        label: "Title 26",
        childCount: undefined,
        hasRuleSpec: true,
        rule: expect.objectContaining({
          id: "provision-1",
          citation_path: "us/statute/26",
          updated_at: "2026-05-02T00:00:00Z",
        }),
      })
    );
  });
});
