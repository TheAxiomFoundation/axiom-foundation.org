import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { axiomAppHref } from "@/lib/urls";

const PRINCIPLES = [
  {
    n: "01",
    title: "Cited",
    body:
      "Every value points back to a section. No magic numbers. If you change a number, you change a citation too.",
  },
  {
    n: "02",
    title: "Time-aware",
    body:
      "Effective dates on every clause. Ask what the law said in 2019, in 2024, after the next reform — and get a different answer to each.",
  },
  {
    n: "03",
    title: "Composable",
    body:
      "Reform a parameter without rewriting the surrounding rules. Layer counterfactuals on top of enacted law.",
  },
  {
    n: "04",
    title: "Verified",
    body:
      "Every encoding is cross-checked against the calculators of record — PolicyEngine, TAXSIM — before it ships.",
  },
];

const PTC_TIMELINE = [
  {
    period: "2014 – 2020",
    note: "Original ACA",
    rate: "2.0% – 9.5%",
    desc: "Sliding scale, 100–400% FPL",
  },
  {
    period: "2021 – 2025",
    note: "ARPA + IRA extension",
    rate: "0.0% – 8.5%",
    desc: "Suspended floor, no income cap",
    highlight: true,
  },
  {
    period: "2026 →",
    note: "Reverts",
    rate: "2.0% – 9.5%",
    desc: "Back to original schedule",
  },
];

export function EncodedLawSection() {
  return (
    <section id="encoded" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-center mb-24" aria-hidden="true">
          <span className="fleuron">
            <span className="fleuron-mark">&forall;</span>
          </span>
        </div>

        <div className="text-center mb-20">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            II &middot; Encoded law
          </span>
          <h2 className="heading-section mb-6 mt-2">
            What it means to encode a law
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[640px] mx-auto leading-relaxed">
            Not just text in a database. A working encoding has to know{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              what it cites, when it applies, and how to compute its own answer
            </span>
            .
          </p>
        </div>

        {/* Four principles */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 max-w-[1100px] mx-auto mb-24">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="card-edition p-6">
              <div className="flex items-baseline justify-between mb-4">
                <span className="serial">{p.n}</span>
                <span className="serif-italic text-[0.95rem] text-[var(--color-ink-muted)]">
                  &para;
                </span>
              </div>
              <h3 className="font-body text-[1.05rem] font-medium text-[var(--color-ink)] mb-2">
                {p.title}
              </h3>
              <p className="font-body text-[0.85rem] text-[var(--color-ink-secondary)] leading-relaxed m-0">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Worked example */}
        <div className="max-w-[920px] mx-auto">
          <div className="text-center mb-10">
            <span className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)]">
              An example, time-aware
            </span>
            <h3 className="font-display font-light text-[1.6rem] tracking-[0.04em] text-[var(--color-ink)] mt-3 mb-3">
              ACA Premium Tax Credit, three eras
            </h3>
            <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
              The same statute &mdash;{" "}
              <span className="font-mono text-[0.85rem] text-[var(--color-ink)]">
                26 USC &sect; 36B(b)(3)
              </span>{" "}
              &mdash; computes three different answers depending on when you
              ask.
            </p>
          </div>

          <div className="border border-[var(--color-rule)] rounded-md overflow-hidden bg-[var(--color-paper-elevated)]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr] font-mono text-[0.65rem] tracking-[0.18em] uppercase border-b border-[var(--color-rule)] bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
              <div className="px-5 py-3">Effective</div>
              <div className="px-5 py-3">Trigger</div>
              <div className="px-5 py-3">Rate band</div>
              <div className="px-5 py-3">Notes</div>
            </div>
            {PTC_TIMELINE.map((row) => (
              <div
                key={row.period}
                className={`grid grid-cols-[1.2fr_1fr_1fr_1.4fr] border-b border-[var(--color-rule-subtle)] last:border-b-0 transition-colors ${
                  row.highlight
                    ? "bg-[var(--color-accent-light)]"
                    : ""
                }`}
              >
                <div
                  className={`px-5 py-4 font-mono text-[0.85rem] tnum ${
                    row.highlight
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-ink)]"
                  }`}
                  style={{ fontFeatureSettings: '"tnum","lnum"' }}
                >
                  {row.period}
                </div>
                <div className="px-5 py-4 font-body text-[0.9rem] text-[var(--color-ink-secondary)]">
                  {row.note}
                </div>
                <div
                  className="px-5 py-4 font-mono text-[0.85rem] text-[var(--color-ink)] tnum"
                  style={{ fontFeatureSettings: '"tnum","lnum"' }}
                >
                  {row.rate}
                </div>
                <div className="px-5 py-4 font-body text-[0.85rem] text-[var(--color-ink-secondary)]">
                  {row.desc}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 font-body text-[0.95rem] text-[var(--color-ink-muted)] max-w-[640px] mx-auto leading-relaxed">
            <span className="serif-italic text-[var(--color-ink-secondary)]">
              Same code, three answers.
            </span>{" "}
            Pass a date, get the rule that applied.
          </p>

          <div className="flex justify-center gap-4 mt-12 flex-wrap">
            <a href={axiomAppHref()} className="btn-primary">
              See it in Axiom
              <ArrowRightIcon className="w-5 h-5" />
            </a>
            <Link href="/format" className="btn-outline">
              Compare formats
            </Link>
            <a
              href="https://github.com/TheAxiomFoundation/rulespec"
              className="btn-outline"
            >
              Spec on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
