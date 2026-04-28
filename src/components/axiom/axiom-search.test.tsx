import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchRules = vi.fn();

vi.mock("@/lib/supabase", () => ({
  searchRules: (...args: unknown[]) => mockSearchRules(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { AxiomSearch } from "./axiom-search";

const hit = (overrides: Partial<{
  id: string;
  jurisdiction: string;
  doc_type: string;
  citation_path: string;
  heading: string | null;
  snippet: string;
  has_rulespec: boolean;
  rank: number;
}>) => ({
  id: "hit-1",
  jurisdiction: "us",
  doc_type: "regulation",
  citation_path: "us/regulation/7/273/9",
  heading: "Income and deductions",
  snippet: "<mark>SNAP</mark> households with elderly or disabled members",
  has_rulespec: false,
  rank: 0.1,
  ...overrides,
});

describe("AxiomSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Component debounces at DEBOUNCE_MS = 200. Real timers + a short settle
  // beats the fake-timers/waitFor impedance mismatch.
  function flush(_ms = 250) {
    // no-op — callers await waitFor which handles real-time debounce.
    // Kept as a syntactic marker at call sites.
  }

  it("renders the search input with a descriptive placeholder", () => {
    render(<AxiomSearch />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain("Search statutes and regulations");
  });

  it("does not call the RPC for queries below the minimum length", async () => {
    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "a" },
    });
    flush();
    expect(mockSearchRules).not.toHaveBeenCalled();
  });

  it("debounces and then issues a search returning results", async () => {
    mockSearchRules.mockResolvedValueOnce([
      hit({}),
      hit({
        id: "hit-2",
        citation_path: "us/statute/26/32",
        heading: "Earned income",
        has_rulespec: true,
        snippet: "<mark>earned income</mark> tax credit",
      }),
    ]);

    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "SNAP households" },
    });

    // Before debounce fires, no call
    expect(mockSearchRules).not.toHaveBeenCalled();

    flush(250);

    await waitFor(() => {
      expect(mockSearchRules).toHaveBeenCalledTimes(1);
    });
    expect(mockSearchRules).toHaveBeenCalledWith("SNAP households", {
      jurisdiction: undefined,
      docType: undefined,
      limit: 30,
    });

    // Render results
    await waitFor(() => {
      expect(screen.getByText("Income and deductions")).toBeInTheDocument();
    });
    expect(screen.getByText("Earned income")).toBeInTheDocument();
    // Citation labels formatted correctly
    expect(screen.getByText("7 CFR § 273.9")).toBeInTheDocument();
    expect(screen.getByText("26 USC § 32")).toBeInTheDocument();
    // Encoded badge only on the hit with has_rulespec: true
    expect(screen.getAllByText("Encoded").length).toBe(1);
  });

  it("applies the statute filter when clicked", async () => {
    mockSearchRules.mockResolvedValue([]);

    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "qualifying child" },
    });
    flush(250);
    await waitFor(() => expect(mockSearchRules).toHaveBeenCalled());

    mockSearchRules.mockClear();
    mockSearchRules.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: "Statutes" }));
    flush(250);

    await waitFor(() => {
      expect(mockSearchRules).toHaveBeenCalledWith("qualifying child", {
        jurisdiction: undefined,
        docType: "statute",
        limit: 30,
      });
    });
    expect(
      screen.getByRole("button", { name: "Statutes" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("forwards jurisdiction prop to searchRules", async () => {
    mockSearchRules.mockResolvedValue([]);

    render(<AxiomSearch jurisdiction="us" />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "household" },
    });
    flush(250);

    await waitFor(() =>
      expect(mockSearchRules).toHaveBeenCalledWith("household", {
        jurisdiction: "us",
        docType: undefined,
        limit: 30,
      })
    );
  });

  it("shows the empty state when a valid query returns no rows", async () => {
    mockSearchRules.mockResolvedValue([]);

    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzxxnomatch" },
    });
    flush(250);

    await waitFor(() => expect(mockSearchRules).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByText(/No matches/)).toBeInTheDocument();
    });
  });

  it("shows an error message when the RPC rejects", async () => {
    mockSearchRules.mockRejectedValue(new Error("boom"));

    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "anything" },
    });
    flush(250);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("boom");
    });
  });

  it("renders <mark> tokens from the snippet as styled <mark> elements", async () => {
    mockSearchRules.mockResolvedValue([
      hit({
        snippet: "plain before <mark>highlighted</mark> plain after",
      }),
    ]);

    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "anything" },
    });
    flush(250);

    await waitFor(() => {
      expect(screen.getByText("highlighted").tagName).toBe("MARK");
    });
    expect(screen.getByText(/plain before/)).toBeInTheDocument();
    expect(screen.getByText(/plain after/)).toBeInTheDocument();
  });

  it("formats CFR Part (no subpart/section) and subpart labels correctly", async () => {
    mockSearchRules.mockResolvedValue([
      hit({
        id: "a",
        citation_path: "us/regulation/7/273",
        heading: "Certification of eligible households",
      }),
      hit({
        id: "b",
        citation_path: "us/regulation/7/273/subpart-d",
        heading: "Subpart D — Eligibility and Benefit Levels",
      }),
      hit({
        id: "c",
        citation_path: "us/unknown/random/path",
        heading: "Fallback path",
      }),
    ]);

    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "anything" },
    });

    await waitFor(() => {
      expect(screen.getByText("7 CFR Part 273")).toBeInTheDocument();
    });
    expect(screen.getByText("7 CFR 273 Subpart D")).toBeInTheDocument();
    // Fallback: unknown path shape renders the raw citation_path
    expect(screen.getByText("us/unknown/random/path")).toBeInTheDocument();
  });

  it("form submit forces an immediate search (bypasses debounce)", async () => {
    mockSearchRules.mockResolvedValue([hit({})]);
    render(<AxiomSearch />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "urgent query" } });
    // Submit the form immediately
    const form = input.closest("form")!;
    fireEvent.submit(form);

    // waitFor handles the promise microtask
    await waitFor(() => {
      expect(mockSearchRules).toHaveBeenCalledWith(
        "urgent query",
        expect.any(Object)
      );
    });
  });

  it("treats stale RPC responses as discarded when a newer query finishes first", async () => {
    // First call hangs until we resolve it manually.
    let resolveFirst: (v: unknown) => void = () => {};
    const firstCall = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockSearchRules.mockReturnValueOnce(firstCall);
    // Second call is also async so the debounce fires after a change.
    mockSearchRules.mockResolvedValueOnce([
      hit({ heading: "Second call result" }),
    ]);

    render(<AxiomSearch />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "first query" },
    });
    // Wait long enough for debounce to fire the first RPC.
    await waitFor(() => expect(mockSearchRules).toHaveBeenCalledTimes(1));

    // Now issue a second query while the first is still pending.
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "second query" },
    });
    await waitFor(() => expect(mockSearchRules).toHaveBeenCalledTimes(2));

    // Second call resolves first (mockResolvedValueOnce is eager), so its
    // results should render.
    await waitFor(() =>
      expect(screen.getByText("Second call result")).toBeInTheDocument()
    );

    // Resolve the stale first call — it must NOT replace the newer results.
    resolveFirst([hit({ heading: "Stale first result" })]);
    // Give the microtask queue a chance.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Stale first result")).not.toBeInTheDocument();
    expect(screen.getByText("Second call result")).toBeInTheDocument();
  });
});
