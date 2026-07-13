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
      "Models keep getting asked policy questions. RuleSpec gives them a key — verifiable answers grounded in actual statute, useful for both training and inference.",
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
      className="section-mark section-mark-pilcrow section-mark-left relative z-1 py-32 px-8"
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
            The point of doing this once, openly, is so it stops having to be
            done a thousand times in private &mdash;{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              wrongly, expensively, and out of sight
            </span>
            .
          </p>
        </Reveal>

        {/* Fanned deck: cards overlap like a spread hand — every card
            stays readable, and the hovered one straightens, lifts, and
            comes to the front. Base tilt/arc live in CSS vars so the
            hover transform can override them from a class (inline
            transforms would win over hover classes). */}
        <RevealGroup
          className="flex flex-col items-stretch md:flex-row md:items-end md:justify-center max-w-[1200px] mx-auto pt-2 pb-4"
          staggerChildren={0.1}
        >
          {APPLICATIONS.map((app, i) => {
            const tilt = ["-2.5deg", "-0.8deg", "0.8deg", "2.5deg"][i];
            const arc = ["6px", "0px", "0px", "6px"][i];
            return (
              <RevealItem
                key={app.n}
                className={`group relative md:w-[310px] md:shrink-0 hover:z-40 ${
                  i > 0 ? "-mt-6 md:mt-0 md:-ml-7" : ""
                }`}
              >
                <div
                  style={
                    {
                      "--tilt": tilt,
                      "--arc": arc,
                    } as React.CSSProperties
                  }
                  className="card-edition p-7 flex h-full flex-col bg-[var(--color-paper-elevated)] shadow-[0_10px_30px_-18px_rgba(28,25,23,0.35)] transition-all duration-300 [transform:rotate(var(--tilt))_translateY(var(--arc))] group-hover:[transform:rotate(0deg)_translateY(calc(var(--arc)-18px))_scale(1.04)] group-hover:shadow-[0_28px_60px_-24px_rgba(28,25,23,0.5)]"
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
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
