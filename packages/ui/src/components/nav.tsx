"use client";

import { useState, useMemo, useCallback } from "react";
import { resolveHref, type RenderLinkComponent } from "./link-utils";

const NAV_LINK =
  "nav-link text-gradient text-[0.9rem] font-light no-underline flex items-center";

const MOBILE_LINK =
  "nav-link text-gradient text-[1.1rem] font-light no-underline block py-2";

export interface NavLink {
  href: string;
  label: string;
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

// Round 1 pull-back — the site is a pre-launch tease. Nav is Home
// (logo) · About · Team, with no product-page or external link-outs.
// Restore the product/section links at the Jul 28 launch.
const DEFAULT_LINKS: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
];

const DEFAULT_LOGO = "/logos/axiom-foundation.svg";

export function Nav({
  baseUrl = "",
  pathname,
  renderLink: LinkComponent,
  extraLinks = [],
  logoSrc,
  rightSlot,
}: NavProps = {}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const navLinks = useMemo(
    () => [...DEFAULT_LINKS, ...extraLinks],
    [extraLinks],
  );

  const resolvedLogoSrc = logoSrc
    ? logoSrc
    : baseUrl
      ? `${baseUrl}${DEFAULT_LOGO}`
      : DEFAULT_LOGO;

  function renderNavLink({ href, label }: NavLink, mobile = false) {
    const isActive = pathname?.startsWith(href) && !href.startsWith("/#");
    const base = mobile ? MOBILE_LINK : NAV_LINK;

    const isExternal = /^https?:\/\//.test(href) || href.startsWith("mailto:");
    const isHashLink = href.startsWith("/#");
    const isHomepageHash = isHashLink && !baseUrl && pathname === "/";
    const useNativeAnchor = isExternal || baseUrl || !LinkComponent || isHomepageHash;

    const finalHref = isHomepageHash
      ? href.replace("/", "")
      : resolveHref(href, baseUrl);
    // Persistent underline only on routes (active state); hash links and
    // unmatched routes get the standard hover-grow underline from .nav-link.
    const className = `${base}${isActive && !isHashLink ? " is-active" : ""}`;

    if (useNativeAnchor) {
      return (
        <a key={href} href={finalHref} className={className} onClick={close}>
          {label}
        </a>
      );
    }

    return (
      <LinkComponent key={href} href={href} className={className} onClick={close}>
        {label}
      </LinkComponent>
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
          {navLinks.map((link) => renderNavLink(link))}
          {rightSlot}
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
          {navLinks.map((link) => renderNavLink(link, true))}
          {rightSlot && (
            <div className="mt-4" onClick={close}>
              {rightSlot}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
