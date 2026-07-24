import { ArrowRightIcon, CodeIcon, GitHubIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "./reveal";

export function FoundationSection() {
  return (
    <section
      id="foundation"
      className="section-tint-cream section-mark relative z-1 py-32 px-8"
    >
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="text-center mb-14">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Coda &middot; The foundation
          </span>
          <h2 className="heading-section mb-6 mt-2">
            Doing the public-interest work
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-[680px] mx-auto">
            Everything we publish &mdash; code, data, and the decisions behind
            them &mdash; is open.
          </p>
        </Reveal>

        <RevealGroup
          className="grid gap-px bg-[var(--color-rule)] border border-[var(--color-rule)] rounded-md overflow-hidden max-w-[1080px] mx-auto mb-14 md:grid-cols-3"
          staggerChildren={0.1}
        >
          {[
            {
              kicker: "Contribute",
              title: "Encode your jurisdiction",
              body:
                "Start with a single statute. The encoder pipeline does the heavy lifting; reviewers stand in for a stable bar.",
              href: "https://github.com/TheAxiomFoundation/rulespec-us",
              cta: "Open the contributor guide",
              icon: <CodeIcon className="w-5 h-5" />,
            },
            {
              kicker: "Verify",
              title: "Validate our work",
              body:
                "Every encoding is open and cross-checked against independent oracles. Find a discrepancy and we’ll explain why — or fix it.",
              href: "/validation",
              cta: "See how we validate",
              icon: <GitHubIcon className="w-5 h-5" />,
            },
            {
              kicker: "Fund",
              title: "Underwrite the public layer",
              body:
                "Encoded law belongs in the open. If you’d like to help keep it there, we’d like to talk.",
              href: "mailto:hello@axiom.org",
              cta: "hello@axiom.org",
              icon: null,
            },
          ].map((card) => (
            <RevealItem
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
            </RevealItem>
          ))}
        </RevealGroup>

      </div>
    </section>
  );
}
