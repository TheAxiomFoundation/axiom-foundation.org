import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 py-16 px-8 border-t border-[var(--color-border-subtle)]">
      <div className="max-w-[1280px] mx-auto text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/logos/rules-foundation.svg"
            alt="Rules Foundation"
            className="h-9 w-auto"
          />
        </div>
        <p className="text-[0.9rem] text-[var(--color-text-muted)] mb-6">
          Open infrastructure for encoded law.
        </p>
        <div className="flex justify-center gap-8">
          <Link
            href="/about"
            className="text-[0.85rem] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)] transition-colors duration-150"
          >
            About
          </Link>
          <a
            href="https://github.com/RulesFoundation"
            className="text-[0.85rem] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)] transition-colors duration-150"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="mailto:hello@rules.foundation"
            className="text-[0.85rem] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)] transition-colors duration-150"
          >
            Contact
          </a>
          <Link
            href="/privacy"
            className="text-[0.85rem] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)] transition-colors duration-150"
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
