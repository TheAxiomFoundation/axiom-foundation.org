import { describe, expect, it } from "vitest";

import { parseAppVisibility } from "./registry-visibility";

describe("parseAppVisibility", () => {
  it("reads an experimental marker", () => {
    expect(
      parseAppVisibility('[registry]\napp_visibility = "experimental"\n')
    ).toBe("experimental");
  });

  it("tolerates comments and spacing", () => {
    expect(
      parseAppVisibility('  app_visibility = "experimental"  # pre-launch\n')
    ).toBe("experimental");
  });

  it("defaults to public for missing text, missing key, or unknown values", () => {
    expect(parseAppVisibility(null)).toBe("public");
    expect(parseAppVisibility("")).toBe("public");
    expect(parseAppVisibility("[registry]\n")).toBe("public");
    expect(parseAppVisibility('app_visibility = "hidden"\n')).toBe("public");
  });

  it("does not match commented-out or embedded keys", () => {
    expect(parseAppVisibility('# app_visibility = "experimental"\n')).toBe(
      "public"
    );
    expect(
      parseAppVisibility('legacy_app_visibility = "experimental"\n')
    ).toBe("public");
  });
});
