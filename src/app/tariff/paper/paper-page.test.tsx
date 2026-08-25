import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import TariffPaperPage, { PAPER_VERSION } from "./page";

describe("tariff paper wrapper", () => {
  it("renders header, actions, and the sandboxed embed", () => {
    render(<TariffPaperPage />);
    expect(screen.getByText("Working paper")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Executable tariff law/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Revision 1 · 2026-08-16 · Max Ghenis/),
    ).toBeInTheDocument();
    const iframe = screen.getByTitle(/manuscript/);
    expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-same-origin allow-popups allow-popups-to-escape-sandbox",
    );
    expect(screen.getByText("Live schedule browser")).toHaveAttribute(
      "href",
      "/tariff/schedule",
    );
  });

  it("keeps the version param in lockstep on the iframe and every manuscript link", () => {
    render(<TariffPaperPage />);
    const versioned = [
      screen.getByTitle(/manuscript/).getAttribute("src"),
      screen.getByText("Open standalone HTML").getAttribute("href"),
      screen.getByText("Download PDF").getAttribute("href"),
      screen.getByText("Open manuscript in a new page").getAttribute("href"),
    ];
    for (const url of versioned) {
      expect(url).toContain(`v=${PAPER_VERSION}`);
    }
    // Root-absolute, never cross-origin: the route has no trailing
    // slash, so relative URLs would resolve against /tariff/.
    for (const url of versioned) {
      expect(url).toMatch(/^\/tariff\/paper\/web\//);
    }
  });

  it("embeds a committed render whose internal PDF link is the synced copy", () => {
    const html = readFileSync(
      join(process.cwd(), "public/tariff/paper/web/index.html"),
      "utf8",
    );
    expect(html).toContain('href="index.pdf"');
    expect(html).not.toContain('href="paper.pdf"');
    expect(html).toContain("Max Ghenis");
  });
});
