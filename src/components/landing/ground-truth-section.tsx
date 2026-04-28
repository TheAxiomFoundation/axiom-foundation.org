import { TargetIcon, CpuIcon, CheckIcon } from "@/components/icons";

export function GroundTruthSection() {
  return (
    <section className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-center mb-24" aria-hidden="true">
          <span className="fleuron">
            <span className="fleuron-mark">∀</span>
          </span>
        </div>
        <div className="text-center mb-20">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">§</span>
            VI &middot; For AI
          </span>
          <h2 className="heading-section text-[var(--color-ink)] mb-6 mt-2">
            Verifiable rewards
          </h2>
          <p className="font-body text-lg font-light text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            AI systems answering questions about policy rules need ground truth.
            RuleSpec encodings provide verifiable correctness signals for training.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
          {[
            {
              icon: <TargetIcon className="w-6 h-6" />,
              title: "Training datasets",
              desc: "Millions of (situation, correct_answer) pairs grounded in actual statute. Not synthetic - legally verified.",
            },
            {
              icon: <CpuIcon className="w-6 h-6" />,
              title: "Verifier",
              desc: "LLM generates answer, RuleSpec executor checks correctness, binary reward signal. Real-time RLVR for policy rule accuracy.",
            },
            {
              icon: <CheckIcon size={16} className="w-4 h-4" />,
              title: "Evaluation benchmarks",
              desc: "Standardized test suites measuring AI accuracy on EITC, SNAP, Medicaid, and hundreds more programs.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="card-edition p-10"
            >
              <div className="w-12 h-12 flex items-center justify-center border border-[var(--color-rule)] rounded-sm text-[var(--color-accent)] mb-6">
                {card.icon}
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
      </div>
    </section>
  );
}
