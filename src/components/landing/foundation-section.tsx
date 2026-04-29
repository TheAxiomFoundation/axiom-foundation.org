import Link from "next/link";
import { ArrowRightIcon, CodeIcon, GitHubIcon } from "@/components/icons";

export function FoundationSection() {
  return (
    <section
      id="foundation"
      className="relative z-1 py-32 px-8 border-t border-[var(--color-rule-subtle)]"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-center mb-16" aria-hidden="true">
          <span className="fleuron">
            <span className="fleuron-mark">&forall;</span>
          </span>
        </div>

        <div className="text-center mb-14">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Coda &middot; The foundation
          </span>
          <h2 className="heading-section mb-6 mt-2">
            A 501(c)(3) doing the public-interest work
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-[680px] mx-auto">
            Axiom Foundation is a nonprofit fiscally sponsored by{" "}
            <a
              href="https://psl-foundation.org"
              target="_blank"
              rel="noopener noreferrer"
              className="link-quiet text-[var(--color-ink)]"
            >
              PSL Foundation
            </a>
            . Open code, open data, open governance. The infrastructure is
            meant to outlast any single project that builds on it.
          </p>
        </div>

        <div className="grid gap-px bg-[var(--color-rule)] border border-[var(--color-rule)] rounded-md overflow-hidden max-w-[1080px] mx-auto mb-14 md:grid-cols-3">
          {[
            {
              kicker: "Contribute",
              title: "Encode your jurisdiction",
              body:
                "Start with a single statute. The encoder pipeline does the heavy lifting; reviewers stand in for a stable bar.",
              href: "https://github.com/TheAxiomFoundation/rules-us",
              cta: "Open the contributor guide",
              icon: <CodeIcon className="w-5 h-5" />,
            },
            {
              kicker: "Verify",
              title: "Validate our work",
              body:
                "Every encoding is open and cross-checked. Find a discrepancy and we’ll explain why — or fix it.",
              href: "https://github.com/TheAxiomFoundation/rulespec/issues",
              cta: "Browse open issues",
              icon: <GitHubIcon className="w-5 h-5" />,
            },
            {
              kicker: "Fund",
              title: "Underwrite the public layer",
              body:
                "Encoded law belongs in the public domain. If you’d like to help keep it there, we’d like to talk.",
              href: "mailto:hello@axiom-foundation.org",
              cta: "hello@axiom-foundation.org",
              icon: null,
            },
          ].map((card) => (
            <div
              key={card.kicker}
              className="bg-[var(--color-paper-elevated)] p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="serial">{card.kicker}</span>
                {card.icon && (
                  <span className="text-[var(--color-accent)]">{card.icon}</span>
                )}
              </div>
              <h3 className="font-body text-[1.1rem] font-medium text-[var(--color-ink)] mb-3 leading-snug">
                {card.title}
              </h3>
              <p className="font-body text-[0.9rem] text-[var(--color-ink-secondary)] leading-relaxed mb-6">
                {card.body}
              </p>
              <a
                href={card.href}
                className="mt-auto inline-flex items-center gap-2 font-mono text-[0.72rem] tracking-[0.16em] uppercase text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
                {...(card.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {card.cta}
                <ArrowRightIcon className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-x-8 gap-y-3 flex-wrap pt-8 border-t border-[var(--color-rule-subtle)]">
          {[
            {
              href: "/format",
              label: "Format comparison",
              internal: true,
            },
            {
              href: "https://github.com/TheAxiomFoundation/axiom-encode",
              label: "Encoder source",
            },
            {
              href: "https://github.com/TheAxiomFoundation",
              label: "All repositories",
            },
            { href: "/about", label: "About the foundation", internal: true },
          ].map((link) =>
            link.internal ? (
              <Link
                key={link.label}
                href={link.href}
                className="font-mono text-[0.78rem] tracking-[0.04em] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors duration-150"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-[0.78rem] tracking-[0.04em] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors duration-150"
              >
                {link.label}
              </a>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
