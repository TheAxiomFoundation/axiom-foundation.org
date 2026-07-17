import { describe, it, expect, vi, afterEach } from "vitest";
import {
  graphFocusForCitationPath,
  graphViewerUrl,
  ruleGraphFocus,
} from "./graph-links";

describe("ruleGraphFocus", () => {
  it("builds the full legal id from slug, file path, and rule name", () => {
    expect(
      ruleGraphFocus("us", "statutes/7/2017/a.yaml", "snap_regular_month_allotment")
    ).toBe("us:statutes/7/2017/a#snap_regular_month_allotment");
    expect(
      ruleGraphFocus("us-co", "regulations/10-ccr-2506-1/4.207.3.yaml", "co_snap_x")
    ).toBe("us-co:regulations/10-ccr-2506-1/4.207.3#co_snap_x");
  });
});

describe("graphFocusForCitationPath", () => {
  it("maps statute citation paths to plural-bucket legal id prefixes", () => {
    expect(graphFocusForCitationPath("us/statute/7/2017")).toBe(
      "us:statutes/7/2017"
    );
    expect(graphFocusForCitationPath("us-co/statute/26/26-2-706")).toBe(
      "us-co:statutes/26/26-2-706"
    );
  });

  it("adds the -cfr suffix to federal regulation titles", () => {
    expect(graphFocusForCitationPath("us/regulation/26/1/32-2")).toBe(
      "us:regulations/26-cfr/1/32-2"
    );
    // State regulations keep their title segment as-is.
    expect(
      graphFocusForCitationPath("us-co/regulation/10-ccr-2506-1/4.207.3")
    ).toBe("us-co:regulations/10-ccr-2506-1/4.207.3");
  });

  it("returns null for paths too shallow to name a provision", () => {
    expect(graphFocusForCitationPath("us/statute")).toBeNull();
    expect(graphFocusForCitationPath("us")).toBeNull();
  });
});

describe("graphViewerUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds program + focus params, omitting country for US", () => {
    const url = new URL(
      graphViewerUrl(
        { jurisdiction: "us-co", programId: "co-snap" },
        "us:statutes/7/2017"
      )
    );
    expect(url.origin).toBe("https://rulespec-graph-viewer.vercel.app");
    expect(url.searchParams.get("program")).toBe("us-co/co-snap");
    expect(url.searchParams.get("focus")).toBe("us:statutes/7/2017");
    expect(url.searchParams.get("country")).toBeNull();
  });

  it("sets country for non-US jurisdictions and works without focus", () => {
    const url = new URL(
      graphViewerUrl({ jurisdiction: "uk", programId: "universal-credit" }, null)
    );
    expect(url.searchParams.get("country")).toBe("uk");
    expect(url.searchParams.get("focus")).toBeNull();
  });
});
