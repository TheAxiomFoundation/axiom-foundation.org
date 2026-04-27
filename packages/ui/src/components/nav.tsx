"use client";

import { useState, useMemo, useCallback } from "react";
import { GitHubIcon } from "./icons";
import { resolveHref, type RenderLinkComponent } from "./link-utils";

const NAV_LINK =
  "text-gradient text-[0.9rem] font-light no-underline transition-opacity duration-150 flex items-center";

const MOBILE_LINK =
  "text-gradient text-[1.1rem] font-light no-underline block py-2";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavProps {
  /** Base URL for generating absolute links (e.g. "https://axiom-foundation.org").
   *  When set, all nav links become absolute URLs. */
  baseUrl?: string;
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

const DEFAULT_LINKS: NavLink[] = [
  { href: "/atlas", label: "Browse" },
  { href: "/#format", label: ".yaml" },
  { href: "/#autorulespec", label: "AutoRuleSpec" },
  { href: "/#spec", label: "Spec" },
  { href: "/about", label: "About" },
];

const DEFAULT_LOGO = "/logos/axiom-foundation.svg";

export function Nav({
  baseUrl = "",
  pathname,
  renderLink: LinkComponent,
  extraLinks = [],
  logoSrc,
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
    const opacity = isActive ? "opacity-100" : "opacity-70 hover:opacity-100";

    const isHashLink = href.startsWith("/#");
    const isHomepageHash = isHashLink && !baseUrl && pathname === "/";
    const useNativeAnchor = baseUrl || !LinkComponent || isHomepageHash;

    const finalHref = isHomepageHash
      ? href.replace("/", "")
      : resolveHref(href, baseUrl);
    const finalOpacity = isHashLink ? "opacity-70 hover:opacity-100" : opacity;
    const className = `${base} ${finalOpacity}`;

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
          <LinkComponent
            href="/"
            className="flex items-baseline no-underline"
          >
            {logo}
          </LinkComponent>
        ) : (
          <a
            href={homeHref}
            className="flex items-baseline no-underline"
            aria-label="Axiom Foundation"
          >
            {logo}
          </a>
        )}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 uppercase tracking-wider text-[0.8rem]">
          {navLinks.map((link) => renderNavLink(link))}
          <a
            href="https://github.com/TheAxiomFoundation/rulespec"
            className={`${NAV_LINK} opacity-70 hover:opacity-100`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a
            href="https://github.com/TheAxiomFoundation"
            className="gradient-icon transition-opacity duration-150 flex items-center opacity-70 hover:opacity-100"
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
          {navLinks.map((link) => renderNavLink(link, true))}
          <a
            href="https://github.com/TheAxiomFoundation/rulespec"
            className={`${MOBILE_LINK} opacity-70 hover:opacity-100`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            Docs
          </a>
        </nav>
      )}
    </header>
  );
}
