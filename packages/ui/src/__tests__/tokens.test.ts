import { colors, easings } from "../tokens/index";

describe("tokens", () => {
  it("exports color values matching the design system", () => {
    expect(colors.paper).toBe("#faf9f6");
    expect(colors.ink).toBe("#1c1917");
    expect(colors.inkMuted).toBe("#78716c");
    expect(colors.accent).toBe("#92400e");
    expect(colors.accentHover).toBe("#7c2d12");
  });

  it("exports all expected color keys", () => {
    const expectedKeys = [
      "paper",
      "paperElevated",
      "ink",
      "inkSecondary",
      "inkMuted",
      "rule",
      "ruleSubtle",
      "accent",
      "accentHover",
      "accentLight",
      "codeBg",
      "codeText",
      "success",
      "warning",
      "error",
    ];
    expect(Object.keys(colors)).toEqual(expectedKeys);
  });

  it("exports easing values", () => {
    expect(easings.out).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(easings.spring).toBe("cubic-bezier(0.34, 1.56, 0.64, 1)");
  });

  it("color values snapshot", () => {
    expect(colors).toMatchInlineSnapshot(`
      {
        "accent": "#92400e",
        "accentHover": "#7c2d12",
        "accentLight": "rgba(180, 83, 9, 0.06)",
        "codeBg": "#1c1917",
        "codeText": "#e7e5e4",
        "error": "#991b1b",
        "ink": "#1c1917",
        "inkMuted": "#78716c",
        "inkSecondary": "#57534e",
        "paper": "#faf9f6",
        "paperElevated": "#ffffff",
        "rule": "#e7e5e4",
        "ruleSubtle": "#f5f5f4",
        "success": "#166534",
        "warning": "#b45309",
      }
    `);
  });
});
