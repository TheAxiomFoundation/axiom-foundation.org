import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatCitationLabel } from "./references-panel";

const mockGetRuleReferences = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getRuleReferences: (...args: unknown[]) => mockGetRuleReferences(...args),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, title }: { children: React.ReactNode; href: string; title?: string }) => (
    <a href={href} title={title}>
      {children}
    </a>
  ),
}));

import { ReferencesPanel } from "./references-panel";

const ref = (overrides: {
  direction?: "outgoing" | "incoming";
  other_citation_path: string;
  other_heading?: string | null;
  target_resolved?: boolean;
  citation_text?: string;
}) => ({
  direction: "outgoing" as const,
  citation_text: overrides.citation_text ?? "42 U.S.C. 9902",
  pattern_kind: "usc",
  confidence: 1,
  start_offset: 0,
  end_offset: 10,
  other_citation_path: overrides.other_citation_path,
  other_rule_id: overrides.target_resolved === false ? null : "some-uuid",
  other_heading: overrides.other_heading ?? null,
  target_resolved: overrides.target_resolved ?? true,
  ...overrides,
});

describe("formatCitationLabel", () => {
  it("formats US statute without subsections", () => {
    expect(formatCitationLabel("us/statute/7/2014")).toBe("7 USC § 2014");
  });
  it("formats US statute with subsection chain", () => {
    expect(formatCitationLabel("us/statute/26/32/a/1")).toBe(
      "26 USC § 32 (a)(1)"
    );
  });
  it("formats CFR part-only", () => {
    expect(formatCitationLabel("us/regulation/7/273")).toBe(
      "7 CFR Part 273"
    );
  });
  it("formats CFR section", () => {
    expect(formatCitationLabel("us/regulation/7/273/9")).toBe(
      "7 CFR § 273.9"
    );
  });
  it("formats CFR section with subsection chain", () => {
    expect(formatCitationLabel("us/regulation/7/273/9/a/1")).toBe(
      "7 CFR § 273.9 (a)(1)"
    );
  });
  it("formats CFR subpart", () => {
    expect(formatCitationLabel("us/regulation/7/273/subpart-d")).toBe(
      "7 CFR 273 Subpart D"
    );
  });
  it("formats state statutes", () => {
    expect(formatCitationLabel("us-ny/statute/tax/606")).toBe(
      "NY tax § 606"
    );
  });
  it("falls back to the raw path for unknown shapes", () => {
    expect(formatCitationLabel("some/weird/path")).toBe("some/weird/path");
  });
});

describe("ReferencesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when citationPath is nullish", () => {
    const { container } = render(<ReferencesPanel citationPath={null} />);
    expect(container.innerHTML).toBe("");
    expect(mockGetRuleReferences).not.toHaveBeenCalled();
  });

  it("renders nothing while loading", () => {
    mockGetRuleReferences.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <ReferencesPanel citationPath="us/statute/7/2014" />
    );
    expect(container.querySelector("[data-testid='references-panel']")).toBeNull();
  });

  it("renders nothing when there are no refs", async () => {
    mockGetRuleReferences.mockResolvedValue([]);
    const { container } = render(
      <ReferencesPanel citationPath="us/statute/7/2014" />
    );
    await waitFor(() =>
      expect(mockGetRuleReferences).toHaveBeenCalledTimes(1)
    );
    // Give React time to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector("[data-testid='references-panel']")).toBeNull();
  });

  it("renders outgoing references with citation labels + headings", async () => {
    mockGetRuleReferences.mockResolvedValue([
      ref({
        direction: "outgoing",
        other_citation_path: "us/statute/42/9902/2",
        other_heading: "Definitions",
      }),
      ref({
        direction: "outgoing",
        other_citation_path: "us/regulation/7/273/9",
        other_heading: "Income and deductions",
      }),
    ]);
    render(<ReferencesPanel citationPath="us/statute/7/2014" />);
    await waitFor(() => {
      expect(screen.getByText("References")).toBeInTheDocument();
    });
    expect(screen.getByText("42 USC § 9902 (2)")).toBeInTheDocument();
    expect(screen.getByText("Definitions")).toBeInTheDocument();
    expect(screen.getByText("7 CFR § 273.9")).toBeInTheDocument();
    expect(screen.getByText("Income and deductions")).toBeInTheDocument();
    expect(
      screen.getByText(/This rule cites 2 other rules/)
    ).toBeInTheDocument();
  });

  it("pluralizes correctly for a single reference", async () => {
    mockGetRuleReferences.mockResolvedValue([
      ref({ direction: "outgoing", other_citation_path: "us/statute/42/9902" }),
    ]);
    render(<ReferencesPanel citationPath="us/statute/7/2014" />);
    await waitFor(() => {
      expect(
        screen.getByText(/This rule cites 1 other rule\./)
      ).toBeInTheDocument();
    });
  });

  it("renders incoming references as a referenced-by list", async () => {
    mockGetRuleReferences.mockResolvedValue([
      {
        direction: "incoming",
        citation_text: "7 USC 2014",
        pattern_kind: "usc",
        confidence: 1,
        start_offset: 0,
        end_offset: 10,
        other_citation_path: "us/regulation/7/273/9",
        other_rule_id: "x",
        other_heading: "Income and deductions",
        target_resolved: true,
      },
    ]);
    render(<ReferencesPanel citationPath="us/statute/7/2014" />);
    await waitFor(() => {
      expect(screen.getByText("Referenced by")).toBeInTheDocument();
    });
    expect(screen.getByText("7 CFR § 273.9")).toBeInTheDocument();
    expect(
      screen.getByText(/1 other rule cites this one\./)
    ).toBeInTheDocument();
  });

  it("marks unresolved outgoing targets as pending", async () => {
    mockGetRuleReferences.mockResolvedValue([
      ref({
        direction: "outgoing",
        other_citation_path: "us/statute/99/9999",
        target_resolved: false,
        other_heading: null,
      }),
    ]);
    render(<ReferencesPanel citationPath="us/statute/7/2014" />);
    await waitFor(() => {
      expect(screen.getByText("pending")).toBeInTheDocument();
    });
  });

  it("suppresses the panel when the RPC errors", async () => {
    mockGetRuleReferences.mockRejectedValue(new Error("boom"));
    const { container } = render(
      <ReferencesPanel citationPath="us/statute/7/2014" />
    );
    await waitFor(() =>
      expect(mockGetRuleReferences).toHaveBeenCalledTimes(1)
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(
      container.querySelector("[data-testid='references-panel']")
    ).toBeNull();
  });
});
