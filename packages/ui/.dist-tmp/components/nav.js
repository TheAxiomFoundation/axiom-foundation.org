"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useCallback } from "react";
import { ChevronDownIcon, GitHubIcon } from "./icons";
import { resolveHref } from "./link-utils";
const NAV_LINK = "nav-link text-gradient text-[0.9rem] font-light no-underline flex items-center";
const MOBILE_LINK = "nav-link text-gradient text-[1.1rem] font-light no-underline block py-2";
const DROPDOWN_ITEM = "block px-4 py-2.5 no-underline text-[0.85rem] font-light text-[var(--color-ink-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-rule-subtle)] transition-colors duration-150 normal-case tracking-normal";
// v2 launch nav — every top-level entry navigates to a page (no mixed
// scroll-anchor/page behavior). The landing sections are reachable
// through the page itself; demos group by the segment they serve.
const DEFAULT_LINKS = [
    { href: "/validation", label: "Validation" },
    {
        href: "/demos",
        label: "What's possible",
        // Stakeholder grouping mirrors the demo-gallery taxonomy in
        // axiom-demo-shell (Builders / AI labs / Government).
        groups: [
            {
                label: "Builders",
                items: [
                    { href: "/demos#reg-demo", label: "Small company checker" },
                    { href: "/demos#form-builder", label: "Form Builder" },
                    { href: "/demos#architecture", label: "Architecture map" },
                ],
            },
            {
                label: "AI labs",
                items: [
                    { href: "/demos#finbot", label: "Grounded benefits assistant" },
                    { href: "/demos#guidance-impact", label: "Guidance impact visualizer" },
                ],
            },
            {
                label: "Government",
                items: [
                    { href: "/demos#workflow-checker", label: "SNAP workflow checker" },
                    { href: "/demos#co-snap-cliffs", label: "Colorado SNAP cliffs" },
                    { href: "/demos#microsim", label: "Microsimulation" },
                ],
            },
            {
                label: "",
                items: [{ href: "/demos", label: "All demos" }],
            },
        ],
    },
    { href: "/about", label: "About" },
    { href: "/team", label: "Team" },
];
const DEFAULT_LOGO = "/logos/axiom-foundation.svg";
export function Nav({ baseUrl = "", appUrl = "https://app.axiom-foundation.org", pathname, renderLink: LinkComponent, extraLinks = [], logoSrc, rightSlot, } = {}) {
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);
    const navLinks = useMemo(() => [{ href: appUrl, label: "Axiom" }, ...DEFAULT_LINKS, ...extraLinks], [appUrl, extraLinks]);
    const resolvedLogoSrc = logoSrc
        ? logoSrc
        : baseUrl
            ? `${baseUrl}${DEFAULT_LOGO}`
            : DEFAULT_LOGO;
    function renderNavLink({ href, label, kicker }, mobile = false, className) {
        const isActive = (pathname === null || pathname === void 0 ? void 0 : pathname.startsWith(href)) && !href.startsWith("/#");
        const base = className !== null && className !== void 0 ? className : (mobile ? MOBILE_LINK : NAV_LINK);
        const isExternal = /^https?:\/\//.test(href) || href.startsWith("mailto:");
        const isHashLink = href.startsWith("/#");
        const isHomepageHash = isHashLink && !baseUrl && pathname === "/";
        const useNativeAnchor = isExternal || baseUrl || !LinkComponent || isHomepageHash;
        const finalHref = isHomepageHash
            ? href.replace("/", "")
            : resolveHref(href, baseUrl);
        // Persistent underline only on routes (active state); hash links and
        // unmatched routes get the standard hover-grow underline from .nav-link.
        const resolvedClassName = `${base}${isActive && !isHashLink && !className ? " is-active" : ""}`;
        const content = kicker ? (_jsxs("span", { className: "block", children: [_jsx("span", { className: "block font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[var(--color-ink-muted)]", children: kicker }), label] })) : (label);
        if (useNativeAnchor) {
            return (_jsx("a", { href: finalHref, className: resolvedClassName, onClick: close, children: content }, href));
        }
        return (_jsx(LinkComponent, { href: href, className: resolvedClassName, onClick: close, children: content }, href));
    }
    function renderGroupHeader(label, mobile = false) {
        return (_jsx("div", { className: `font-mono text-[0.58rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)] ${mobile ? "pt-3 pb-1" : "px-4 pt-3 pb-1"}`, children: label }, `group-${label}`));
    }
    function dropdownEntries(link, mobile) {
        var _a, _b;
        const renderItem = (item) => mobile
            ? renderNavLink(item, true)
            : renderNavLink(item, false, DROPDOWN_ITEM);
        if (!((_a = link.groups) === null || _a === void 0 ? void 0 : _a.length))
            return ((_b = link.items) !== null && _b !== void 0 ? _b : []).map(renderItem);
        const entries = [];
        link.groups.forEach((group, i) => {
            if (group.label) {
                entries.push(renderGroupHeader(group.label, mobile));
            }
            else if (i > 0) {
                entries.push(_jsx("div", { className: `my-2 h-px bg-[var(--color-rule-subtle)] ${mobile ? "" : "mx-4"}`, "aria-hidden": true }, `sep-${i}`));
            }
            group.items.forEach((item) => entries.push(renderItem(item)));
        });
        return entries;
    }
    /** Grouped desktop panel — one column per stakeholder, unlabeled
     *  groups (e.g. "All demos") as a footer row under a hairline. */
    function renderGroupedPanel(groups) {
        const columns = groups.filter((g) => g.label);
        const footer = groups.filter((g) => !g.label);
        return (_jsxs("div", { className: "rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.14)]", children: [_jsx("div", { className: "flex gap-10", children: columns.map((group) => (_jsxs("div", { className: "min-w-[140px]", children: [_jsxs("div", { className: "mb-3 font-mono text-[0.7rem] font-semibold tracking-[0.18em] uppercase text-[var(--color-ink)]", children: [group.label, _jsx("span", { "aria-hidden": true, className: "mt-1.5 block h-px w-5 bg-[var(--color-accent)]" })] }), _jsx("div", { className: "flex flex-col gap-0.5", children: group.items.map((item) => renderNavLink(item, false, "block whitespace-nowrap rounded px-2.5 py-1.5 -mx-2.5 no-underline text-[0.85rem] font-light normal-case tracking-normal text-[var(--color-ink-secondary)] transition-all duration-150 hover:translate-x-0.5 hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]")) })] }, group.label))) }), footer.length > 0 && (_jsx("div", { className: "mt-5 border-t border-[var(--color-rule-subtle)] pt-3.5", children: footer.reduce((acc, g) => acc.concat(g.items), []).map((item) => renderNavLink(item, false, "inline-flex items-center gap-1.5 no-underline font-mono text-[0.68rem] tracking-[0.14em] uppercase text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors duration-150")) }))] }));
    }
    function renderDesktopEntry(link) {
        var _a, _b, _c;
        if (!((_a = link.items) === null || _a === void 0 ? void 0 : _a.length) && !((_b = link.groups) === null || _b === void 0 ? void 0 : _b.length))
            return renderNavLink(link);
        return (_jsxs("div", { className: "relative group", children: [_jsxs("span", { className: "flex items-center gap-1", children: [renderNavLink(link), _jsx(ChevronDownIcon, { className: "w-3.5 h-3.5 text-[var(--color-ink-muted)] transition-transform duration-150 group-hover:rotate-180", "aria-hidden": true })] }), _jsx("div", { className: "pointer-events-none invisible absolute left-1/2 top-full -translate-x-1/2 translate-y-2.5 scale-[0.98] pt-3 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100", style: {
                        transitionTimingFunction: "var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
                        transformOrigin: "top center",
                    }, children: ((_c = link.groups) === null || _c === void 0 ? void 0 : _c.length) ? (renderGroupedPanel(link.groups)) : (_jsx("div", { className: "min-w-[240px] rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] py-2 shadow-[0_16px_48px_rgba(0,0,0,0.14)]", children: dropdownEntries(link, false) })) })] }, link.href));
    }
    function renderMobileEntry(link) {
        var _a, _b;
        if (!((_a = link.items) === null || _a === void 0 ? void 0 : _a.length) && !((_b = link.groups) === null || _b === void 0 ? void 0 : _b.length))
            return renderNavLink(link, true);
        return (_jsxs("div", { children: [renderNavLink(link, true), _jsx("div", { className: "ml-4 border-l border-[var(--color-rule-subtle)] pl-4", children: dropdownEntries(link, true) })] }, link.href));
    }
    const homeHref = baseUrl || "/";
    const logo = (_jsx("img", { src: resolvedLogoSrc, alt: "Axiom Foundation", className: "h-9 w-auto shrink-0" }));
    return (_jsxs("header", { className: "fixed top-0 left-0 right-0 z-100 py-3 nav-bar", children: [_jsxs("div", { className: "max-w-[1280px] mx-auto px-8 flex items-center justify-between", children: [LinkComponent && !baseUrl ? (_jsx(LinkComponent, { href: "/", className: "nav-logo no-underline", children: logo })) : (_jsx("a", { href: homeHref, className: "nav-logo no-underline", "aria-label": "Axiom Foundation", children: logo })), _jsxs("nav", { className: "hidden md:flex items-center gap-8 uppercase tracking-wider text-[0.8rem]", children: [navLinks.map((link) => renderDesktopEntry(link)), rightSlot, _jsx("a", { href: "https://github.com/TheAxiomFoundation", className: "nav-icon gradient-icon", style: { color: "var(--gc, #1c1917)" }, target: "_blank", rel: "noopener noreferrer", "aria-label": "GitHub", children: _jsx(GitHubIcon, { className: "w-5 h-5" }) })] }), _jsxs("button", { className: "md:hidden flex flex-col justify-center gap-[5px] w-8 h-8", onClick: () => setOpen((v) => !v), "aria-label": open ? "Close menu" : "Open menu", "aria-expanded": open, children: [_jsx("span", { className: `block h-[2px] w-6 bg-[var(--color-ink)] transition-all duration-200 ${open ? "translate-y-[7px] rotate-45" : ""}` }), _jsx("span", { className: `block h-[2px] w-6 bg-[var(--color-ink)] transition-all duration-200 ${open ? "opacity-0" : ""}` }), _jsx("span", { className: `block h-[2px] w-6 bg-[var(--color-ink)] transition-all duration-200 ${open ? "-translate-y-[7px] -rotate-45" : ""}` })] })] }), open && (_jsx("nav", { className: "md:hidden border-t border-[var(--color-rule)] bg-[var(--color-paper)] px-8 py-6 uppercase tracking-wider text-[0.8rem]" }))] }));
    {
        navLinks.map((link) => renderNavLink(link, true));
    }
    {
        rightSlot && (_jsx("div", { className: "mt-4", onClick: close, children: rightSlot }));
    }
    nav >
    ;
}
header >
;
;
//# sourceMappingURL=nav.js.map