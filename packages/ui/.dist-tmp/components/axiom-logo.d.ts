import type { CSSProperties, ReactElement } from "react";
interface AxiomLogoProps {
    className?: string;
    style?: CSSProperties;
    /** "full" renders "AXIOM FOUNDATION", "compact" renders just "AXIOM" */
    variant?: "full" | "compact";
}
/**
 * Inline SVG wordmark — path-based, no font dependency.
 * Uses currentColor so it can be styled by the gradient system.
 */
export declare function AxiomLogo({ className, style, variant, }: AxiomLogoProps): ReactElement;
export {};
//# sourceMappingURL=axiom-logo.d.ts.map