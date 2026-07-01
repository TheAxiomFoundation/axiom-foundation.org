import { describe, expect, it } from "vitest";
import {
  HERO_SUGGESTIONS,
  SEARCH_SUGGESTIONS,
} from "./search-suggestions";

describe("search suggestions", () => {
  it("are unique, searchable, and documented", () => {
    const queries = SEARCH_SUGGESTIONS.map((s) => s.query);
    expect(new Set(queries).size).toBe(queries.length);
    for (const suggestion of SEARCH_SUGGESTIONS) {
      // Long enough to clear the search input's MIN_QUERY_LEN.
      expect(suggestion.query.trim().length).toBeGreaterThanOrEqual(2);
      // Every suggestion documents what it demonstrates — the reminder
      // to re-verify it against live search when the set changes.
      expect(suggestion.hint.length).toBeGreaterThan(0);
    }
  });

  it("hero subset comes from the main set", () => {
    for (const suggestion of HERO_SUGGESTIONS) {
      expect(SEARCH_SUGGESTIONS).toContain(suggestion);
    }
    expect(HERO_SUGGESTIONS.length).toBeLessThanOrEqual(3);
  });
});
