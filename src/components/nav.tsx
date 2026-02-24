"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubIcon } from "./icons";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/#atlas", label: "Atlas" },
    { href: "/#format", label: ".rac" },
    { href: "/#autorac", label: "AutoRAC" },
    { href: "/atlas", label: "Browse" },
    { href: "/lab", label: "Lab" },
    { href: "/#spec", label: "Spec" },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) =>
    href === "/lab"
      ? pathname === "/lab"
      : href === "/atlas"
        ? pathname?.startsWith("/atlas")
        : href === "/about"
          ? pathname === "/about"
          : false;

  const linkClass = (href: string) =>
    `text-[0.9rem] font-medium no-underline transition-colors duration-150 flex items-center ${
      isActive(href)
        ? "text-[var(--color-text)]"
        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
    }`;

  const renderNavLink = (
    { href, label }: { href: string; label: string },
    onClick?: () => void
  ) => {
    if (href.startsWith("/#")) {
      if (pathname === "/") {
        return (
          <a
            key={href}
            href={href.replace("/", "")}
            className={linkClass(href)}
            onClick={onClick}
          >
            {label}
          </a>
        );
      }
      return (
        <Link
          key={href}
          href={href}
          className="text-[0.9rem] font-medium no-underline text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-150 flex items-center"
          onClick={onClick}
        >
          {label}
        </Link>
      );
    }

    return (
      <Link
        key={href}
        href={href}
        className={linkClass(href)}
        onClick={onClick}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-100 py-4 nav-bar">
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2 no-underline">
          <img
            src="/logos/rules-foundation.svg"
            alt="Rules Foundation"
            className="h-11 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => renderNavLink(link))}
          <a
            href="https://github.com/RulesFoundation/rac"
            className="text-[0.9rem] font-medium no-underline text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-150 flex items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a
            href="https://github.com/RulesFoundation"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-150 flex items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {open ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M6 18L18 6" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="nav-mobile md:hidden mt-2 mx-8 flex flex-col gap-1 rounded-2xl border p-4">
          {navLinks.map((link) => renderNavLink(link, () => setOpen(false)))}
          <a
            href="https://github.com/RulesFoundation/rac"
            className="text-[0.9rem] font-medium no-underline text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-150 flex items-center py-2"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Docs
          </a>
          <a
            href="https://github.com/RulesFoundation"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-150 flex items-center py-2"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <GitHubIcon className="w-5 h-5" />
            <span className="ml-2 text-[0.9rem] font-medium">GitHub</span>
          </a>
        </div>
      )}
    </header>
  );
}
