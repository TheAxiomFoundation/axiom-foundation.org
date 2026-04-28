import { CodeIcon, CheckIcon, CpuIcon } from "@/components/icons";

export function RuleSpecSection() {
  return (
    <section id="rulespec" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="heading-section mb-6">
            RuleSpec
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            A domain-specific language for encoding rules with auditability,
            temporal versioning, and legal citations built in.
          </p>
        </div>


        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">
          {[
            {
              icon: <CodeIcon className="w-6 h-6" />,
              title: "Self-contained",
              desc: "One file captures statute text (as comments), parameters, and formulas. Parsed into a typed AST, compiled to IR, executed or compiled to native Rust.",
            },
            {
              icon: <CheckIcon size={16} className="w-4 h-4" />,
              title: "Legally grounded",
              desc: "File paths mirror legal citations. Every value traces back to statute. No magic numbers allowed.",
            },
            {
              icon: <CpuIcon className="w-6 h-6" />,
              title: "Temporal versioning",
              desc: (
                <>
                  Track how law changes over time. Every definition uses{" "}
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[var(--color-accent-light)] rounded text-[var(--color-accent)]">
                    from
                  </code>{" "}
                  clauses with effective dates.
                </>
              ),
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card p-8 transition-all duration-200"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-accent-light)] rounded-md text-[var(--color-accent)] mb-6">
                {f.icon}
              </div>
              <h3 className="font-body text-xl text-[var(--color-ink)] mb-2">
                {f.title}
              </h3>
              <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
