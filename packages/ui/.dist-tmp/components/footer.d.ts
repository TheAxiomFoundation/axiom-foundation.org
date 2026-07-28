import { type RenderLinkComponent } from "./link-utils";
export interface FooterProps {
    /** Base URL for generating absolute links (e.g. "https://axiom-foundation.org") */
    baseUrl?: string;
    /** URL for the Axiom app link. Defaults to the production app subdomain. */
    appUrl?: string;
    /** Custom link renderer for framework integration (e.g. Next.js Link) */
    renderLink?: RenderLinkComponent;
    /** Logo image src. Defaults to "/logos/axiom-foundation.svg". */
    logoSrc?: string;
    /** Newsletter signup URL for the "Get updates" link. The site passes
     *  UPDATES_URL from src/lib/launch.ts so signup CTAs stay in sync. */
    updatesUrl?: string;
}
export declare function Footer({ baseUrl, appUrl, renderLink: LinkComponent, logoSrc, updatesUrl, }?: FooterProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=footer.d.ts.map