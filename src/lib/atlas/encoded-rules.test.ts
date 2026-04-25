import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEq, mockNot, mockOrder, mockLimit } = vi.hoisted(() => ({
  mockEq: vi.fn(),
  mockNot: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
}));

const queryResult = { current: { data: [] as unknown[], error: null as unknown } };

vi.mock("@/lib/supabase", () => ({
  supabaseAkn: {
    from: () => ({
      select: () => ({
        eq: (...a: unknown[]) => {
          mockEq(...a);
          return {
            eq: (...b: unknown[]) => {
              mockEq(...b);
              return {
                not: (...c: unknown[]) => {
                  mockNot(...c);
                  return {
                    order: (...d: unknown[]) => {
                      mockOrder(...d);
                      return {
                        limit: (...e: unknown[]) => {
                          mockLimit(...e);
                          return Promise.resolve(queryResult.current);
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      }),
    }),
  },
}));

import {
  getEncodedRulesForJurisdiction,
  groupEncodedRules,
} from "./encoded-rules";

function rule(citationPath: string) {
  return {
    id: citationPath,
    citation_path: citationPath,
    heading: null,
    body: null,
    jurisdiction: citationPath.split("/")[0],
    doc_type: "statute",
    parent_id: null,
    level: 0,
    ordinal: 0,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: null,
    rac_path: null,
    has_rac: true,
    created_at: "",
    updated_at: "",
  };
}

describe("getEncodedRulesForJurisdiction", () => {
  beforeEach(() => {
    mockEq.mockReset();
    mockNot.mockReset();
    mockOrder.mockReset();
    mockLimit.mockReset();
  });

  it("queries with jurisdiction + has_rac=true filters and a citation_path order", async () => {
    queryResult.current = {
      data: [rule("uk/legislation/uksi/2002/1792/regulation/4A/2")],
      error: null,
    };
    const out = await getEncodedRulesForJurisdiction("uk");
    expect(out).toHaveLength(1);
    expect(mockEq).toHaveBeenCalledWith("jurisdiction", "uk");
    expect(mockEq).toHaveBeenCalledWith("has_rac", true);
    expect(mockNot).toHaveBeenCalledWith("citation_path", "is", null);
    expect(mockOrder).toHaveBeenCalledWith("citation_path", { ascending: true });
    expect(mockLimit).toHaveBeenCalledWith(1000);
  });

  it("returns empty list on supabase error", async () => {
    queryResult.current = { data: null, error: { message: "boom" } };
    const out = await getEncodedRulesForJurisdiction("uk");
    expect(out).toEqual([]);
  });

  it("respects a custom limit", async () => {
    queryResult.current = { data: [], error: null };
    await getEncodedRulesForJurisdiction("uk", 50);
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});

describe("groupEncodedRules", () => {
  it("returns an empty array for an empty input", () => {
    expect(groupEncodedRules([])).toEqual([]);
  });

  it("buckets rules by their first 5 citation_path segments", () => {
    const rules = [
      rule("uk/legislation/uksi/2002/1792/regulation/4A/2"),
      rule("uk/legislation/uksi/2002/1792/regulation/4B/1"),
      rule("uk/legislation/uksi/2013/376/regulation/22/3"),
    ];
    const groups = groupEncodedRules(rules);
    expect(groups).toHaveLength(2);
    expect(groups[0].prefix).toBe("uk/legislation/uksi/2002/1792");
    expect(groups[0].rules).toHaveLength(2);
    expect(groups[1].prefix).toBe("uk/legislation/uksi/2013/376");
    expect(groups[1].rules).toHaveLength(1);
  });

  it("sorts groups by descending rule count", () => {
    const rules = [
      rule("uk/legislation/uksi/2013/376/regulation/22/3"),
      rule("uk/legislation/uksi/2002/1792/regulation/4A/2"),
      rule("uk/legislation/uksi/2002/1792/regulation/4B/1"),
      rule("uk/legislation/uksi/2002/1792/regulation/4C/1"),
    ];
    const groups = groupEncodedRules(rules);
    expect(groups[0].rules).toHaveLength(3);
    expect(groups[1].rules).toHaveLength(1);
  });

  it("handles short citation paths by using whatever segments exist", () => {
    const rules = [rule("ca/statute/X")];
    const groups = groupEncodedRules(rules);
    expect(groups).toHaveLength(1);
    expect(groups[0].prefix).toBe("ca/statute/X");
  });
});
