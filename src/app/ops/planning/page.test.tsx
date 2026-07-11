import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import PlanningPage, { metadata } from "@/app/ops/planning/page";

describe("Encoding scale planning page", () => {
  it("keeps the hidden route out of search indexing", () => {
    expect(metadata.title).toBe(
      "Encoding scale planning - Axiom Foundation"
    );
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("renders the JSON-backed forecast and cloud model", () => {
    render(<PlanningPage />);

    expect(
      screen.getByRole("heading", { name: "Encoding scale planning" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Coverage tiers and remaining work",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Combined trajectory" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cloud scaling" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("4,103").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$0.437/module").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[M]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[D]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[A]").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "OpenAI pricing" }).length
    ).toBeGreaterThan(0);
  });

  it("stays absent from navigation and sitemap definitions", () => {
    const navigation = readFileSync(
      join(process.cwd(), "packages/ui/src/components/nav.tsx"),
      "utf8"
    );
    const sitemap = readFileSync(
      join(process.cwd(), "src/app/sitemap.ts"),
      "utf8"
    );

    expect(navigation).not.toContain("/ops/planning");
    expect(sitemap).not.toContain("/ops/planning");
  });
});
