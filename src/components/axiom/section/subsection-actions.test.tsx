import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SubsectionActions } from "./subsection-actions";

describe("SubsectionActions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("copies the formatted citation with a link and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(
      <SubsectionActions
        citationLabel="7 U.S.C. § 2017(a)"
        href="/axiom/v2/us/statute/7/2017/a"
        graphHref={null}
        builderHref={null}
      />
    );
    fireEvent.click(screen.getByTestId("copy-citation"));
    await waitFor(() =>
      expect(screen.getByText("copied ✓")).toBeInTheDocument()
    );
    expect(writeText).toHaveBeenCalledWith(
      `7 U.S.C. § 2017(a) — ${window.location.origin}/axiom/v2/us/statute/7/2017/a`
    );
  });

  it("survives clipboard rejection without confirming", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(
      <SubsectionActions
        citationLabel="7 U.S.C. § 2017(a)"
        href="/axiom/v2/us/statute/7/2017/a"
        graphHref="https://example.test/graph"
        builderHref="https://example.test/builder"
      />
    );
    fireEvent.click(screen.getByTestId("copy-citation"));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.queryByText("copied ✓")).not.toBeInTheDocument();
    // Links render when provided.
    expect(screen.getByText("graph ↗")).toHaveAttribute(
      "href",
      "https://example.test/graph"
    );
    expect(screen.getByText("use in builder ↗")).toHaveAttribute(
      "href",
      "https://example.test/builder"
    );
  });
});
