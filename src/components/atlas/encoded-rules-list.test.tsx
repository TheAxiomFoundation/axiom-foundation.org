import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("@/lib/atlas/encoded-rules", async (importActual) => {
  const actual =
    await importActual<typeof import("@/lib/atlas/encoded-rules")>();
  return {
    ...actual,
    getEncodedRulesForJurisdiction: mockGet,
  };
});

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { EncodedRulesList } from "./encoded-rules-list";

function rule(citationPath: string, heading: string | null = null) {
  return {
    id: citationPath,
    citation_path: citationPath,
    heading,
    body: heading ? `(x) ${heading} substantive prose for the rule body.` : null,
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

describe("EncodedRulesList", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("renders a loading state while the fetch is in flight", () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<EncodedRulesList jurisdiction="uk" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /loading encoded rules/i
    );
  });

  it("renders an empty state when no encoded rules exist", async () => {
    mockGet.mockResolvedValue([]);
    render(<EncodedRulesList jurisdiction="canada" />);
    await waitFor(() =>
      expect(screen.getByText(/no encoded rules/i)).toBeInTheDocument()
    );
  });

  it("renders the summary line + grouped rules when data lands", async () => {
    mockGet.mockResolvedValue([
      rule("uk/legislation/uksi/2002/1792/regulation/4A/2", "Work allowance"),
      rule("uk/legislation/uksi/2002/1792/regulation/4B/1", "Capital limit"),
      rule("uk/legislation/uksi/2013/376/regulation/22/3", "Disregards"),
    ]);
    render(<EncodedRulesList jurisdiction="uk" />);
    await waitFor(() =>
      expect(
        screen.getByText(/3 encoded rules across 2 instruments/i)
      ).toBeInTheDocument()
    );
    expect(screen.getByText("uk/legislation/uksi/2002/1792")).toBeInTheDocument();
    expect(screen.getByText("uk/legislation/uksi/2013/376")).toBeInTheDocument();
    // Each row links to the rule's atlas page.
    const links = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(links).toContain(
      "/atlas/uk/legislation/uksi/2002/1792/regulation/4A/2"
    );
  });

  it("uses the singular form when there is exactly one rule", async () => {
    mockGet.mockResolvedValue([
      rule("uk/legislation/ukpga/2002/16/section/3ZA/3", "Tax credit"),
    ]);
    render(<EncodedRulesList jurisdiction="uk" />);
    await waitFor(() =>
      expect(
        screen.getByText(/1 encoded rule across 1 instrument/i)
      ).toBeInTheDocument()
    );
  });

  it("falls back to an error block when the fetch rejects", async () => {
    mockGet.mockRejectedValue(new Error("network down"));
    render(<EncodedRulesList jurisdiction="uk" />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/network down/i)
    );
  });
});
