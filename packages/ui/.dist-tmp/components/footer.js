import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GitHubIcon, LinkedInIcon } from "./icons";
import { resolveHref } from "./link-utils";
const LINK_CLASS = "link-quiet text-[0.9rem] text-[var(--color-ink-secondary)] inline-block";
const DEFAULT_LOGO = "/logos/axiom-foundation.svg";
const SOCIALS = [
    {
        href: "https://github.com/TheAxiomFoundation",
        label: "GitHub",
        Icon: GitHubIcon,
    },
    {
        href: "https://www.linkedin.com/company/axiom-foundation",
        label: "LinkedIn",
        Icon: LinkedInIcon,
    },
];
export function Footer({ baseUrl = "", appUrl = "https://app.axiom-foundation.org", renderLink: LinkComponent, logoSrc, updatesUrl = "mailto:hello@axiom.org?subject=Axiom%20updates", } = {}) {
    const resolvedLogoSrc = logoSrc
        ? logoSrc
        : baseUrl
            ? `${baseUrl}${DEFAULT_LOGO}`
            : DEFAULT_LOGO;
    function renderFooterLink(href, label) {
        const resolved = resolveHref(href, baseUrl);
        const isExternal = href.startsWith("http") || href.startsWith("mailto:");
        if (baseUrl || !LinkComponent || isExternal) {
            return (_jsx("a", Object.assign({ href: resolved, className: LINK_CLASS }, (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {}), { children: label }), href));
        }
        return (_jsx(LinkComponent, { href: href, className: LINK_CLASS, children: label }, href));
    }
    function renderColumn(title, links) {
        return (_jsxs("div", { children: [_jsx("h3", { className: "font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)] mb-4", children: title }), _jsx("ul", { className: "flex flex-col gap-2.5 list-none p-0 m-0", children: links.map((link) => (_jsx("li", { children: renderFooterLink(link.href, link.label) }, link.href))) })] }));
    }
    const year = new Date().getFullYear();
    return (_jsx("footer", { className: "relative z-10 px-8 border-t border-[var(--color-rule)]", children: _jsxs("div", { className: "max-w-[1280px] mx-auto py-16", children: [_jsxs("div", { className: "grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-14 mb-14", children: [_jsxs("div", { children: [_jsx("img", { src: resolvedLogoSrc, alt: "Axiom Foundation", className: "h-9 w-auto mb-5" }), _jsx("p", { className: "text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed max-w-[280px]", style: { fontFamily: "var(--f-serif)", fontStyle: "italic" }, children: "Computable law for all." }), _jsx("p", { className: "text-[0.8rem] text-[var(--color-ink-muted)] mt-4 leading-relaxed max-w-[280px]", children: "Open, machine-readable encodings of the world's rules \u2014 starting with tax and benefit policy." }), _jsx("div", { className: "mt-6 flex items-center gap-4", children: SOCIALS.map(({ href, label, Icon }) => (_jsx("a", { href: href, target: "_blank", rel: "noopener noreferrer", "aria-label": label, className: "text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors duration-150", children: _jsx(Icon, { className: "w-5 h-5" }) }, href))) })] }), renderColumn("Product", [
                            { href: appUrl, label: "Axiom platform" },
                            { href: "/demos", label: "Demos" },
                            { href: "/validation", label: "Validation" },
                            { href: "/docs", label: "Documentation" },
                        ]), renderColumn("Foundation", [
                            { href: "/about", label: "About" },
                            { href: "/team", label: "Team" },
                            { href: "/privacy", label: "Privacy" },
                        ]), renderColumn("Connect", [
                            { href: "/contact", label: "Contact" },
                            { href: updatesUrl, label: "Get updates" },
                            {
                                href: "mailto:hello@axiom.org",
                                label: "hello@axiom.org",
                            },
                        ])] }), _jsxs("div", { className: "flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-6 border-t border-[var(--color-rule-subtle)]", children: [_jsxs("p", { className: "font-mono text-[0.7rem] tracking-[0.08em] text-[var(--color-ink-muted)] m-0", children: ["\u00A9 ", year, " Axiom Foundation \u00B7 Doing the public-interest work"] }), _jsxs("p", { className: "font-mono text-[0.7rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)] m-0", children: [_jsx("span", { className: "glyph-axiom text-[var(--color-accent)]", "aria-hidden": "true", children: "\u2200" }), " ", "Open infrastructure for encoded law"] })] })] }) }));
}
//# sourceMappingURL=footer.js.map