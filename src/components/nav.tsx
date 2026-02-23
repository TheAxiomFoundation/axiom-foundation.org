"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubIcon } from "./icons";

export function Nav() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/#atlas", label: "Atlas" },
    { href: "/#format", label: ".rac" },
    { href: "/#autorac", label: "AutoRAC" },
    { href: "/atlas", label: "Browse" },
    { href: "/lab", label: "Lab" },
    { href: "/#spec", label: "Spec" },
    { href: "/about", label: "About" },
  ];

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
        <nav className="flex items-center gap-8">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/lab"
                ? pathname === "/lab"
                : href === "/atlas"
                  ? pathname?.startsWith("/atlas")
                  : href === "/about"
                    ? pathname === "/about"
                    : false;

            if (href.startsWith("/#")) {
              // Anchor links — on landing page use native anchors, elsewhere use Link
              if (pathname === "/") {
                return (
                  <a
                    key={href}
                    href={href.replace("/", "")}
                    className={`text-[0.9rem] font-medium no-underline transition-colors duration-150 flex items-center ${
                      isActive
                        ? "text-[var(--color-text)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                    }`}
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
                >
                  {label}
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={`text-[0.9rem] font-medium no-underline transition-colors duration-150 flex items-center ${
                  isActive
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
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
      </div>
    </header>
  );
}
