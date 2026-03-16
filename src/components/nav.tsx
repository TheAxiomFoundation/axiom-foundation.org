"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubIcon } from "./icons";

const NAV_LINK =
  "text-gradient text-[0.9rem] font-light no-underline transition-opacity duration-150 flex items-center";

const MOBILE_LINK =
  "text-gradient text-[1.1rem] font-light no-underline block py-2";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/atlas", label: "Browse" },
    { href: "/#format", label: ".rac" },
    { href: "/#autorac", label: "AutoRAC" },
    { href: "/#spec", label: "Spec" },
    { href: "/about", label: "About" },
  ];

  function renderLink({ href, label }: { href: string; label: string }, mobile = false) {
    const isActive = pathname?.startsWith(href) && !href.startsWith("/#");
    const base = mobile ? MOBILE_LINK : NAV_LINK;
    const opacity = isActive ? "opacity-100" : "opacity-70 hover:opacity-100";

    if (href.startsWith("/#")) {
      if (pathname === "/") {
        return (
          <a
            key={href}
            href={href.replace("/", "")}
            className={`${base} opacity-70 hover:opacity-100`}
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        );
      }
      return (
        <Link
          key={href}
          href={href}
          className={`${base} opacity-70 hover:opacity-100`}
          onClick={() => setOpen(false)}
        >
          {label}
        </Link>
      );
    }

    return (
      <Link
        key={href}
        href={href}
        className={`${base} ${opacity}`}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-100 py-3 nav-bar">
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
        <Link href="/" className="flex items-baseline no-underline" aria-label="Axiom Foundation">
          <img
            src="/logos/rules-atlas.svg"
            alt="Axiom Foundation"
            className="h-9 w-auto shrink-0"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 uppercase tracking-wider text-[0.8rem]">
          {navLinks.map((link) => renderLink(link))}
          <a
            href="https://github.com/RuleAtlas/rac"
            className={`${NAV_LINK} opacity-70 hover:opacity-100`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a
            href="https://github.com/RuleAtlas"
            className="gradient-icon transition-opacity duration-150 flex items-center opacity-70 hover:opacity-100"
            style={{ color: "var(--gc, #1c1917)" }}
            target="_blank"
            rel="noopener noreferrer"
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
          {navLinks.map((link) => renderLink(link, true))}
          <a
            href="https://github.com/RuleAtlas/rac"
            className={`${MOBILE_LINK} opacity-70 hover:opacity-100`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Docs
          </a>
        </nav>
      )}
    </header>
  );
}
