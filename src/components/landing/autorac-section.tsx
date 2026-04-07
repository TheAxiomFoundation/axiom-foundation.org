"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ArrowRightIcon, CheckIcon, XIcon } from "@/components/icons";
import CodeBlock from "@/components/code-block";
import { heroRacCode } from "@/lib/rac-examples";

function AutoRACTransform() {
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
      className="flex items-center md:items-stretch justify-center gap-8 flex-wrap md:flex-row flex-col cursor-pointer mb-12"
      onClick={handleClick}
      title="Click to advance"
    >
      {/* Statute panel */}
      <div
        className={`flex-[0_0_380px] max-md:flex-[1_1_100%] max-md:max-w-full bg-[var(--color-code-bg)] border rounded-md overflow-hidden transition-all duration-500 flex flex-col ${
          phase === 0
            ? "opacity-100 scale-100 border-[var(--color-accent)] shadow-[0_0_30px_rgba(180,83,9,0.12)]"
            : "opacity-60 scale-[0.98] border-[#2a2826]"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2a2826]">
          <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full" />
          <span className="font-mono text-xs text-[var(--color-code-text)]">
            26 USC &sect; 1411(a)
          </span>
        </div>
        <div className="p-6 font-mono text-[0.85rem] text-[var(--color-code-text)] leading-relaxed whitespace-pre-wrap flex-1">
          {statuteText}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex flex-col items-center gap-2 max-md:rotate-90 max-md:my-4">
        <div
          className={`w-16 h-0.5 relative transition-colors duration-200 after:content-[''] after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:border-[5px] after:border-transparent after:border-l-current after:bg-transparent ${
            phase === 1
              ? "bg-[var(--color-accent)] after:border-l-[var(--color-accent)]"
              : "bg-[var(--color-rule)] after:border-l-[var(--color-rule)]"
          }`}
        />
        <span
          className={`font-mono text-[0.7rem] uppercase tracking-[0.12em] transition-colors duration-200 ${
            phase === 1
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-ink-muted)]"
          }`}
        >
          AutoRAC
        </span>
      </div>

      {/* RAC panel */}
      <div
        className={`flex-[0_0_380px] max-md:flex-[1_1_100%] max-md:max-w-full bg-[var(--color-code-bg)] border rounded-md overflow-hidden transition-all duration-500 flex flex-col ${
          phase === 2
            ? "opacity-100 scale-100 border-[var(--color-accent)] shadow-[0_0_30px_rgba(180,83,9,0.12)]"
            : "opacity-60 scale-[0.98] border-[#2a2826]"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2a2826]">
          <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full" />
          <span className="font-mono text-xs text-[var(--color-code-text)]">
            statute/26/1411/a.rac
          </span>
        </div>
        <CodeBlock
          code={heroRacCode}
          language="rac"
          className="p-6 font-mono text-[0.85rem] leading-relaxed whitespace-pre-wrap m-0 flex-1"
        />
      </div>
    </div>
  );
}

interface TerminalLine {
  content: React.ReactNode;
  delay: number;
}

