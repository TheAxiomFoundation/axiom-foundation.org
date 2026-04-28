import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ViewerDocument } from "@/lib/axiom-utils";
import type { RuleReference } from "@/lib/supabase";

vi.mock("next/link", () => ({
  default: ({ children, href, title }: { children: React.ReactNode; href: string; title?: string }) => (
    <a href={href} title={title}>
      {children}
    </a>
  ),
}));

import { SourceTab } from "./source-tab";

const baseDoc: ViewerDocument = {
  citation: "26 USC 24(d)(1)",
  title: "Test section",
  subsections: [
    { id: "A", text: "first subsection text" },
    { id: "B", text: "second subsection text" },
  ],
  hasRuleSpec: false,
  jurisdiction: "us",
  sourcePath: null,
};

describe("SourceTab context rendering", () => {
  it("renders subsections normally when no contextText is present", () => {
    render(<SourceTab document={baseDoc} />);
    expect(screen.getByText("first subsection text")).toBeInTheDocument();
    expect(screen.getByText("second subsection text")).toBeInTheDocument();
    // No context intro block
    expect(
      screen.queryByTestId("context-intro")
    ).not.toBeInTheDocument();
  });

  it("renders context intro block when contextText is provided", () => {
    const doc: ViewerDocument = {
      ...baseDoc,
      contextText: "shall be increased by the lesser of—",
    };
    render(<SourceTab document={doc} />);
    expect(
      screen.getByText("shall be increased by the lesser of—")
    ).toBeInTheDocument();
  });

  it("highlights the matching subsection when highlightedSubsection is set", () => {
    const doc: ViewerDocument = {
      ...baseDoc,
      highlightedSubsection: "A",
    };
    render(<SourceTab document={doc} />);
    // The highlighted subsection container should have a left border accent
    const subsectionA = screen.getByText("first subsection text").closest("[data-subsection-id]");
    expect(subsectionA).toHaveClass("border-l-2");
  });

  it("does not highlight any subsection when highlightedSubsection does not match", () => {
    const doc: ViewerDocument = {
      ...baseDoc,
      highlightedSubsection: "Z",
    };
    render(<SourceTab document={doc} />);
    // Neither subsection should have the highlight border
    const subsectionA = screen.getByText("first subsection text").closest("[data-subsection-id]");
    const subsectionB = screen.getByText("second subsection text").closest("[data-subsection-id]");
    if (subsectionA) expect(subsectionA).not.toHaveClass("border-l-2");
    if (subsectionB) expect(subsectionB).not.toHaveClass("border-l-2");
  });

  it("renders the raw body with inline citation links when document.body is set", () => {
    const body = "See 42 U.S.C. 9902 for definitions.";
    const start = body.indexOf("42 U.S.C. 9902");
    const end = start + "42 U.S.C. 9902".length;
    const doc: ViewerDocument = {
      ...baseDoc,
      body,
      // subsections here shouldn't render — the inline body takes over
      subsections: [{ id: "a", text: "should not render" }],
    };
    const refs: RuleReference[] = [
      {
        direction: "outgoing",
        citation_text: "42 U.S.C. 9902",
        pattern_kind: "usc",
        confidence: 1,
        start_offset: start,
        end_offset: end,
        other_citation_path: "us/statute/42/9902",
        other_provision_id: "uuid",
        other_heading: null,
        target_resolved: true,
      },
    ];
    render(<SourceTab document={doc} outgoingRefs={refs} />);
    expect(screen.queryByText("should not render")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "42 U.S.C. 9902" });
    expect(link).toHaveAttribute("href", "/axiom/us/statute/42/9902");
  });

  it("falls back to the subsection list when document.body is absent", () => {
    render(<SourceTab document={baseDoc} />);
    expect(screen.getByText("first subsection text")).toBeInTheDocument();
    expect(screen.getByText("second subsection text")).toBeInTheDocument();
  });

  it("renders body as plain text when outgoingRefs is undefined (loading state)", () => {
    // During initial fetch, the parent may not yet pass outgoingRefs.
    // SourceTab must still show the body text — just without links —
    // rather than crashing or rendering the subsection fallback.
    const body = "See 42 U.S.C. 9902 for definitions.";
    const doc: ViewerDocument = { ...baseDoc, body };
    render(<SourceTab document={doc} />);
    // Body shows up
    expect(screen.getByTestId("rule-body-inline")).toHaveTextContent(
      "See 42 U.S.C. 9902 for definitions."
    );
    // No links yet (refs haven't arrived)
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("scrolls the highlighted subsection into view on mount", () => {
    const scrollIntoView = vi.fn();
    // jsdom omits scrollIntoView; install a spy on Element.prototype so
    // any rendered subsection can invoke it.
    (Element.prototype as unknown as {
      scrollIntoView: typeof scrollIntoView;
    }).scrollIntoView = scrollIntoView;

    render(
      <SourceTab
        document={{ ...baseDoc, highlightedSubsection: "B" }}
      />
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "instant",
    });
  });

  it("does not scroll when no subsection is highlighted", () => {
    const scrollIntoView = vi.fn();
    (Element.prototype as unknown as {
      scrollIntoView: typeof scrollIntoView;
    }).scrollIntoView = scrollIntoView;

    render(<SourceTab document={baseDoc} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("does not throw when the highlighted subsection id isn't in the DOM", () => {
    const scrollIntoView = vi.fn();
    (Element.prototype as unknown as {
      scrollIntoView: typeof scrollIntoView;
    }).scrollIntoView = scrollIntoView;

    render(
      <SourceTab
        document={{ ...baseDoc, highlightedSubsection: "ZZZ" }}
      />
    );
    // No matching data-subsection-id — scroll is a no-op.
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("renders both contextText and highlightedSubsection correctly", () => {
    const doc: ViewerDocument = {
      ...baseDoc,
      contextText: "shall be increased by the lesser of—",
      highlightedSubsection: "A",
    };
    render(<SourceTab document={doc} />);
    // Context text is rendered
    expect(
      screen.getByText("shall be increased by the lesser of—")
    ).toBeInTheDocument();
    // Highlighted subsection has the accent
    const subsectionA = screen.getByText("first subsection text").closest("[data-subsection-id]");
    expect(subsectionA).toHaveClass("border-l-2");
  });
});
