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
      screen.getByText(/Revision 2 · 2026-08-25 · Max Ghenis/),
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

  it("keeps the exact version param on every manuscript URL, discovered dynamically", () => {
    const { container } = render(<TariffPaperPage />);
    const urls = [
      ...[...container.querySelectorAll("a[href]")].map((a) =>
        a.getAttribute("href"),
      ),
      ...[...container.querySelectorAll("iframe[src]")].map((f) =>
        f.getAttribute("src"),
      ),
    ].filter((url): url is string => Boolean(url));
    const manuscriptUrls = urls.filter((url) =>
      url.includes("/tariff/paper/web/"),
    );
    // The wrapper must actually reference the render (iframe + at
    // least the two action links + the footer link).
    expect(manuscriptUrls.length).toBeGreaterThanOrEqual(4);
    for (const url of manuscriptUrls) {
      // Root-absolute, never cross-origin: the route has no trailing
      // slash, so relative URLs would resolve against /tariff/.
      expect(url).toMatch(/^\/tariff\/paper\/web\//);
      const params = new URL(url, "https://axiom.org").searchParams;
      expect(params.getAll("v")).toEqual([PAPER_VERSION]);
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
    expect(html).not.toContain("wire into sections");
    expect(html).not.toContain("Companion-paper authors");
    expect(html).toContain("its verdict is no");
  });
});