function AutoRACTerminal() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const lines: TerminalLine[] = [
    {
      delay: 0,
      content: (
        <>
          <span className="text-[var(--color-success)]">$ </span>
          <span className="text-[var(--color-ink)] font-medium">
            autorac encode &quot;26 USC 32&quot;
          </span>
        </>
      ),
    },
    { delay: 0.4, content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span> },
    {
      delay: 0.6,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[var(--color-ink-muted)]"> Loading 26 USC 32...</span>
          <span className="text-[var(--color-ink)] font-medium"> 81,247 characters</span>
        </>
      ),
    },
    {
      delay: 0.9,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[var(--color-ink-muted)]"> Parsing subsection tree...</span>
        </>
      ),
    },
    {
      delay: 1.2,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (a) Allowance of credit </span>
          <span className="text-[var(--color-ink-muted)]">           2,341 chars</span>
        </>
      ),
    },
    {
      delay: 1.35,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (b) Percentages and amounts </span>
          <span className="text-[var(--color-ink-muted)]">       4,892 chars</span>
        </>
      ),
    },
    {
      delay: 1.5,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (c) Definitions and special rules </span>
          <span className="text-[var(--color-ink-muted)]"> 5,675 chars</span>
        </>
      ),
    },
    {
      delay: 1.65,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   ...</span>
        </>
      ),
    },
    {
      delay: 1.8,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (n) Supplemental child credit </span>
          <span className="text-[var(--color-ink-muted)]">     1,203 chars</span>
        </>
      ),
    },
    {
      delay: 2.0,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warning)]">[atlas]</span>
          <span className="text-[var(--color-ink)] font-medium"> 14 subsections extracted</span>
        </>
      ),
    },
    { delay: 2.3, content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span> },
    {
      delay: 2.5,
      content: (
        <>
          <span className="font-semibold text-[var(--color-accent)]">[encode]</span>
          <span className="text-[var(--color-ink-muted)]"> Wave 1: </span>
          <span className="text-[rgba(255,255,255,0.35)]">
            (a), (b), (c), (d), (f), (h), (i), (j), (m), (n)
          </span>
        </>
      ),
    },
    {
      delay: 2.8,
      content: (
        <>
          <span className="font-semibold text-[var(--color-accent)]">[encode]</span>
          <span className="text-[var(--color-ink-muted)]"> Wave 2: </span>
          <span className="text-[rgba(255,255,255,0.35)]">(e), (g), (k), (l)</span>
          <span className="text-[var(--color-ink-muted)]"> &mdash; depends on wave 1</span>
        </>
      ),
    },
    {
      delay: 3.2,
      content: (
        <>
          <span className="font-semibold text-[var(--color-accent)]">[encode]</span>
          <span className="inline-block text-[var(--color-accent)]">
            {" "}
            ████████████████████
          </span>
          <span className="text-[var(--color-ink)] font-medium"> 14/14 complete</span>
        </>
      ),
    },
    { delay: 3.6, content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span> },
    {
      delay: 3.8,
      content: (
        <>
          <span className="font-semibold text-[#a78bfa]">[validate]</span>
          <span className="text-[var(--color-ink-muted)]"> CI:           </span>
          <span className="text-[var(--color-success)]">14/14 passed</span>
        </>
      ),
    },
    {
      delay: 4.1,
      content: (
        <>
          <span className="font-semibold text-[#a78bfa]">[validate]</span>
          <span className="text-[var(--color-ink-muted)]"> PolicyEngine: </span>
          <span className="text-[var(--color-success)]">12/14 match</span>
          <span className="text-[rgba(255,255,255,0.35)]">  ✓</span>
        </>
      ),
    },
    {
      delay: 4.4,
      content: (
        <>
          <span className="font-semibold text-[#a78bfa]">[validate]</span>
          <span className="text-[var(--color-ink-muted)]"> TAXSIM:       </span>
          <span className="text-[var(--color-success)]">11/14 match</span>
          <span className="text-[rgba(255,255,255,0.35)]">  ✓</span>
        </>
      ),
    },
    {
      delay: 4.7,
      content: (
        <>
          <span className="font-semibold text-[#a78bfa]">[validate]</span>
          <span className="text-[var(--color-ink-muted)]"> LLM review:   </span>
          <span className="text-[var(--color-ink)] font-medium">
            2 issues flagged → auto-fixing
          </span>
        </>
      ),
    },
    { delay: 5.1, content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span> },
    {
      delay: 5.3,
      content: (
        <>
          <span className="font-semibold text-[var(--color-success)]">[done]</span>
          <span className="text-[var(--color-success)]"> 14 .rac files written to </span>
          <span className="text-[var(--color-ink)] font-medium">statute/26/32/</span>
        </>
      ),
    },
  ];

  return (
    <div className="mb-12 max-w-[760px] mx-auto" ref={ref}>
      <div className="bg-[#0c0c0c] rounded-md border border-[var(--color-rule)] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_40px_var(--color-accent-light)]">
        <div className="flex items-center gap-2 px-4 py-2 bg-[transparent] border-b border-[rgba(255,255,255,0.06)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="font-mono text-[0.7rem] text-[rgba(255,255,255,0.3)] ml-2">
            autorac — zsh
          </span>
        </div>
        <div className="px-5 py-4 font-mono text-[0.82rem] leading-[1.8] overflow-x-auto min-h-[320px]">
          {lines.map((line, i) => (
            <div
              key={i}
              className="whitespace-pre"
              style={
                visible
                  ? {
                      opacity: 0,
                      animation: `terminal-reveal 0.3s var(--ease-out) ${line.delay}s forwards`,
                    }
                  : { opacity: 0 }
              }
            >
              {line.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AutoracSection() {
  return (
    <section id="autorac" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="heading-section text-[var(--color-ink)] mb-6">
            AutoRAC
          </h2>
          <p className="font-body text-lg font-light text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Point it at a statute. Get validated RAC.
          </p>
        </div>

        <AutoRACTransform />

        <AutoRACTerminal />

        {/* 3-tier validation pipeline */}
        <div className="mt-12 mb-12">
          <h3 className="font-body text-2xl text-[var(--color-ink)] text-center mb-8">
            3-tier validation pipeline
          </h3>

          <div className="flex flex-col gap-4 max-w-[700px] mx-auto">
            {/* Tier 1 */}
            <div className="flex gap-4 p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-lg">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white font-mono text-base font-semibold rounded-full shrink-0">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-body text-[1.1rem] text-[var(--color-ink)] mb-2">
                  CI validation
                </h4>
                <p className="font-body text-[0.9rem] text-[var(--color-ink-secondary)] mb-2">
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[var(--color-accent-light)] rounded text-[var(--color-accent)]">
                    rac pytest
                  </code>{" "}
                  &mdash; instant, free
                </p>
                <p className="font-body text-[0.85rem] text-[var(--color-ink-muted)]">
                  Catches syntax errors, format issues, missing imports
                </p>
                <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-[var(--color-rule)]">
                  <span className="flex items-center gap-2 font-mono text-[0.8rem] text-[#ff6b6b]">
                    <XIcon className="w-3.5 h-3.5" /> Fail - Fix errors, retry (max 3)
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[0.8rem] text-[var(--color-success)]">
                    <CheckIcon className="w-3.5 h-3.5" /> Pass - Proceed to oracles
                  </span>
                </div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-gradient-to-b from-[var(--color-rule)] to-[var(--color-accent)] mx-auto" />

            {/* Tier 2 */}
            <div className="flex gap-4 p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-lg">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white font-mono text-base font-semibold rounded-full shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-body text-[1.1rem] text-[var(--color-ink)] mb-2">
                  External oracles
                </h4>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-1 bg-[rgba(26, 122, 109, 0.1)] rounded font-mono text-[0.75rem] font-semibold text-[var(--color-accent)]">
                    PE
                  </span>
                  <span className="font-body text-[0.9rem] text-[var(--color-ink-secondary)]">
                    PolicyEngine
                  </span>
                  <span className="px-2 py-1 bg-[rgba(26, 122, 109, 0.1)] rounded font-mono text-[0.75rem] font-semibold text-[var(--color-accent)]">
                    TX
                  </span>
                  <span className="font-body text-[0.9rem] text-[var(--color-ink-secondary)]">
                    TAXSIM
                  </span>
                </div>
                <p className="font-body text-[0.85rem] text-[var(--color-ink-muted)]">
                  Fast (~10s), free &mdash; generates comparison data for LLM reviewers
                </p>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-gradient-to-b from-[var(--color-rule)] to-[var(--color-accent)] mx-auto" />

            {/* Tier 3 */}
            <div className="flex gap-4 p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-lg">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white font-mono text-base font-semibold rounded-full shrink-0">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-body text-[1.1rem] text-[var(--color-ink)] mb-2">
                  LLM reviewers
                </h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["RAC Reviewer", "Formula Reviewer", "Parameter Reviewer", "Integration Reviewer"].map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-[var(--color-code-bg)] border border-[var(--color-rule)] rounded font-mono text-[0.75rem] text-[var(--color-code-text)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="font-body text-[0.85rem] text-[var(--color-ink-muted)]">
                  Receive oracle comparison data to diagnose WHY discrepancies exist
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-8 flex-wrap max-md:flex-col max-md:items-center max-md:gap-3">
          {[
            "14 subsections \u2192 14 parallel agents \u2192 14 .rac files",
            "Each agent sees only its subsection \u2014 no wasted context",
            "Validated against real-world calculators, not just syntax",
            "Every encoding decision logged for audit",
          ].map((text) => (
            <div
              key={text}
              className="flex items-center gap-2 font-body text-[0.9rem] text-[var(--color-ink-secondary)]"
            >
              <CheckIcon className="w-4 h-4 text-[var(--color-success)]" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/autorac" className="btn-outline">
            Open the system map
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
