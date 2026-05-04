import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RuleInlineSummary } from "./rule-inline-summary";
import type { Rule } from "@/lib/supabase";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-rule-descendants", () => ({
  useRuleDescendants: () => ({ descendants: [] }),
}));

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "rule-273-3",
    jurisdiction: "us",
    doc_type: "regulation",
    parent_id: null,
    level: 0,
    ordinal: 3,
    heading: "Residency",
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: "sources/us/regulation/2026-05-01/ecfr/title-7.xml",
    citation_path: "us/regulation/7/273/3",
    rulespec_path: null,
    has_rulespec: false,
    created_at: "2026-05-01",
    updated_at: "2026-05-01",
    ...overrides,
  };
}

describe("RuleInlineSummary", () => {
  it("keeps body-labelled subsections together when they are not child rules", () => {
    render(
      <RuleInlineSummary
        rule={makeRule({
          body:
            "(a) A household shall live in the State in which it files an application.\n\n" +
            "(b) When a household moves within the State, the State agency may require reapplication.",
        })}
        children={[]}
      />
    );

    expect(screen.queryByText("In this section")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "(a)" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("rule-body-inline")
    ).toHaveTextContent(
      "(a) A household shall live in the State in which it files an application."
    );
    expect(
      screen.getByTestId("rule-body-inline")
    ).toHaveTextContent(
      "(b) When a household moves within the State, the State agency may require reapplication."
    );
  });
});
