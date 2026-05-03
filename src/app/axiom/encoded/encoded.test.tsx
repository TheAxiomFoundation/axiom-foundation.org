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

const { mockListEncodedFiles, mockFetchEncodedFile } = vi.hoisted(() => ({
  mockListEncodedFiles: vi.fn(),
  mockFetchEncodedFile: vi.fn(),
}));

vi.mock("@/lib/axiom/rulespec/repo-listing", () => ({
  listEncodedFiles: mockListEncodedFiles,
  fetchEncodedFile: mockFetchEncodedFile,
}));

vi.mock("next/navigation", () => ({
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
  it("renders the YAML through RuleSpecTab when the file is found", async () => {
    mockFetchEncodedFile.mockResolvedValue({
      filePath: "statutes/26/3101/a.yaml",
      content: `format: rulespec/v1
module:
  summary: Imposes the OASDI tax.
rules:
  - name: oasdi_wage_tax_rate
    kind: parameter
    versions:
      - effective_from: '1990-01-01'
        formula: '0.062'
`,
    });
    const ui = await EncodedRuleViewerPage({
      params: Promise.resolve({
        path: ["us", "statute", "26", "3101", "a"],
      }),
    });
    render(ui);
    expect(
      screen.getByRole("heading", { level: 1, name: "us/statute/26/3101/a" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "oasdi_wage_tax_rate" })
    ).toBeInTheDocument();
    // Back link to the index.
    expect(
      screen.getByText("← Encoded rules").closest("a")
    ).toHaveAttribute("href", "/axiom/encoded");
  });

  it("calls notFound when the citation has no file in the rules-* repo", async () => {
    mockFetchEncodedFile.mockResolvedValue(null);
    await expect(
      EncodedRuleViewerPage({
        params: Promise.resolve({ path: ["us", "statute", "0", "0"] }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when the jurisdiction has no published repo", async () => {
    mockFetchEncodedFile.mockResolvedValue({
      filePath: "anything",
      content: "",
    });
    // us-ny is in the seed but has no rules-* repo.
    await expect(
      EncodedRuleViewerPage({
        params: Promise.resolve({ path: ["us-ny", "statute", "1"] }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
