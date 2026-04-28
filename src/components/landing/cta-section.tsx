import Link from "next/link";
import { CodeIcon } from "@/components/icons";

export function CtaSection() {
  return (
    <section
      className="relative z-1 py-32 px-8 border-t border-[var(--color-rule-subtle)]"
    >
      <div className="max-w-[700px] mx-auto text-center">
        <h2 className="heading-section mb-6">
          Get involved
        </h2>
        <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed mb-12">
          The Axiom Project builds the canonical rules layer. Axiom Labs prototypes
          the applied layer. Both depend on an open community.
        </p>

        <div className="flex justify-center gap-6 mb-12 flex-wrap">
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

        <div className="flex justify-center gap-8 flex-wrap">
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
              href: "https://github.com/TheAxiomFoundation/autorulespec",
              label: "AutoRuleSpec",
            },
            { href: "/about", label: "About us", internal: true },
          ].map((link) =>
            link.internal ? (
              <Link
                key={link.label}
                href={link.href}
                className="font-mono text-[0.85rem] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors duration-150"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-[0.85rem] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors duration-150"
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
