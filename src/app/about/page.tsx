import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Axiom Foundation",
  description:
    "Axiom Foundation publishes open, machine-readable encodings of the world's rules, starting with tax and benefit policy — cited, time-aware, and executable.",
};

const BUILD = [
  {
    title: "The Axiom App",
    desc: "Explore the law: fetch and cite source documents, inspect the RuleSpec encodings that make them executable, and trace the logic through the computation graph. Every value cites its statute; every clause carries an effective date.",
  },
  {
    title: "RuleSpec",
    desc: "The open format for encoding statutes and regulations as executable, cited rules.",
  },
  {
    title: "The Encoder",
    desc: "An AI-assisted pipeline that reads source law, drafts encodings subsection by subsection, and logs every decision with its provenance.",
  },
  {
    title: "Validation",
    desc: "Encodings are cross-checked against independent engines, including PolicyEngine and TAXSIM. Open isn't enough; the point is that you can check our work.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-16">
          <h1 className="heading-page mb-6">About Axiom</h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed">
            Axiom Foundation publishes open, machine-readable encodings of the
            world&apos;s rules, starting with tax and benefit policy &mdash;
            statutes, regulations, and policy rules turned into cited,
            time-aware, executable code that anyone can run, audit, or reform.
          </p>
        </header>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">Why</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            The rules that decide who gets food assistance, health coverage, and
            tax credits are written in prose &mdash; then re-implemented,
            separately and privately, inside every eligibility system,
            calculator, and policy tool that needs them. The interpretation
            lives in closed code: hard to verify, harder to fix, duplicated
            everywhere. Axiom publishes that layer in the open, so there is one
            cited, checkable source for what a rule actually computes.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-6">What we build</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
            {BUILD.map((card) => (
              <div key={card.title} className="card-edition p-6">
                <h3 className="font-body text-lg text-[var(--color-ink)] mb-2">
                  {card.title}
                </h3>
                <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mt-6">
            We also build demonstrations on top of this layer &mdash; previews
            of what open, computable law makes possible. The layer underneath is
            the product.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">Where we come from</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            Axiom builds on six years of PolicyEngine infrastructure &mdash;
            tax-and-benefit models used by researchers, governments, and
            benefit-navigation tools in the US and UK. That foundation is what
            our encodings are verified against, and where our team learned what
            it takes to keep rules correct at scale.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">How we&apos;re organized</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            Axiom Foundation is a fiscally sponsored project of the PSL
            Foundation. Our code, our data, and our encoding decisions are
            public.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">Team</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            Axiom is led by Max Ghenis (CEO) and Ariel Kennan (President), with
            product led by Pavel Makarchuk.
          </p>
          <Link
            href="/team"
            className="inline-flex items-center gap-2 font-mono text-[0.8rem] tracking-[0.12em] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
          >
            Meet the team &rarr;
          </Link>
        </section>

        <section>
          <h2 className="heading-sub mb-4">Get in touch</h2>
          <div className="inline-block px-6 py-3 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md">
            <a
              href="mailto:hello@axiom-foundation.org"
              className="font-mono text-[var(--color-accent)] text-[0.95rem]"
            >
              hello@axiom-foundation.org
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
