/** Axiom Foundation design tokens as JS constants.
 *
 * Accessibility note: every text/fill ↔ surface pair documented in
 * `contrastPairs` below clears its declared WCAG minimum. The matrix is
 * asserted in `__tests__/contrast.test.ts` so a token edit that drops below
 * AA (4.5:1 normal text, 3:1 non-text) fails CI before publish.
 */
export declare const colors: {
    readonly paper: "#faf9f6";
    readonly paperElevated: "#ffffff";
    readonly ink: "#1c1917";
    readonly inkSecondary: "#57534e";
    readonly inkMuted: "#78716c";
    readonly rule: "#e7e5e4";
    readonly ruleSubtle: "#f5f5f4";
    readonly ruleStrong: "#78716c";
    readonly accent: "#92400e";
    readonly accentHover: "#7c2d12";
    readonly accentLight: "rgba(146, 64, 14, 0.06)";
    readonly focusRing: "#92400e";
    readonly codeBg: "#1c1917";
    readonly codeText: "#e7e5e4";
    readonly success: "#166534";
    readonly warning: "#92400e";
    readonly error: "#991b1b";
};
export declare const easings: {
    readonly out: "cubic-bezier(0.16, 1, 0.3, 1)";
    readonly spring: "cubic-bezier(0.34, 1.56, 0.64, 1)";
};
/** Documented WCAG contrast guarantees. Asserted in
 * `__tests__/contrast.test.ts`; drift fails CI. */
export type ContrastPair = {
    description: string;
    fg: string;
    bg: string;
    /** WCAG SC 1.4.3 normal-text minimum is 4.5; 1.4.11 non-text is 3.0. */
    minRatio: number;
};
export declare const contrastPairs: readonly ContrastPair[];
//# sourceMappingURL=index.d.ts.map