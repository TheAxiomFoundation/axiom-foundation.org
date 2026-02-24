"use client";

import { useState, useEffect } from "react";
import CodeBlock from "@/components/code-block";
import { CodeIcon, CheckIcon, CpuIcon } from "@/components/icons";
import { heroRacCode } from "@/lib/rac-examples";

function CodeTransform() {
  const [phase, setPhase] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleClick = () => {
    setIsPaused(true);
    setPhase((p) => (p + 1) % 3);
  };

  const statuteText = `(a) In general.\u2014 There is hereby
imposed a tax equal to 3.8 percent
of the lesser of net investment
income or modified AGI in excess
of the threshold amount.`;

  return (
    <div
      className="flex items-center justify-center gap-8 mb-20 flex-wrap md:flex-row flex-col cursor-pointer"
      onClick={handleClick}
      title="Click to advance"
    >
      {/* Statute panel */}
      <div
        className={`flex-[0_0_340px] max-md:flex-[1_1_100%] max-md:max-w-full bg-[var(--color-bg)] border rounded-xl overflow-hidden transition-all duration-500 ${
          phase === 0
            ? "opacity-100 scale-100 border-[var(--color-precision)] shadow-[0_0_40px_rgba(59,130,246,0.15)]"
            : "opacity-60 scale-[0.98] border-[var(--color-border-subtle)]"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-border-subtle)]">
          <span className="w-2 h-2 bg-[var(--color-warmth)] rounded-full" />
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            26 USC &sect; 1411(a)
          </span>
        </div>
        <CodeBlock
          code={statuteText}
          language="plain"
          className="p-6 font-mono text-[0.8rem] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap m-0 min-h-[180px]"
        />
      </div>

      {/* Arrow */}
      <div className="flex flex-col items-center gap-2 max-md:rotate-90 max-md:my-4">
        <div
          className={`w-15 h-0.5 relative transition-colors duration-200 after:content-[''] after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:border-[5px] after:border-transparent after:border-l-current after:bg-transparent ${
            phase === 1
              ? "bg-[var(--color-precision)] after:border-l-[var(--color-precision)]"
              : "bg-[var(--color-border)] after:border-l-[var(--color-border)]"
          }`}
        />
        <span
          className={`font-mono text-[0.7rem] uppercase tracking-[0.1em] transition-colors duration-200 ${
            phase === 1
              ? "text-[var(--color-precision)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          AutoRAC
        </span>
      </div>

      {/* RAC panel */}
      <div
        className={`flex-[0_0_340px] max-md:flex-[1_1_100%] max-md:max-w-full bg-[var(--color-bg)] border rounded-xl overflow-hidden transition-all duration-500 ${
          phase === 2
            ? "opacity-100 scale-100 border-[var(--color-precision)] shadow-[0_0_40px_rgba(59,130,246,0.15)]"
            : "opacity-60 scale-[0.98] border-[var(--color-border-subtle)]"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(59,130,246,0.1)] border-b border-[var(--color-border-subtle)]">
          <span className="w-2 h-2 bg-[var(--color-precision)] rounded-full" />
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            statute/26/1411/a.rac
          </span>
        </div>
        <CodeBlock
          code={heroRacCode}
          language="rac"
          className="p-6 font-mono text-[0.8rem] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap m-0 min-h-[180px]"
        />
      </div>
    </div>
  );
}

export function RacSection() {
  return (
    <section id="about" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="eyebrow block mb-4">What is RAC</span>
          <h2 className="heading-section text-[var(--color-text)] mb-6">
            Rules as Code
          </h2>
          <p className="text-lg font-light text-[var(--color-text-secondary)] max-w-[600px] mx-auto leading-relaxed">
            A domain-specific language for encoding rules with auditability,
            temporal versioning, and legal citations built in.
          </p>
        </div>

        <CodeTransform />

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
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[rgba(59,130,246,0.1)] rounded text-[var(--color-precision)]">
                    from
                  </code>{" "}
                  clauses with effective dates.
                </>
              ),
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card p-8 transition-all duration-200 hover:bg-[rgba(59,130,246,0.05)] hover:border-[var(--color-border)] hover:-translate-y-1"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-[rgba(59,130,246,0.1)] rounded-[10px] text-[var(--color-precision)] mb-6">
                {f.icon}
              </div>
              <h3 className="font-display text-xl text-[var(--color-text)] mb-2">
                {f.title}
              </h3>
              <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
