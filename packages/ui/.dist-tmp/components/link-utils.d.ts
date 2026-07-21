import type { ReactNode, ComponentType } from "react";
/** Shared link component type for Nav and Footer render-adapter pattern */
export type RenderLinkComponent = ComponentType<{
    href: string;
    className?: string;
    children: ReactNode;
    onClick?: () => void;
}>;
/** Resolve a relative href to absolute when baseUrl is provided */
export declare function resolveHref(href: string, baseUrl: string): string;
//# sourceMappingURL=link-utils.d.ts.map