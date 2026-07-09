import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SectionReader } from "./section-reader";
import type { SectionPageData } from "@/lib/axiom/section-page";
import type { Rule } from "@/lib/supabase";
import { _resetRawFetchCache } from "@/lib/axiom/rulespec/raw-cache";

vi.mock("next/navigation", () => ({
  useSearchParams: () => null,
  useRouter: () => ({ push: vi.fn() }),
}));

const ROOT: Rule = {
  id: "root-1",
  jurisdiction: "us",
  doc_type: "statute",
  parent_id: null,
  level: 3,
  ordinal: 32,
  heading: "Earned income",
  body: "(a) Allowance of credit In general text.\n\n(b) Percentages table text.",
  effective_date: "2026-01-01",
  repeal_date: null,
  source_url: "https://uscode.house.gov/32",
  source_path: null,
  citation_path: "us/statute/26/32",
  rulespec_path: null,
  has_rulespec: true,
  created_at: "",
  updated_at: "",
};

function makeData(overrides: Partial<SectionPageData> = {}): SectionPageData {
  return {
    citationPath: "us/statute/26/32",
    root: ROOT,
    breadcrumbs: [
      { label: "Axiom", href: "/" },
      { label: "United States", href: "/us" },
      { label: "§ 32", href: "/us/statute/26/32" },
    ],
    provisions: [],
    intro: null,
    bodyChunks: [
      {
        anchor: "a",
        designator: "(a)",
        label: "(a) Allowance of credit",
        text: "(a) Allowance of credit In general text.",
        start: 0,
      },
      {
        anchor: "b",
        designator: "(b)",
        label: "(b) Percentages",
        text: "(b) Percentages table text.",
        start: 44,
      },
    ],
    toc: [
      { anchor: "a", label: "(a) Allowance of credit", children: [] },
      { anchor: "b", label: "(b) Percentages", children: [] },
    ],
    rootRefs: [],
    encoding: null,
    encodedRules: [
      { name: "eitc_phased_in", kind: "derived", anchors: ["a"] },
    ],
    focusAnchor: null,
    prev: { citationPath: "us/statute/26/31", label: "§ 31" },
    next: { citationPath: "us/statute/26/33", label: "§ 33" },
    truncated: false,
    ...overrides,
  };
}

describe("SectionReader", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    // jsdom has no scrollIntoView; FocusScroll calls it via rAF.
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _resetRawFetchCache();
    document.body.innerHTML = "";
  });

  it("renders header, chunks, chips, TOC, and neighbors", () => {
    render(<SectionReader data={makeData()} />);
    expect(screen.getByText("Earned income")).toBeInTheDocument();
    expect(screen.getByText("us/statute/26/32")).toBeInTheDocument();
    expect(screen.getByText("Official source")).toHaveAttribute(
      "href",
      "https://uscode.house.gov/32"
    );
    expect(screen.getByText("Encoded · 1 rules")).toBeInTheDocument();
    // Chunk sections with designator links into their own URLs.
    expect(screen.getByTitle("Open us/statute/26/32/a")).toHaveAttribute(
      "href",
      "/axiom/v2/us/statute/26/32/a"
    );
    // Encoded-as chip deep-links into the rail.
    expect(screen.getByText("eitc_phased_in")).toHaveAttribute(
      "href",
      "#rule-eitc_phased_in"
    );
    // Prev/next.
    expect(screen.getByText(/§ 31/)).toHaveAttribute("rel", "prev");
    expect(screen.getByText(/§ 33/)).toHaveAttribute("rel", "next");
  });

  it("highlights and scrolls to the focus anchor", () => {
    render(<SectionReader data={makeData({ focusAnchor: "b" })} />);
    const focused = document.getElementById("b");
    expect(focused?.className).toContain("shadow");
    const other = document.getElementById("a");
    expect(other?.className).not.toContain("shadow");
  });

  it("renders intro text and the truncation notice", () => {
    render(
      <SectionReader
        data={makeData({
          intro: "General chapeau text.",
          truncated: true,
          prev: null,
          next: null,
        })}
      />
    );
    expect(screen.getByText(/General chapeau text/)).toBeInTheDocument();
    expect(screen.getByText(/unusually large/)).toBeInTheDocument();
  });

  it("renders provision rows when the corpus has descendant rows", () => {
    render(
      <SectionReader
        data={makeData({
          bodyChunks: [],
          provisions: [
            {
              rule: {
                ...ROOT,
                id: "child-1",
                heading: "In general",
                body: "Child body text.",
                citation_path: "us/statute/26/32/a",
              },
              anchor: "a",
              designator: "(a)",
              relativeDepth: 1,
            },
            {
              rule: {
                ...ROOT,
                id: "child-2",
                heading: null,
                body: null,
                citation_path: "us/statute/26/32/a/1",
              },
              anchor: "a-1",
              designator: "(a)(1)",
              relativeDepth: 2,
            },
          ],
        })}
      />
    );
    expect(screen.getByText("In general")).toBeInTheDocument();
    expect(screen.getByText("Child body text.")).toBeInTheDocument();
    expect(document.getElementById("a-1")).not.toBeNull();
  });
});
