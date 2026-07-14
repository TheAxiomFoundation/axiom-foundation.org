import { Reveal, RevealGroup, RevealItem } from "./reveal";

const APPLICATIONS = [
  {
    n: "01",
    title: "Calculators that audit themselves",
    body:
      "Tax software, benefit estimators, eligibility tools — all running off the same encoding, all able to point at the statute behind any number.",
    actor: "for builders",
  },
  {
    n: "02",
    title: "Ground truth for AI",
    body:
      "People keep asking models policy questions. The Axiom Foundation gives them a key — verifiable answers grounded in actual law, useful for both training and inference.",
    actor: "for AI labs",
  },
  {
    n: "03",
    title: "Reform without rewriting",
    body:
      "Change a parameter, re-run the calculation. Compare current law against any proposed amendment without touching the surrounding rules.",
    actor: "for analysts",
  },
  {
    n: "04",
    title: "Government in plain sight",
    body:
      "Every value cites its source. Every formula is open. Anyone can read the law, run it, and check that the answer follows.",
    actor: "for the public",
  },
];

export function ApplicationsSection() {
  return (
    <section
      id="applications"
      className="relative z-1 py-32 px-8"
    >
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="text-center mb-20">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            IV &middot; What it powers
          </span>
          <h2 className="heading-section mb-6 mt-2">
            One encoding. Many places to use it.
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[640px] mx-auto leading-relaxed">
            Encode a rule once, in the open, and everyone can build on it
            &mdash;{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              correctly, affordably, and in plain sight
            </span>
            .
          </p>
        </Reveal>

        <RevealGroup
          className="grid gap-6 md:grid-cols-2 max-w-[1080px] mx-auto"
          staggerChildren={0.1}
        >
          {APPLICATIONS.map((app) => (
            <RevealItem
              key={app.n}
              className="card-edition p-8 flex flex-col transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex items-baseline justify-between mb-5">
                <span className="serif-italic text-[0.95rem] text-[var(--color-ink-muted)]">
                  {app.actor}
                </span>
                <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-[var(--color-ink-muted)]">
                  {app.n}
                </span>
              </div>
              <h3 className="font-body text-[1.15rem] font-medium text-[var(--color-ink)] mb-3 leading-snug">
                {app.title}
              </h3>
              <p className="font-body text-[0.92rem] text-[var(--color-ink-secondary)] leading-relaxed m-0">
                {app.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
