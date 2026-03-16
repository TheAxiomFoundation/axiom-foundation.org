"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubIcon } from "./icons";

const NAV_LINK =
  "text-gradient text-[0.9rem] font-light no-underline transition-opacity duration-150 flex items-center";

export function Nav() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/atlas", label: "Browse" },
    { href: "/#format", label: ".rac" },
    { href: "/#autorac", label: "AutoRAC" },
    { href: "/#spec", label: "Spec" },
    { href: "/about", label: "About" },
  ];

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
        <nav className="hidden md:flex items-center gap-8 uppercase tracking-wider text-[0.8rem]">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname?.startsWith(href) && !href.startsWith("/#");

            if (href.startsWith("/#")) {
              if (pathname === "/") {
                return (
                  <a
                    key={href}
                    href={href.replace("/", "")}
                    className={`${NAV_LINK} opacity-70 hover:opacity-100`}
                  >
                    {label}
                  </a>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${NAV_LINK} opacity-70 hover:opacity-100`}
                >
                  {label}
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={`${NAV_LINK} ${
                  isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
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
      </div>
    </header>
  );
}
