import { describe, it, expect, vi, beforeEach } from "vitest";
import { citationPathPrefixes } from "./resolver";

const { mockIn } = vi.hoisted(() => ({ mockIn: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabaseAkn: {
    from: () => ({
      select: () => ({
        in: mockIn,
      }),
    }),
  },
}));

// Import after mock registration so ``resolveCitationPath`` picks up
// the mocked ``supabaseAkn``.
import { resolveCitationPath } from "./resolver";

describe("citationPathPrefixes", () => {
  it("enumerates deepest-first", () => {
    expect(citationPathPrefixes("us/statute/26/32/b/1")).toEqual([
      "us/statute/26/32/b/1",
      "us/statute/26/32/b",
      "us/statute/26/32",
      "us/statute/26",
      "us/statute",
      "us",
    ]);
  });

  it("handles a single-segment input", () => {
    expect(citationPathPrefixes("us")).toEqual(["us"]);
  });

  it("drops empty segments from duplicate slashes", () => {
    expect(citationPathPrefixes("us//statute//26")).toEqual([
      "us/statute/26",
      "us/statute",
      "us",
    ]);
  });
});

describe("resolveCitationPath", () => {
  beforeEach(() => mockIn.mockReset());

  it("returns match=exact when the full path is ingested", async () => {
    mockIn.mockResolvedValue({
      data: [
        { id: "r1", citation_path: "us/statute/26/32/b/1" },
        { id: "r2", citation_path: "us/statute/26/32" },
      ],
      error: null,
    });
    const out = await resolveCitationPath("us/statute/26/32/b/1");
    expect(out.match).toBe("exact");
    expect(out.rule?.id).toBe("r1");
    expect(out.missingTail).toEqual([]);
  });

  it("returns match=ancestor with missingTail when only a prefix exists", async () => {
    mockIn.mockResolvedValue({
      data: [{ id: "r2", citation_path: "us/statute/26/32" }],
      error: null,
    });
    const out = await resolveCitationPath("us/statute/26/32/b/1");
    expect(out.match).toBe("ancestor");
    expect(out.rule?.id).toBe("r2");
    expect(out.missingTail).toEqual(["b", "1"]);
  });

  it("returns match=none when no prefix is ingested", async () => {
    mockIn.mockResolvedValue({ data: [], error: null });
    const out = await resolveCitationPath("us/statute/99/99");
    expect(out.match).toBe("none");
    expect(out.rule).toBeNull();
    expect(out.missingTail).toEqual([]);
  });

  it("picks the deepest ancestor when multiple prefixes match", async () => {
    mockIn.mockResolvedValue({
      data: [
        { id: "shallow", citation_path: "us/statute/26" },
        { id: "deep", citation_path: "us/statute/26/32" },
      ],
      error: null,
    });
    const out = await resolveCitationPath("us/statute/26/32/z");
    expect(out.match).toBe("ancestor");
    expect(out.rule?.id).toBe("deep");
    expect(out.missingTail).toEqual(["z"]);
  });

  it("normalises leading slashes and casing", async () => {
    mockIn.mockResolvedValue({
      data: [{ id: "r", citation_path: "us/statute/26/32" }],
      error: null,
    });
    const out = await resolveCitationPath("/US/Statute/26/32");
    expect(out.citationPath).toBe("us/statute/26/32");
    expect(out.match).toBe("exact");
  });

  it("returns none on empty input", async () => {
    const out = await resolveCitationPath("");
    expect(out.match).toBe("none");
    expect(out.citationPath).toBe("");
  });

  it("returns none on Supabase error", async () => {
    mockIn.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const out = await resolveCitationPath("us/statute/26/32");
    expect(out.match).toBe("none");
  });
});
