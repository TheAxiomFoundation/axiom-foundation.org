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
    <section id="applications" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-center mb-24" aria-hidden="true">
          <span className="fleuron">
            <span className="fleuron-mark">&forall;</span>
          </span>
        </div>

        <div className="text-center mb-20">
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
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-[1080px] mx-auto">
          {APPLICATIONS.map((app) => (
            <div key={app.n} className="card-edition p-8 flex flex-col">
              <div className="flex items-baseline justify-between mb-5">
                <span className="serial">{app.n}</span>
                <span className="serif-italic text-[0.95rem] text-[var(--color-ink-muted)]">
                  {app.actor}
                </span>
              </div>
              <h3 className="font-body text-[1.15rem] font-medium text-[var(--color-ink)] mb-3 leading-snug">
                {app.title}
              </h3>
              <p className="font-body text-[0.92rem] text-[var(--color-ink-secondary)] leading-relaxed m-0">
                {app.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
