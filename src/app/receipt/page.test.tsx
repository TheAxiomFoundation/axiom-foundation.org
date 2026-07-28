import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReceiptPage from "./page";

// The module list mirrors the package: the six shipped modules render
// plainly, and machinery the package's own docstring calls "pending
// extraction" is labeled as such. If an id here goes stale against the
// package, fix the page, not the test.
const SHIPPED_MODULES = [
  "receipt.release_chain",
  "receipt.canonical",
  "receipt.append_gate",
  "receipt.tsa",
  "receipt.sign",
  "receipt.attest",
];

describe("receipt package page", () => {
  it("renders the package headline and the two-command install story", () => {
    render(<ReceiptPage />);

    expect(
      screen.getByRole("heading", {
        name: /verifiable custody of agent-produced records/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/pip install receipt/)).toBeInTheDocument();
  });

  it("lists exactly the shipped modules plainly and labels pending machinery", () => {
    render(<ReceiptPage />);

    for (const mod of SHIPPED_MODULES) {
      expect(screen.getByText(mod)).toBeInTheDocument();
    }
    expect(screen.queryByText("receipt.chain")).not.toBeInTheDocument();
    expect(screen.getByText("receipt.ratchet")).toBeInTheDocument();
    expect(screen.getByText("receipt.chronology")).toBeInTheDocument();
    expect(screen.getAllByText(/pending extraction/i)).toHaveLength(2);
  });

  it("links the package's public surfaces", () => {
    render(<ReceiptPage />);

    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://pypi.org/project/receipt/");
    expect(hrefs).toContain("https://github.com/TheAxiomFoundation/receipt");
    expect(hrefs).toContain("/receipt/api/");
    expect(hrefs).toContain("/receipts");
  });
});
