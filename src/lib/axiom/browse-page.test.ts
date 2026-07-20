import { describe, it, expect, vi, beforeEach } from "vitest";

const { loadTreeNodesMock } = vi.hoisted(() => ({
  loadTreeNodesMock: vi.fn(),
}));

vi.mock("@/lib/axiom/tree-node-loader", () => ({
  loadTreeNodes: loadTreeNodesMock,
}));

import { getBrowsePageData } from "./browse-page";

describe("getBrowsePageData", () => {
  beforeEach(() => {
    loadTreeNodesMock.mockReset();
    loadTreeNodesMock.mockResolvedValue({
      nodes: [
        {
          segment: "statute",
          label: "Statute",
          hasChildren: true,
          nodeType: "doc_type",
        },
      ],
      hasMore: false,
    });
  });

  it("assembles jurisdiction-level browse data", async () => {
    const data = await getBrowsePageData(["us"]);
    expect(data?.jurisdictionLabel).toBe("US Federal");
    expect(data?.nodes.map((node) => node.segment)).toEqual(["statute"]);
    expect(loadTreeNodesMock).toHaveBeenCalledWith(
      expect.objectContaining({ dbJurisdictionId: "us", ruleSegments: [] })
    );
  });

  it("passes doc-type and title segments through to the loader", async () => {
    await getBrowsePageData(["us", "statute", "26"]);
    expect(loadTreeNodesMock).toHaveBeenCalledWith(
      expect.objectContaining({ ruleSegments: ["statute", "26"] })
    );
  });

  it("rejects section depth and empty paths", async () => {
    expect(await getBrowsePageData([])).toBeNull();
    expect(
      await getBrowsePageData(["us", "statute", "26", "32"])
    ).toBeNull();
    expect(loadTreeNodesMock).not.toHaveBeenCalled();
  });

  it("reports backend failures as unavailable, not nonexistence", async () => {
    loadTreeNodesMock.mockRejectedValue(new Error("db down"));
    expect(await getBrowsePageData(["us"])).toBe("unavailable");
  });
});
