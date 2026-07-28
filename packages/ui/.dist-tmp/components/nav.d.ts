import { type RenderLinkComponent } from "./link-utils";
export interface NavLink {
    href: string;
    label: string;
    /** Kicker shown above the label inside dropdown items (e.g. the
     *  audience segment a demo serves). */
    kicker?: string;
    /** Child links — the entry renders as a dropdown (desktop) or an
     *  indented group (mobile drawer). The parent href is still a link. */
    items?: NavLink[];
    /** Stakeholder-grouped child links (mirrors the demo-gallery
     *  taxonomy in axiom-demo-shell). Renders group headers between
     *  items; takes precedence over `items` when both are set. */
    groups?: {
        label: string;
        items: NavLink[];
    }[];
}
export interface NavProps {
    /** Base URL for generating absolute links (e.g. "https://axiom-foundation.org").
     *  When set, all nav links become absolute URLs. */
    baseUrl?: string;
    /** URL for the Axiom app link. Defaults to the production app subdomain. */
    appUrl?: string;
    /** Current pathname for active-state detection (e.g. from usePathname()) */
    pathname?: string;
    /** Custom link renderer for framework integration (e.g. Next.js Link).
     *  Receives href, className, children, onClick. Defaults to <a>. */
    renderLink?: RenderLinkComponent;
    /** Additional nav links to append (e.g. "Proposal" for the proposal app) */
    extraLinks?: NavLink[];
    /** Logo image src. Defaults to "/logos/axiom-foundation.svg".
     *  When baseUrl is set, resolved relative to baseUrl. */
    logoSrc?: string;
    /** Rendered at the right edge of the bar, after the links — e.g.
     *  the app's search / command-palette trigger. */
    rightSlot?: React.ReactNode;
}
export declare function Nav({ baseUrl, appUrl, pathname, renderLink: LinkComponent, extraLinks, logoSrc, rightSlot, }?: NavProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=nav.d.ts.map