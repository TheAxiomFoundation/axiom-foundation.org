import { describe, expect, it } from "vitest";

import { contrastPairs } from "../tokens/index";

/**
 * Compute WCAG 2.x relative luminance for a #rrggbb color.
 *
 * @see https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const value = hex.replace(/^#/, "");
  if (value.length !== 6 && value.length !== 3) {
    throw new Error(`Expected #rrggbb or #rgb, got ${hex}`);
  }
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const rgb = [0, 1, 2].map((i) => {
    const channel = parseInt(expanded.slice(i * 2, i * 2 + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Compute the WCAG contrast ratio between two hex colors.
 *
 * @see https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */
export function contrastRatio(fg: string, bg: string): number {
  const lFg = relativeLuminance(fg);
  const lBg = relativeLuminance(bg);
  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("token contrast", () => {
  it("each documented contrast pair clears its declared minimum", () => {
    const failures: string[] = [];
    for (const pair of contrastPairs) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      if (ratio < pair.minRatio) {
        failures.push(
          `${pair.description}: ${pair.fg} on ${pair.bg} = ${ratio.toFixed(
            2,
          )}:1 (need ${pair.minRatio.toFixed(1)}:1)`,
        );
      }
    }
    if (failures.length > 0) {
      throw new Error(
        `${failures.length} contrast pair(s) below WCAG minimum:\n  ${failures.join(
          "\n  ",
        )}`,
      );
    }
  });

  it("contrastRatio matches known WCAG values", () => {
    // Black on white = 21:1 (the maximum)
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    // Same color = 1:1
    expect(contrastRatio("#92400e", "#92400e")).toBeCloseTo(1, 5);
  });
});
