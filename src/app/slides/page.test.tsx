import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SlidesPage from "./page";

const DECKS = {
  decks: [
    {
      id: "launch-2026",
      title: "The Axiom Foundation launch webinar",
      description: "The public launch briefing.",
      date: "2026-07-28",
      location: "Virtual",
      slideCount: 20,
      speakers: [
        { name: "Ariel Kennan", title: "President", photo: "/slides/team/ariel-kennan.jpg" },
        { name: "Max Ghenis", title: "CEO and founder", photo: "/slides/team/max-ghenis.png" },
      ],
    },
    {
      id: "some-briefing",
      title: "A briefing without speakers",
      description: "Month-precision date, no speaker row.",
      date: "2026-08-01",
      slideCount: 8,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("slides index page", () => {
  it("renders a linked card per deck from the manifest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => DECKS })
    );

    render(await SlidesPage());

    expect(screen.getByRole("heading", { level: 1, name: "Slides" })).toBeInTheDocument();

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/slides/launch-2026");
    expect(hrefs).toContain("/slides/some-briefing");

    expect(screen.getByText(/July 28, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/20 slides/)).toBeInTheDocument();
    // First-of-month dates render month precision only.
    expect(screen.getByText(/August 2026/)).toBeInTheDocument();

    expect(screen.getByAltText("Ariel Kennan")).toHaveAttribute(
      "src",
      "/slides/team/ariel-kennan.jpg"
    );
  });

  it("falls back gracefully on a non-ok manifest response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(await SlidesPage());

    expect(screen.getByText(/momentarily unavailable/i)).toBeInTheDocument();
  });

  it("falls back gracefully when the manifest fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(await SlidesPage());

    expect(screen.getByText(/momentarily unavailable/i)).toBeInTheDocument();
  });
});
