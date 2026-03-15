"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubIcon } from "./icons";

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
    <header className="fixed top-0 left-0 right-0 z-100 py-4 nav-bar">
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2 no-underline">
          <img
            src="/logos/rules-atlas.svg"
            alt="Rules Atlas"
            className="h-11 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-8">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname?.startsWith(href) && !href.startsWith("/#");

            if (href.startsWith("/#")) {
              // Anchor links — on landing page use native anchors, elsewhere use Link
              if (pathname === "/") {
                return (
                  <a
                    key={href}
                    href={href.replace("/", "")}
                    className={`text-[0.9rem] font-medium no-underline transition-colors duration-150 flex items-center ${
                      /* v8 ignore start -- anchor links never match pathname */
                      isActive
                        ? "text-[var(--color-ink)]"
                        : /* v8 ignore stop */
                          "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
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
                  className="text-[0.9rem] font-medium no-underline text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-150 flex items-center"
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
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <a
            href="https://github.com/RuleAtlas/rac"
            className="text-[0.9rem] font-medium no-underline text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-150 flex items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a
            href="https://github.com/RuleAtlas"
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-150 flex items-center"
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
