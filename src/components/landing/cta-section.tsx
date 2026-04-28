import Link from "next/link";
import { CodeIcon } from "@/components/icons";

export function CtaSection() {
  return (
    <section
      className="relative z-1 py-32 px-8 border-t border-[var(--color-rule-subtle)]"
    >
      <div className="max-w-[720px] mx-auto text-center">
        <div className="flex justify-center mb-16" aria-hidden="true">
          <span className="fleuron">
            <span className="fleuron-mark">∀</span>
          </span>
        </div>

        <span className="kicker mb-6 inline-flex">
          <span className="kicker-mark">§</span>
          Coda &middot; Get Involved
        </span>
        <h2 className="heading-section mb-6 mt-2">
          Get involved
        </h2>
        <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed mb-12">
          The Axiom Project builds the canonical rules layer. Axiom Labs
          prototypes <span className="serif-italic text-[var(--color-ink)]">the applied layer</span>.
          Both depend on an open community.
        </p>

        <div className="flex justify-center gap-4 mb-14 flex-wrap">
          <a
            href="https://github.com/TheAxiomFoundation/rules-us"
            className="btn-primary"
          >
            <CodeIcon className="w-5 h-5" />
            Encode your jurisdiction
          </a>
          <a
            href="https://github.com/TheAxiomFoundation/rulespec/issues"
            className="btn-outline"
          >
            Validate our work
          </a>
          <a href="mailto:hello@axiom-foundation.org" className="btn-outline">
            Fund the mission
          </a>
        </div>

        <div className="flex justify-center gap-x-8 gap-y-3 flex-wrap pt-8 border-t border-[var(--color-rule-subtle)]">
          {[
            {
              href: "https://github.com/TheAxiomFoundation/rulespec",
              label: "RuleSpec specification",
            },
            {
              href: "https://github.com/TheAxiomFoundation",
              label: "Axiom platform",
            },
            {
              href: "https://github.com/TheAxiomFoundation/axiom-encode",
              label: "Encoder",
            },
            { href: "/about", label: "About us", internal: true },
          ].map((link) =>
            link.internal ? (
              <Link
                key={link.label}
                href={link.href}
                className="font-mono text-[0.8rem] tracking-[0.04em] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors duration-150"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-[0.8rem] tracking-[0.04em] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors duration-150"
              >
                {link.label}
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
}
