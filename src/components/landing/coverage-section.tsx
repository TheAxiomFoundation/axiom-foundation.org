import { TargetIcon, CodeIcon, CpuIcon, CheckIcon } from "@/components/icons";

export function CoverageSection() {
  return (
    <section
      id="coverage"
      className="relative z-1 py-32 px-8"
      style={{
        background:
          "linear-gradient(180deg, rgba(59,130,246,0.03) 0%, transparent 100%)",
      }}
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="eyebrow block mb-4">Progress</span>
          <h2 className="heading-section text-[var(--color-text)] mb-6">
            Encoding coverage
          </h2>
          <p className="font-[family-name:var(--f-body)] text-lg font-light text-[var(--color-text-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Current state of statute encoding across jurisdictions.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
          {[
            {
              icon: <TargetIcon className="w-6 h-6" />,
              title: "Federal (rac-us)",
              desc: "74 .rac files \u2022 EITC \u2022 CTC \u2022 ACA PTC \u2022 standard deduction \u2022 SNAP \u2022 education credits",
            },
            {
              icon: <CodeIcon className="w-6 h-6" />,
              title: "California (rac-us-ca)",
              desc: "23 .rac files \u2022 RTC \u00A717041 income tax \u2022 CalEITC \u2022 Young Child Tax Credit \u2022 Mental Health surtax",
            },
            {
              icon: <CpuIcon className="w-6 h-6" />,
              title: "New York (rac-us-ny)",
              desc: "7 .rac files \u2022 Tax Law \u00A7601 rates \u2022 NY EITC \u2022 Empire State Child Credit \u2022 NYC income tax",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="p-12 bg-gradient-to-br from-[rgba(59,130,246,0.08)] to-[rgba(59,130,246,0.02)] border border-[var(--color-border)] rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(59,130,246,0.15)]"
            >
              <div className="w-14 h-14 flex items-center justify-center bg-[var(--color-void)] border border-[var(--color-border)] rounded-xl text-[var(--color-precision)] mb-6">
                {card.icon}
              </div>
              <h3 className="font-[family-name:var(--f-display)] text-[1.35rem] text-[var(--color-text)] mb-4">
                {card.title}
              </h3>
              <p className="font-[family-name:var(--f-body)] text-[0.95rem] text-[var(--color-text-secondary)] leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-12 flex-wrap mt-8 max-md:flex-col max-md:items-center max-md:gap-4">
          {[
            "100+ total .rac files across 3 US jurisdictions",
            "Canada benefits also encoded (.cosilico format)",
            "All encodings validated against external oracles",
          ].map((text) => (
            <div
              key={text}
              className="flex items-center gap-2 font-[family-name:var(--f-body)] text-sm text-[var(--color-text-secondary)]"
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
