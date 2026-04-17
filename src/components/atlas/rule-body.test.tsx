import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { RuleReference } from "@/lib/supabase";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    title,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    title?: string;
    className?: string;
  }) => (
    <a href={href} title={title} className={className}>
      {children}
    </a>
  ),
}));

import { RuleBody } from "./rule-body";

const ref = (overrides: {
  start_offset: number;
  end_offset: number;
  other_citation_path: string;
  target_resolved?: boolean;
  other_heading?: string | null;
}): RuleReference => ({
  direction: "outgoing",
  citation_text: "placeholder",
  pattern_kind: "usc",
  confidence: 1,
  start_offset: overrides.start_offset,
  end_offset: overrides.end_offset,
  other_citation_path: overrides.other_citation_path,
  other_rule_id: overrides.target_resolved === false ? null : "resolved-uuid",
  other_heading: overrides.other_heading ?? null,
  target_resolved: overrides.target_resolved ?? true,
});

describe("RuleBody", () => {
  it("renders empty when body is empty", () => {
    const { container } = render(<RuleBody body="" refs={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders plain body when there are no refs", () => {
    render(<RuleBody body="Hello plain world." refs={[]} />);
    expect(screen.getByText("Hello plain world.")).toBeInTheDocument();
    expect(
      screen.queryByRole("link")
    ).not.toBeInTheDocument();
  });

  it("splices a single citation into the body as a link", () => {
    const body = "See 42 U.S.C. 9902(2) for definitions.";
    const start = body.indexOf("42 U.S.C. 9902(2)");
    const end = start + "42 U.S.C. 9902(2)".length;
    render(
      <RuleBody
        body={body}
        refs={[
          ref({
            start_offset: start,
            end_offset: end,
            other_citation_path: "us/statute/42/9902/2",
          }),
        ]}
      />
    );
    const link = screen.getByRole("link", { name: "42 U.S.C. 9902(2)" });
    expect(link).toHaveAttribute("href", "/atlas/us/statute/42/9902/2");
  });

  it("renders the surrounding plain text in order", () => {
    const body = "See 42 U.S.C. 9902 for rules.";
    const start = body.indexOf("42 U.S.C. 9902");
    const end = start + "42 U.S.C. 9902".length;
    const { container } = render(
      <RuleBody
        body={body}
        refs={[
          ref({
            start_offset: start,
            end_offset: end,
            other_citation_path: "us/statute/42/9902",
          }),
        ]}
      />
    );
    // Reconstruct the visible text without markup
    const text = container.querySelector("[data-testid='rule-body-inline']")?.textContent;
    expect(text).toBe(body);
  });

  it("styles resolved refs with the accent color and unresolved with dotted underline", () => {
    const body = "First 26 USC 32 and later 99 USC 9999.";
    const ref1Start = body.indexOf("26 USC 32");
    const ref2Start = body.indexOf("99 USC 9999");
    render(
      <RuleBody
        body={body}
        refs={[
          ref({
            start_offset: ref1Start,
            end_offset: ref1Start + "26 USC 32".length,
            other_citation_path: "us/statute/26/32",
            target_resolved: true,
          }),
          ref({
            start_offset: ref2Start,
            end_offset: ref2Start + "99 USC 9999".length,
            other_citation_path: "us/statute/99/9999",
            target_resolved: false,
          }),
        ]}
      />
    );
    const resolved = screen.getByRole("link", { name: "26 USC 32" });
    const unresolved = screen.getByRole("link", { name: "99 USC 9999" });
    expect(resolved.className).toMatch(/color-accent/);
    expect(unresolved.className).toMatch(/decoration-dotted/);
    expect(unresolved).toHaveAttribute(
      "title",
      expect.stringContaining("not yet ingested")
    );
  });

  it("includes the target heading in the tooltip when available", () => {
    const body = "See 26 USC 32.";
    const start = body.indexOf("26 USC 32");
    render(
      <RuleBody
        body={body}
        refs={[
          ref({
            start_offset: start,
            end_offset: start + "26 USC 32".length,
            other_citation_path: "us/statute/26/32",
            target_resolved: true,
            other_heading: "Earned income",
          }),
        ]}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("title", "us/statute/26/32 — Earned income");
  });

  it("skips refs whose end_offset exceeds the body length", () => {
    render(
      <RuleBody
        body="Short body."
        refs={[
          ref({
            start_offset: 0,
            end_offset: 9999,
            other_citation_path: "us/statute/42/9902",
          }),
        ]}
      />
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Short body.")).toBeInTheDocument();
  });

  it("skips refs whose start_offset comes before the cursor (overlapping)", () => {
    // Two refs where the second starts inside the first — splice() keeps
    // only the first and skips the second so the body isn't double-rendered.
    const body = "42 U.S.C. 9902 text here.";
    render(
      <RuleBody
        body={body}
        refs={[
          ref({
            start_offset: 0,
            end_offset: 14,
            other_citation_path: "us/statute/42/9902",
          }),
          ref({
            start_offset: 5,
            end_offset: 14,
            other_citation_path: "us/statute/42/9902",
          }),
        ]}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
  });

  it("skips zero-width refs", () => {
    render(
      <RuleBody
        body="Body text."
        refs={[
          ref({
            start_offset: 4,
            end_offset: 4,
            other_citation_path: "us/statute/42/9902",
          }),
        ]}
      />
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("preserves paragraph breaks via pre-wrap", () => {
    const { container } = render(
      <RuleBody body={"Line 1.\n\nLine 2."} refs={[]} />
    );
    const pane = container.querySelector(
      "[data-testid='rule-body-inline']"
    ) as HTMLElement;
    expect(pane).not.toBeNull();
    expect(pane.className).toMatch(/whitespace-pre-wrap/);
  });

  it("renders multiple refs in offset order with plain text between them", () => {
    const body = "See 26 USC 32, 42 USC 9902, and also more.";
    const r1s = body.indexOf("26 USC 32");
    const r2s = body.indexOf("42 USC 9902");
    render(
      <RuleBody
        body={body}
        refs={[
          ref({
            start_offset: r1s,
            end_offset: r1s + "26 USC 32".length,
            other_citation_path: "us/statute/26/32",
          }),
          ref({
            start_offset: r2s,
            end_offset: r2s + "42 USC 9902".length,
            other_citation_path: "us/statute/42/9902",
          }),
        ]}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "26 USC 32",
      "42 USC 9902",
    ]);
  });
});
