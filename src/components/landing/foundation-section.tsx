import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Reveal } from "./reveal";

export function FoundationSection() {
  return (
    <section
      id="foundation"
      className="section-tint-cream relative z-1 py-32 px-8"
    >
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="text-center max-w-[720px] mx-auto">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Coda &middot; The foundation
          </span>
          <h2 className="heading-section mb-6 mt-2">
            Doing the public-interest work
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed">
            Everything we publish &mdash; code, data, and the decisions behind
            them &mdash; is open.
          </p>

          <a
            href="mailto:hello@axiom-foundation.org"
            className="mt-10 inline-flex items-center gap-2 font-mono text-[0.8rem] tracking-[0.12em] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
          >
            Get in touch &mdash; hello@axiom-foundation.org
            <ArrowRightIcon className="w-4 h-4" />
          </a>

          <div className="flex justify-center gap-x-8 gap-y-3 flex-wrap mt-12 pt-8 border-t border-[var(--color-rule-subtle)]">
            {[
              { href: "/about", label: "About the foundation" },
              { href: "/team", label: "Meet the team" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-[0.78rem] tracking-[0.04em] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
