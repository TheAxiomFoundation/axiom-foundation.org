import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { mockListEncodedFiles, mockRedirect } = vi.hoisted(() => ({
  mockListEncodedFiles: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/axiom/rulespec/repo-listing", () => ({
  listEncodedFiles: mockListEncodedFiles,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import EncodedRulesIndexPage from "./page";
import EncodedRuleViewerPage from "./[...path]/page";

describe("EncodedRulesIndexPage", () => {
  it("renders the empty state when no jurisdiction has encodings", async () => {
    mockListEncodedFiles.mockResolvedValue([]);
    const ui = await EncodedRulesIndexPage();
    render(ui);
    expect(
      screen.getByText(/No encodings found/i)
    ).toBeInTheDocument();
  });

  it("groups files by jurisdiction, sorts groups by descending count, and links each row", async () => {
    mockListEncodedFiles.mockImplementation(async (jurisdiction: string) => {
      if (jurisdiction === "us") {
        return [
          {
            filePath: "statutes/26/3101/a.yaml",
            citationPath: "us/statute/26/3101/a",
            bucket: "statutes",
          },
          {
            filePath: "statutes/26/3101/b/1.yaml",
            citationPath: "us/statute/26/3101/b/1",
            bucket: "statutes",
          },
        ];
      }
      if (jurisdiction === "uk") {
        return [
          {
            filePath: "legislation/uksi/2002/1792/regulation/4A/2.yaml",
            citationPath: "uk/legislation/uksi/2002/1792/regulation/4A/2",
            bucket: "legislation",
          },
        ];
      }
      return [];
    });

    const ui = await EncodedRulesIndexPage();
    render(ui);

    expect(
      screen.getByText(/3 rules encoded across 2 jurisdictions/i)
    ).toBeInTheDocument();
    // US first (2 rules), UK second (1 rule).
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["US Federal", "United Kingdom"]);
    // Each row links to /axiom/encoded/<citation_path>.
    expect(
      screen.getByText("us/statute/26/3101/a").closest("a")
    ).toHaveAttribute("href", "/axiom/encoded/us/statute/26/3101/a");
  });
});

describe("EncodedRuleViewerPage", () => {
  it("redirects to the canonical /axiom/<citation> URL", async () => {
    await expect(
      EncodedRuleViewerPage({
        params: Promise.resolve({
          path: ["us", "statute", "26", "3101", "a"],
        }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/axiom/us/statute/26/3101/a");
    expect(mockRedirect).toHaveBeenCalledWith("/axiom/us/statute/26/3101/a");
  });
});
