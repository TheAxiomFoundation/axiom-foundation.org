import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { EncodingRail } from "./encoding-rail";
import type { RuleEncodingData } from "@/lib/supabase";
import { _resetRawFetchCache } from "@/lib/axiom/rulespec/raw-cache";

const YAML = [
  "format: rulespec/v1",
  "module:",
  "  name: eitc",
  "rules:",
  "  - name: rule_for_a",
  "    kind: derived",
  "    source: 26 USC 32(a)",
  "    versions:",
  "      - effective_from: '2026-01-01'",
  "        formula: 'x'",
  "  - name: rule_for_b",
  "    kind: derived",
  "    source: 26 USC 32(b)",
  "    versions:",
  "      - effective_from: '2026-01-01'",
  "        formula: 'y'",
].join("\n");

function makeEncoding(): RuleEncodingData {
  return {
    encoding_run_id: "github:statutes/26/32.yaml",
    citation: "26 USC 32",
    session_id: null,
    file_path: "statutes/26/32.yaml",
    rulespec_content: YAML,
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
  };
}

const CHUNKS = [
  { anchor: "a", label: "(a) Allowance of credit" },
  { anchor: "b", label: "(b) Percentages" },
];
const ENCODED_RULES = [
  { name: "rule_for_a", kind: "derived", anchors: ["a"] },
  { name: "rule_for_b", kind: "derived", anchors: ["b"] },
];
const ALL_GROUPS = [
  { anchor: "a", label: "(a) Allowance of credit", ruleNames: ["rule_for_a"] },
  { anchor: "b", label: "(b) Percentages", ruleNames: ["rule_for_b"] },
];

/** Mount fake subsection targets and control their reading-line
 *  positions; the scroll-spy reads getBoundingClientRect().top. */
function placeSections(tops: Record<string, number>) {
  for (const [id, top] of Object.entries(tops)) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("section");
      el.id = id;
      document.body.appendChild(el);
    }
    el.getBoundingClientRect = () =>
      ({ top, bottom: top + 1000, left: 0, right: 0, width: 0, height: 1000, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  }
}

function scrollTo(tops: Record<string, number>) {
  placeSections(tops);
  act(() => {
    fireEvent.scroll(window);
  });
}

function renderRail() {
  return render(
    <EncodingRail
      encoding={makeEncoding()}
      jurisdiction="us"
      citationPath="us/statute/26/32"
      isRepealed={false}
      chunks={CHUNKS}
      encodedRules={ENCODED_RULES}
      allGroups={ALL_GROUPS}
    />
  );
}

describe("EncodingRail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    // Async like a real frame — the hook assigns the frame id before
    // the callback runs and clears it inside the callback.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _resetRawFetchCache();
    document.body.innerHTML = "";
  });

  it("shows all groups before any subsection crosses the reading line", () => {
    placeSections({ a: 500, b: 1500 });
    renderRail();
    expect(screen.getByText("(a) Allowance of credit")).toBeInTheDocument();
    expect(screen.getByText("(b) Percentages")).toBeInTheDocument();
  });

  it("follows scroll: shows only the active subsection's rules", async () => {
    placeSections({ a: 500, b: 1500 });
    renderRail();

    scrollTo({ a: -200, b: 900 }); // reading (a)
    await waitFor(() => {
      expect(screen.getByText("(a) Allowance of credit")).toBeInTheDocument();
      expect(screen.queryByText("(b) Percentages")).not.toBeInTheDocument();
    });
    expect(screen.getByText("rule_for_a")).toBeInTheDocument();
    expect(screen.queryByText("rule_for_b")).not.toBeInTheDocument();

    scrollTo({ a: -1200, b: 100 }); // reading (b)
    await waitFor(() => {
      expect(screen.getByText("(b) Percentages")).toBeInTheDocument();
      expect(screen.queryByText("(a) Allowance of credit")).not.toBeInTheDocument();
    });
    expect(screen.getByText("rule_for_b")).toBeInTheDocument();
  });

  it("the All toggle restores the full grouping while reading a subsection", async () => {
    placeSections({ a: 500, b: 1500 });
    renderRail();
    scrollTo({ a: -200, b: 900 });
    await waitFor(() =>
      expect(screen.queryByText("(b) Percentages")).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("(a) Allowance of credit")).toBeInTheDocument();
    expect(screen.getByText("(b) Percentages")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() =>
      expect(screen.queryByText("(b) Percentages")).not.toBeInTheDocument()
    );
  });

  it("shows an empty state for subsections nothing cites", async () => {
    renderRail();
    scrollTo({ a: -200, b: 900 });
    // Re-point (a)'s rules at nothing by scrolling to a chunk with no rules
    // — simulate by rendering with a rule-less chunk instead.
    document.body.innerHTML = "";
    render(
      <EncodingRail
        encoding={makeEncoding()}
        jurisdiction="us"
        citationPath="us/statute/26/32"
        isRepealed={false}
        chunks={[{ anchor: "j", label: "(j) Inflation adjustments" }]}
        encodedRules={[{ name: "rule_for_a", kind: "derived", anchors: ["a"] }]}
        allGroups={[]}
      />
    );
    scrollTo({ j: -50 });
    await waitFor(() =>
      expect(
        screen.getByText("No rules cite this subsection directly.")
      ).toBeInTheDocument()
    );
  });
});
