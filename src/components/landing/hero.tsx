"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { axiomAppHref } from "@/lib/urls";

type Phase = "statute" | "household" | "computed";

const PHASES: Phase[] = ["statute", "household", "computed"];
const PHASE_LABEL: Record<Phase, string> = {
  statute: "Statute",
  household: "Household",
  computed: "Computed",
};

const STATUTE_TEXT =
  "(a) Allowance of credit.— There shall be allowed as a credit against the tax imposed by this chapter for the taxable year an amount equal to the sum of $2,000 multiplied by the number of qualifying children of the taxpayer.";

function HeroDemo() {
  const [phase, setPhase] = useState<Phase>("statute");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const i = setInterval(() => {
      setPhase((p) => PHASES[(PHASES.indexOf(p) + 1) % PHASES.length]);
    }, 4500);
    return () => clearInterval(i);
  }, [paused]);

  return (
    <div className="max-w-[560px] mx-auto select-none">
      <div className="border border-[#2a2826] rounded-md overflow-hidden bg-[var(--color-code-bg)]">
        <div className="gradient-fill flex border-b border-[#2a2826]">
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPaused(true);
                setPhase(p);
              }}
              className={`flex-1 px-4 py-2.5 font-mono text-[0.7rem] tracking-[0.16em] uppercase transition-colors duration-300 ${
                phase === p
                  ? "text-white border-b-2 border-white -mb-px"
                  : "text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)]"
              }`}
            >
              {PHASE_LABEL[p]}
            </button>
          ))}
        </div>

        <div className="relative min-h-[260px]">
          <div
            className={`absolute inset-0 p-7 text-[0.95rem] text-[var(--color-code-text)] leading-[1.7] transition-opacity duration-700 gradient-fill ${
              phase === "statute" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ fontFamily: "var(--f-serif)" }}
          >
            <div className="font-mono text-[0.62rem] tracking-[0.18em] uppercase mb-3 text-[rgba(255,255,255,0.55)]">
              26 USC &sect; 24(a)
            </div>
            {STATUTE_TEXT}
          </div>

          <div
            className={`absolute inset-0 p-7 text-[0.95rem] text-[var(--color-code-text)] leading-[1.7] transition-opacity duration-700 ${
              phase === "household" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="font-mono text-[0.62rem] tracking-[0.18em] uppercase mb-4 text-[rgba(255,255,255,0.55)]">
              A taxpayer
            </div>
            <ul className="space-y-2 font-mono text-[0.85rem] leading-relaxed">
              <li>
                <span className="text-[rgba(255,255,255,0.55)]">filing status</span>{" "}
                <span className="text-[var(--color-code-text)]">
                  &middot; married filing jointly
                </span>
              </li>
              <li>
                <span className="text-[rgba(255,255,255,0.55)]">qualifying children</span>{" "}
                <span className="text-[var(--color-code-text)]">&middot; 2</span>
              </li>
              <li>
                <span className="text-[rgba(255,255,255,0.55)]">adjusted gross income</span>{" "}
                <span className="text-[var(--color-code-text)]">&middot; $80,000</span>
              </li>
              <li>
                <span className="text-[rgba(255,255,255,0.55)]">tax year</span>{" "}
                <span className="text-[var(--color-code-text)]">&middot; 2024</span>
              </li>
            </ul>
          </div>

          <div
            className={`absolute inset-0 p-7 transition-opacity duration-700 ${
              phase === "computed" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="font-mono text-[0.62rem] tracking-[0.18em] uppercase mb-3 text-[rgba(255,255,255,0.55)]">
              Federal child tax credit
            </div>
            <div className="flex items-baseline gap-3 mb-5">
              <span
                className="tnum font-display font-light text-white text-[3.2rem] leading-none"
                style={{ fontFeatureSettings: '"tnum","lnum"' }}
              >
                $4,000
              </span>
              <span className="font-mono text-[0.7rem] tracking-[0.14em] uppercase text-[rgba(255,255,255,0.55)]">
                tax credit
              </span>
            </div>
            <div className="border-t border-[rgba(255,255,255,0.1)] pt-4 space-y-1.5 text-[0.78rem] font-mono leading-relaxed text-[rgba(255,255,255,0.65)]">
              <div>
                $2,000 per child &times; 2 children &nbsp;&middot;&nbsp;{" "}
                <span className="text-[rgba(255,255,255,0.42)]">26 USC &sect; 24(a)</span>
              </div>
              <div>
                Refundable up to $1,800 per child &nbsp;&middot;&nbsp;{" "}
                <span className="text-[rgba(255,255,255,0.42)]">26 USC &sect; 24(d)</span>
              </div>
              <div>
                No phase-out at $80k AGI &nbsp;&middot;&nbsp;{" "}
                <span className="text-[rgba(255,255,255,0.42)]">26 USC &sect; 24(b)(2)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center mt-3 font-mono text-[0.62rem] text-[var(--color-ink-muted)] tracking-[0.18em] uppercase">
        Statute, household, computed &mdash;{" "}
        <span className="text-[var(--color-accent)]">one source of truth</span>
      </p>
    </div>
  );
}

export function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative z-1 min-h-screen flex items-center justify-center py-24 px-8">
      <div
        className={`max-w-[1100px] w-full transition-all duration-800 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <div className="text-center mb-14">
          <span className="kicker mb-7 inline-flex">
            <span className="kicker-mark">&forall;</span>
            A 501(c)(3) for encoded law
          </span>

          <h1 className="heading-page mb-6 mt-1">
            We publish the world&apos;s laws &mdash; as code
          </h1>

          <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-[600px] mx-auto">
            Statutes, regulations, and policy rules turned into machine-readable
            encodings &mdash;{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              cited, time-aware, executable
            </span>{" "}
            &mdash; so anyone can compute, audit, or reform them.
          </p>
        </div>

        <HeroDemo />

        <div className="flex gap-4 justify-center items-center mt-14 flex-wrap">
          <a href={axiomAppHref()} className="btn-primary">
            Open Axiom
            <ArrowRightIcon className="w-5 h-5" />
          </a>
          <a href="#gap" className="btn-outline">
            Why this exists
          </a>
        </div>

        <div className="flex justify-center mt-20">
          <a
            href="#gap"
            className="scroll-cue"
            aria-label="Scroll to next section"
          >
            <span>Read on</span>
            <span className="scroll-cue-line" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
