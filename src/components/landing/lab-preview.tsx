import Link from "next/link";
import { CpuIcon, CodeIcon, TargetIcon, ArrowRightIcon } from "@/components/icons";

export function LabPreview() {
  const cards = [
    {
      icon: <CpuIcon className="w-6 h-6" />,
      title: "Encoding runs",
      desc: "Track every statute encoding attempt. See iteration counts, oracle match rates, and reviewer verdicts.",
      meta: "PASS/FAIL: RAC, Formula, Parameter, Integration",
    },
    {
      icon: <CodeIcon className="w-6 h-6" />,
      title: "Agent transcripts",
      desc: "Full chronological view of agent thinking, tool calls, and outputs. See orchestrator reasoning for why each agent was spawned.",
      meta: "Timeline view with THINKING, OUTPUT, TOOL events",
    },
    {
      icon: <TargetIcon className="w-6 h-6" />,
      title: "SDK sessions",
      desc: "Mission-level view of encoding campaigns. Token usage, cost tracking, and event streams from the Agent SDK.",
      meta: "Duration, events, tokens, cost per mission",
    },
  ];

  return (
    <section id="lab" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="eyebrow block mb-4">Development</span>
          <h2 className="heading-section text-[var(--color-text)] mb-6">
            Experiment lab
          </h2>
          <p className="text-lg font-light text-[var(--color-text-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Live experiment tracking, agent transcripts, and calibration data.
            See what AutoRAC is working on in real time.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 mb-16">
          {cards.map((card) => (
            <Link
              key={card.title}
              href="/lab"
              className="p-12 bg-gradient-to-br from-[rgba(59,130,246,0.08)] to-[rgba(59,130,246,0.02)] border border-[var(--color-border)] rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(59,130,246,0.15)] no-underline"
            >
              <div className="w-14 h-14 flex items-center justify-center bg-[var(--color-void)] border border-[var(--color-border)] rounded-xl text-[var(--color-precision)] mb-6">
                {card.icon}
              </div>
              <h3 className="font-display text-[1.35rem] text-[var(--color-text)] mb-4">
                {card.title}
              </h3>
              <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-relaxed mb-4">
                {card.desc}
              </p>
              <div className="px-4 py-2 bg-[rgba(59,130,246,0.1)] rounded font-mono text-xs text-[var(--color-text-muted)]">
                <span>{card.meta}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link href="/lab" className="btn-primary">
            Open experiment lab
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
