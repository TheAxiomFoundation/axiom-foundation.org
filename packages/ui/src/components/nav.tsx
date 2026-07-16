"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronDownIcon, GitHubIcon } from "./icons";
import { resolveHref, type RenderLinkComponent } from "./link-utils";

const NAV_LINK =
  "nav-link text-gradient text-[0.9rem] font-light no-underline flex items-center";

const MOBILE_LINK =
  "nav-link text-gradient text-[1.1rem] font-light no-underline block py-2";

const DROPDOWN_ITEM =
  "block px-4 py-2.5 no-underline text-[0.85rem] font-light text-[var(--color-ink-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-rule-subtle)] transition-colors duration-150 normal-case tracking-normal";

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
  groups?: { label: string; items: NavLink[] }[];
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
}

// v2 launch nav — every top-level entry navigates to a page (no mixed
// scroll-anchor/page behavior). The landing sections are reachable
// through the page itself; demos group by the segment they serve.
const DEFAULT_LINKS: NavLink[] = [
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

export function Nav({
  baseUrl = "",
  appUrl = "https://app.axiom-foundation.org",
  pathname,
  renderLink: LinkComponent,
  extraLinks = [],
  logoSrc,
}: NavProps = {}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const navLinks = useMemo(
    () => [{ href: appUrl, label: "Axiom" }, ...DEFAULT_LINKS, ...extraLinks],
    [appUrl, extraLinks],
  );

  const resolvedLogoSrc = logoSrc
    ? logoSrc
    : baseUrl
      ? `${baseUrl}${DEFAULT_LOGO}`
      : DEFAULT_LOGO;

  function renderNavLink(
    { href, label, kicker }: NavLink,
    mobile = false,
    className?: string,
  ) {
    const isActive = pathname?.startsWith(href) && !href.startsWith("/#");
    const base = className ?? (mobile ? MOBILE_LINK : NAV_LINK);

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

    const content = kicker ? (
      <span className="block">
        <span className="block font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[var(--color-ink-muted)]">
          {kicker}
        </span>
        {label}
      </span>
    ) : (
      label
    );

    if (useNativeAnchor) {
      return (
        <a key={href} href={finalHref} className={resolvedClassName} onClick={close}>
          {content}
        </a>
      );
    }

    return (
      <LinkComponent key={href} href={href} className={resolvedClassName} onClick={close}>
        {content}
      </LinkComponent>
    );
  }

  function renderGroupHeader(label: string, mobile = false) {
    return (
      <div
        key={`group-${label}`}
        className={`font-mono text-[0.58rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)] ${
          mobile ? "pt-3 pb-1" : "px-4 pt-3 pb-1"
        }`}
      >
        {label}
      </div>
    );
  }

  function dropdownEntries(link: NavLink, mobile: boolean) {
    const renderItem = (item: NavLink) =>
      mobile
        ? renderNavLink(item, true)
        : renderNavLink(item, false, DROPDOWN_ITEM);

    if (!link.groups?.length) return (link.items ?? []).map(renderItem);

    const entries: React.ReactNode[] = [];
    link.groups.forEach((group, i) => {
      if (group.label) {
        entries.push(renderGroupHeader(group.label, mobile));
      } else if (i > 0) {
        entries.push(
          <div
            key={`sep-${i}`}
            className={`my-2 h-px bg-[var(--color-rule-subtle)] ${mobile ? "" : "mx-4"}`}
            aria-hidden
          />,
        );
      }
      group.items.forEach((item) => entries.push(renderItem(item)));
    });
    return entries;
  }

  function renderDesktopEntry(link: NavLink) {
    if (!link.items?.length && !link.groups?.length) return renderNavLink(link);
    return (
      <div key={link.href} className="relative group">
        <span className="flex items-center gap-1">
          {renderNavLink(link)}
          <ChevronDownIcon
            className="w-3.5 h-3.5 text-[var(--color-ink-muted)] transition-transform duration-150 group-hover:rotate-180"
            aria-hidden
          />
        </span>
        {/* pt-3 bridges the hover gap between trigger and panel.
            Visibility (not display) so the fade + rise can animate;
            pointer-events gate off-state hover traps under the panel. */}
        <div
          className="pointer-events-none invisible absolute left-1/2 top-full -translate-x-1/2 translate-y-2.5 scale-[0.98] pt-3 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"
          style={{
            transitionTimingFunction: "var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
            transformOrigin: "top center",
          }}
        >
          <div className="min-w-[240px] rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] py-2 shadow-[0_16px_48px_rgba(0,0,0,0.14)]">
            {dropdownEntries(link, false)}
          </div>
        </div>
      </div>
    );
  }

  function renderMobileEntry(link: NavLink) {
    if (!link.items?.length && !link.groups?.length)
      return renderNavLink(link, true);
    return (
      <div key={link.href}>
        {renderNavLink(link, true)}
        <div className="ml-4 border-l border-[var(--color-rule-subtle)] pl-4">
          {dropdownEntries(link, true)}
        </div>
      </div>
    );
  }

  const homeHref = baseUrl || "/";
  const logo = (
    <img
      src={resolvedLogoSrc}
      alt="Axiom Foundation"
      className="h-9 w-auto shrink-0"
    />
  );
  const isDocsActive = pathname?.startsWith("/docs") ?? false;

  return (
    <header className="fixed top-0 left-0 right-0 z-100 py-3 nav-bar">
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
        {LinkComponent && !baseUrl ? (
          <LinkComponent href="/" className="nav-logo no-underline">
            {logo}
          </LinkComponent>
        ) : (
          <a
            href={homeHref}
            className="nav-logo no-underline"
            aria-label="Axiom Foundation"
          >
            {logo}
          </a>
        )}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 uppercase tracking-wider text-[0.8rem]">
          {navLinks.map((link) => renderDesktopEntry(link))}
          <a
            href={resolveHref("/docs", baseUrl)}
            className={`${NAV_LINK}${isDocsActive ? " is-active" : ""}`}
          >
            Docs
          </a>
          <a
            href="https://github.com/TheAxiomFoundation"
            className="nav-icon gradient-icon"
            style={{ color: "var(--gc, #1c1917)" }}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
        </nav>

        {/* Hamburger button */}
        <button
          className="md:hidden flex flex-col justify-center gap-[5px] w-8 h-8"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span
            className={`block h-[2px] w-6 bg-[var(--color-ink)] transition-all duration-200 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-[2px] w-6 bg-[var(--color-ink)] transition-all duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-[2px] w-6 bg-[var(--color-ink)] transition-all duration-200 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="md:hidden border-t border-[var(--color-rule)] bg-[var(--color-paper)] px-8 py-6 uppercase tracking-wider text-[0.8rem]">
          {navLinks.map((link) => renderMobileEntry(link))}
          <a
            href={resolveHref("/docs", baseUrl)}
            className={`${MOBILE_LINK}${isDocsActive ? " is-active" : ""}`}
            onClick={close}
          >
            Docs
          </a>
        </nav>
      )}
    </header>
  );
}
