import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { CommandPalette } from "./command-palette";

function emptySearchResponse() {
  return {
    query: "",
    programs: [],
    encoded: [],
    corpus: [],
  };
}

describe("CommandPalette", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPush.mockReset();
    mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(JSON.stringify(emptySearchResponse()), {
          status: 200,
        });
      }
      const path = url.replace("/api/axiom/resolve", "");
      return new Response(JSON.stringify({ href: path }), { status: 200 });
    });
    vi.stubGlobal("fetch", mockFetch);
    // jsdom doesn't implement scrollIntoView; stub it so the
    // cursor-follows-selection effect doesn't blow up.
    (Element.prototype as unknown as {
      scrollIntoView: () => void;
    }).scrollIntoView = () => {};
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <CommandPalette open={false} onClose={vi.fn()} />
    );
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("renders the dialog and input when open", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("shows the empty-state hint when query is empty", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    expect(
      screen.getByText(/Type a citation to jump directly/i)
    ).toBeInTheDocument();
  });

  it("shows a citation row when the input parses as a citation", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "26 USC 32(b)(1)" } });
    expect(screen.getByText("Best match")).toBeInTheDocument();
    expect(screen.getByText("exact citation")).toBeInTheDocument();
    expect(screen.getByText("26 U.S.C. § 32(b)(1)")).toBeInTheDocument();
    expect(screen.getByText("us/statute/26/32/b/1")).toBeInTheDocument();
  });

  it("shows program anchors when the input matches a program", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "SNAP" } });
    expect(screen.getByText("Best match")).toBeInTheDocument();
    expect(screen.getByText("Program / pathway")).toBeInTheDocument();
    // The program name appears on every anchor row; at least one row.
    expect(
      screen.getAllByText("Supplemental Nutrition Assistance Program")
        .length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Income eligibility and deductions")
    ).toBeInTheDocument();
  });

  it("shows Colorado SNAP anchors for the suggested query", () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(
          JSON.stringify({
            ...emptySearchResponse(),
            encoded: [
              {
                filePath: "policies/cdhs/snap/fy-2026-benefit-calculation.yaml",
                citationPath:
                  "us-co/policy/cdhs/snap/fy-2026-benefit-calculation",
                bucket: "policies",
                label: "Utility Allowance",
                jurisdictionLabel: "Colorado",
                matchKind: "symbol",
                symbolMatches: [
                  {
                    name: "snap_standard_utility_allowance",
                    label: "SNAP Standard Utility Allowance",
                    kind: "parameter",
                    source: "Colorado SNAP FY 2026 benefit calculation composition",
                    formula: "household_shelter_costs_incurred + snap_standard_utility_allowance",
                    matchedTerms: ["utility", "allowance"],
                    score: 800,
                  },
                ],
                fileSummary: null,
                score: 730,
              },
            ],
          }),
          { status: 200 }
        );
      }
      const path = url.replace("/api/axiom/resolve", "");
      return new Response(JSON.stringify({ href: path }), { status: 200 });
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "Colorado SNAP" } });

    expect(screen.getByText("Best match")).toBeInTheDocument();
    expect(screen.getAllByText("Colorado SNAP").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Benefit calculation").length).toBeGreaterThan(0);
    expect(screen.getByText("Colorado CDHS SNAP FY 2026")).toBeInTheDocument();
    return waitFor(() => {
      expect(screen.getByText("Best match")).toBeInTheDocument();
      expect(
        screen.getByText("us-co/policy/cdhs/snap/fy-2026-benefit-calculation")
      ).toBeInTheDocument();
      expect(
        screen.getByText("snap_standard_utility_allowance")
      ).toBeInTheDocument();
    });
  });

  it("puts encoded symbol hits before filtered program shortcuts for topic queries", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(
          JSON.stringify({
            ...emptySearchResponse(),
            programs: [
              {
                program: {
                  slug: "colorado-snap",
                  displayName: "Colorado SNAP",
                  aliases: ["co snap"],
                  jurisdiction: "us-co",
                  summary: "Colorado's state-administered SNAP program.",
                  anchors: [],
                },
                anchors: [
                  {
                    role: "benefit_calculation",
                    citationPath:
                      "us-co/policy/cdhs/snap/fy-2026-benefit-calculation",
                    label: "Benefit calculation",
                    displayCitation: "Colorado CDHS SNAP FY 2026",
                  },
                ],
              },
              {
                program: {
                  slug: "snap",
                  displayName: "Supplemental Nutrition Assistance Program",
                  aliases: ["snap"],
                  jurisdiction: "us",
                  summary: "Federal SNAP program.",
                  anchors: [],
                },
                anchors: [
                  {
                    role: "income_tests",
                    citationPath: "us/regulation/7/273/9",
                    label: "Income eligibility and deductions",
                    displayCitation: "7 CFR § 273.9",
                  },
                ],
              },
            ],
            encoded: [
              {
                filePath: "policies/usda/snap/fy-2026-cola/deductions.yaml",
                citationPath: "us/policy/usda/snap/fy-2026-cola/deductions",
                bucket: "policies",
                label: "Standard Deduction",
                jurisdictionLabel: "US Federal",
                matchKind: "symbol",
                symbolMatches: [
                  {
                    name: "snap_standard_deduction",
                    label: "SNAP Standard Deduction",
                    kind: "derived",
                    source: "USDA SNAP FY 2026 maximum allotments and deductions",
                    formula: "snap_standard_deduction_48_states_dc",
                    matchedTerms: ["standard", "deduction"],
                    score: 900,
                  },
                ],
                fileSummary: null,
                score: 1200,
              },
            ],
          }),
          { status: 200 }
        );
      }
      const path = url.replace("/api/axiom/resolve", "");
      return new Response(JSON.stringify({ href: path }), { status: 200 });
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "CO SNAP standard deduction" },
    });

    await waitFor(() => {
      expect(screen.getByText("Best match")).toBeInTheDocument();
      expect(screen.getByText("Standard Deduction")).toBeInTheDocument();
    });
    const text = screen.getByRole("listbox").textContent ?? "";
    expect(text.indexOf("Best match")).toBeLessThan(
      text.indexOf("Program / pathway")
    );
    expect(screen.getByText("Income eligibility and deductions")).toBeInTheDocument();
    expect(screen.queryByText("Authorizing statute")).not.toBeInTheDocument();
  });

  it("routes to citation_path when Enter is pressed on a parsed citation", async () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "26 USC 32" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/us/statute/26/32")
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("routes parsed subsection citations to the deepest indexed ancestor", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ href: "/us/statute/26/32" }), {
        status: 200,
      })
    );
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "26 USC 32(a)" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/us/statute/26/32")
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/axiom/resolve/us/statute/26/32/a"
    );
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("moves the cursor with ArrowDown", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "SNAP" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    // The second option should be aria-selected after one ArrowDown.
    const selected = dialog.querySelectorAll("[aria-selected='true']");
    expect(selected.length).toBe(1);
  });

  it("shows corpus text from the hybrid search endpoint for free-text queries", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(
          JSON.stringify({
            ...emptySearchResponse(),
            corpus: [
              {
                id: "r1",
                jurisdiction: "us",
                doc_type: "statute",
                citation_path: "us/statute/26/1",
                heading: "Tax imposed",
                snippet: "hits",
                has_rulespec: true,
                rank: 1,
              },
            ],
          }),
          { status: 200 }
        );
      }
      const path = url.replace("/api/axiom/resolve", "");
      return new Response(JSON.stringify({ href: path }), { status: 200 });
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "tax imposed" } });
    await waitFor(() =>
      expect(String(mockFetch.mock.calls.at(-1)?.[0])).toContain(
        "/api/axiom/search"
      )
    );
    await waitFor(() => expect(screen.getByText("Best match")).toBeInTheDocument());
    expect(screen.getByText("encoded source text")).toBeInTheDocument();
    expect(screen.getByText("Tax imposed")).toBeInTheDocument();
  });

  it("shows the searching spinner while the debounced endpoint request is pending", () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "CO SNAP" },
    });

    expect(screen.getByText("searching…")).toBeInTheDocument();
  });

  it("shows a no-match state after a completed empty endpoint search", async () => {
    render(<CommandPalette open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "zzzx unmatched query" },
    });

    await waitFor(() =>
      expect(screen.queryByText("searching…")).not.toBeInTheDocument()
    );
    expect(
      screen.getByText("No citations, programs, or rules matched.")
    ).toBeInTheDocument();
  });

  it("renders file-level RuleSpec summaries when no symbol match is present", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(
          JSON.stringify({
            ...emptySearchResponse(),
            encoded: [
              {
                filePath:
                  "policies/des/faa5/na-eligibility-and-benefit-determination/gross-income-test.yaml",
                citationPath:
                  "us-az/policy/des/faa5/na-eligibility-and-benefit-determination/gross-income-test",
                bucket: "policies",
                label: "Gross Income Test",
                jurisdictionLabel: "Arizona",
                matchKind: "file",
                symbolMatches: [],
                fileSummary: {
                  summary: "Arizona Nutrition Assistance gross income test.",
                  ruleCount: 4,
                  importCount: 1,
                  imports: ["us:policies/usda/snap/fy-2026-cola/deductions"],
                  previewRules: [
                    { name: "az_snap_gross_income_limit" },
                    { name: "az_snap_gross_income" },
                    { name: "az_snap_gross_income_eligible" },
                  ],
                },
                score: 930,
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ href: "/" }), { status: 200 });
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "arizona gross income test" },
    });

    await waitFor(() => {
      expect(screen.getByText("Gross Income Test")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "4 rules · 1 imports · az_snap_gross_income_limit, az_snap_gross_income, az_snap_gross_income_eligible"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("RuleSpec package")).toBeInTheDocument();
  });

  it("renders unencoded corpus hits as source text", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(
          JSON.stringify({
            ...emptySearchResponse(),
            corpus: [
              {
                id: "source-only",
                jurisdiction: "us-co",
                doc_type: "policy",
                citation_path: "us-co/policy/cdhs/snap/source-page",
                heading: null,
                snippet: "Utility allowance source text",
                has_rulespec: false,
                rank: 0.6,
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ href: "/" }), { status: 200 });
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "utility allowance source" },
    });

    await waitFor(() =>
      expect(screen.getByText("source text")).toBeInTheDocument()
    );
    expect(
      screen.getAllByText("us-co/policy/cdhs/snap/source-page").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Source")).toBeInTheDocument();
  });

  it("commits encoded and source search rows directly without resolver lookup", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(
          JSON.stringify({
            ...emptySearchResponse(),
            encoded: [
              {
                filePath: "policies/cdhs/snap/fy-2026-benefit-calculation.yaml",
                citationPath:
                  "us-co/policy/cdhs/snap/fy-2026-benefit-calculation",
                bucket: "policies",
                label: "CDHS SNAP FY 2026 Benefit Calculation",
                jurisdictionLabel: "Colorado",
                matchKind: "file",
                symbolMatches: [],
                fileSummary: null,
                score: 730,
              },
            ],
            corpus: [
              {
                id: "source-only",
                jurisdiction: "us-co",
                doc_type: "policy",
                citation_path: "us-co/policy/cdhs/snap/source-page",
                heading: "Source page",
                snippet: "source text",
                has_rulespec: false,
                rank: 0.5,
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ href: "/resolved" }), {
        status: 200,
      });
    });

    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "CO SNAP" },
    });

    await waitFor(() =>
      expect(
        screen.getByText("CDHS SNAP FY 2026 Benefit Calculation")
      ).toBeInTheDocument()
    );
    fireEvent.click(
      screen.getByRole("option", {
        name: /CDHS SNAP FY 2026 Benefit Calculation/i,
      })
    );

    expect(mockPush).toHaveBeenCalledWith(
      "/us-co/policy/cdhs/snap/fy-2026-benefit-calculation"
    );
    expect(onClose).toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.some((call) => String(call[0]).includes("/resolve/"))
    ).toBe(false);
  });

  it("uses resolver fallback behavior for program clicks and keyboard navigation", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(JSON.stringify(emptySearchResponse()), {
          status: 200,
        });
      }
      if (url.includes("/api/axiom/resolve/")) {
        return new Response(JSON.stringify({ href: "" }), { status: 200 });
      }
      return new Response(JSON.stringify({ href: "/" }), { status: 200 });
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "SNAP" },
    });

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowUp" });
    const selected = dialog.querySelector("[aria-selected='true']");
    expect(selected?.textContent).toContain("Benefit calculation");

    fireEvent.click(
      screen.getAllByRole("option", {
        name: /Supplemental Nutrition Assistance Program/i,
      })[0]
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/us/statute/7/2011");
    });
  });

  it("falls back to the original href when citation resolver fails", async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/axiom/search")) {
        return new Response(JSON.stringify(emptySearchResponse()), {
          status: 200,
        });
      }
      return new Response("nope", { status: 500 });
    });

    render(<CommandPalette open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "26 USC 32" },
    });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Enter" });

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/us/statute/26/32")
    );
  });

  it("closes when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole("dialog").firstElementChild as Element);

    expect(onClose).toHaveBeenCalled();
  });
});
