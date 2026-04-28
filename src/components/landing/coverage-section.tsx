import { TargetIcon, CodeIcon, CpuIcon, CheckIcon } from "@/components/icons";

export function CoverageSection() {
  return (
    <section
      id="coverage"
      className="relative z-1 py-32 px-8"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, transparent 100%)",
      }}
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-center mb-24" aria-hidden="true">
          <span className="fleuron">
            <span className="fleuron-mark">∀</span>
          </span>
        </div>
        <div className="text-center mb-20">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">§</span>
            VII &middot; Coverage
          </span>
          <h2 className="heading-section text-[var(--color-ink)] mb-6 mt-2">
            Encoding coverage
          </h2>
          <p className="font-body text-lg font-light text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Current state of statute encoding across jurisdictions.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
          {[
            {
              icon: <TargetIcon className="w-6 h-6" />,
              title: "Federal (rules-us)",
              desc: "74 RuleSpec files \u2022 EITC \u2022 CTC \u2022 ACA PTC \u2022 standard deduction \u2022 SNAP \u2022 education credits",
            },
            {
              icon: <CodeIcon className="w-6 h-6" />,
              title: "California (rules-us-ca)",
              desc: "23 RuleSpec files \u2022 RTC \u00A717041 income tax \u2022 CalEITC \u2022 Young Child Tax Credit \u2022 Mental Health surtax",
            },
            {
              icon: <CpuIcon className="w-6 h-6" />,
              title: "New York (rules-us-ny)",
              desc: "7 RuleSpec files \u2022 Tax Law \u00A7601 rates \u2022 NY EITC \u2022 Empire State Child Credit \u2022 NYC income tax",
            },
          ].map((card, i) => (
            <div
              key={card.title}
              className="card-edition p-10 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 flex items-center justify-center border border-[var(--color-rule)] rounded-sm text-[var(--color-accent)]">
                  {card.icon}
                </div>
                <span className="serial">
                  Jurisdiction {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-body text-[1.3rem] text-[var(--color-ink)] mb-3">
                {card.title}
              </h3>
              <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-12 flex-wrap mt-8 max-md:flex-col max-md:items-center max-md:gap-4">
          {[
            "100+ total RuleSpec files across 3 US jurisdictions",
            "Canada benefits encoded as RuleSpec YAML",
            "All encodings validated against external oracles",
          ].map((text) => (
            <div
              key={text}
              className="flex items-center gap-2 font-body text-sm text-[var(--color-ink-secondary)]"
            >
              <CheckIcon className="w-4 h-4 text-[var(--color-success)]" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
