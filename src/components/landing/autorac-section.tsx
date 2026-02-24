"use client";

import { useState, useEffect, useRef } from "react";
import { CheckIcon, XIcon } from "@/components/icons";

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
          <span className="text-[var(--color-text)] font-medium">
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
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[var(--color-text-muted)]"> Loading 26 USC 32...</span>
          <span className="text-[var(--color-text)] font-medium"> 81,247 characters</span>
        </>
      ),
    },
    {
      delay: 0.9,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[var(--color-text-muted)]"> Parsing subsection tree...</span>
        </>
      ),
    },
    {
      delay: 1.2,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (a) Allowance of credit </span>
          <span className="text-[var(--color-text-muted)]">           2,341 chars</span>
        </>
      ),
    },
    {
      delay: 1.35,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (b) Percentages and amounts </span>
          <span className="text-[var(--color-text-muted)]">       4,892 chars</span>
        </>
      ),
    },
    {
      delay: 1.5,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (c) Definitions and special rules </span>
          <span className="text-[var(--color-text-muted)]"> 5,675 chars</span>
        </>
      ),
    },
    {
      delay: 1.65,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   ...</span>
        </>
      ),
    },
    {
      delay: 1.8,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[rgba(255,255,255,0.35)]">   (n) Supplemental child credit </span>
          <span className="text-[var(--color-text-muted)]">     1,203 chars</span>
        </>
      ),
    },
    {
      delay: 2.0,
      content: (
        <>
          <span className="font-semibold text-[var(--color-warmth)]">[atlas]</span>
          <span className="text-[var(--color-text)] font-medium"> 14 subsections extracted</span>
        </>
      ),
    },
    { delay: 2.3, content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span> },
    {
      delay: 2.5,
      content: (
        <>
          <span className="font-semibold text-[var(--color-precision)]">[encode]</span>
          <span className="text-[var(--color-text-muted)]"> Wave 1: </span>
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
          <span className="font-semibold text-[var(--color-precision)]">[encode]</span>
          <span className="text-[var(--color-text-muted)]"> Wave 2: </span>
          <span className="text-[rgba(255,255,255,0.35)]">(e), (g), (k), (l)</span>
          <span className="text-[var(--color-text-muted)]"> &mdash; depends on wave 1</span>
        </>
      ),
    },
    {
      delay: 3.2,
      content: (
        <>
          <span className="font-semibold text-[var(--color-precision)]">[encode]</span>
          <span className="inline-block text-[var(--color-precision)]">
            {" "}
            ████████████████████
          </span>
          <span className="text-[var(--color-text)] font-medium"> 14/14 complete</span>
        </>
      ),
    },
    { delay: 3.6, content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span> },
    {
      delay: 3.8,
      content: (
        <>
          <span className="font-semibold text-[#a78bfa]">[validate]</span>
          <span className="text-[var(--color-text-muted)]"> CI:           </span>
          <span className="text-[var(--color-success)]">14/14 passed</span>
        </>
      ),
    },
    {
      delay: 4.1,
      content: (
        <>
          <span className="font-semibold text-[#a78bfa]">[validate]</span>
          <span className="text-[var(--color-text-muted)]"> PolicyEngine: </span>
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
          <span className="text-[var(--color-text-muted)]"> TAXSIM:       </span>
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
          <span className="text-[var(--color-text-muted)]"> LLM review:   </span>
          <span className="text-[var(--color-text)] font-medium">
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
          <span className="text-[var(--color-text)] font-medium">statute/26/32/</span>
        </>
      ),
    },
  ];

  return (
    <div className="mb-12 max-w-[760px] mx-auto" ref={ref}>
      <div className="bg-[#0c0c0c] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_40px_rgba(59,130,246,0.08)]">
        <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.06)]">
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
          <span className="eyebrow block mb-4">AI encoding</span>
          <h2 className="heading-section text-[var(--color-text)] mb-6">
            AutoRAC
          </h2>
          <p className="text-lg font-light text-[var(--color-text-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Point it at a statute. Get validated RAC.
          </p>
        </div>

        <AutoRACTerminal />

        {/* 3-tier validation pipeline */}
        <div className="mt-12 mb-12">
          <h3 className="font-display text-2xl text-[var(--color-text)] text-center mb-8">
            3-tier validation pipeline
          </h3>

          <div className="flex flex-col gap-4 max-w-[700px] mx-auto">
            {/* Tier 1 */}
            <div className="flex gap-4 p-6 bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-precision)] text-white font-mono text-base font-semibold rounded-full shrink-0">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-display text-[1.1rem] text-[var(--color-text)] mb-2">
                  CI validation
                </h4>
                <p className="text-[0.9rem] text-[var(--color-text-secondary)] mb-2">
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[rgba(59,130,246,0.1)] rounded text-[var(--color-precision)]">
                    rac pytest
                  </code>{" "}
                  &mdash; instant, free
                </p>
                <p className="text-[0.85rem] text-[var(--color-text-muted)]">
                  Catches syntax errors, format issues, missing imports
                </p>
                <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                  <span className="flex items-center gap-2 font-mono text-[0.8rem] text-[#ff6b6b]">
                    <XIcon className="w-3.5 h-3.5" /> Fail - Fix errors, retry (max 3)
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[0.8rem] text-[var(--color-success)]">
                    <CheckIcon className="w-3.5 h-3.5" /> Pass - Proceed to oracles
                  </span>
                </div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-gradient-to-b from-[var(--color-border)] to-[var(--color-precision)] mx-auto" />

            {/* Tier 2 */}
            <div className="flex gap-4 p-6 bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-precision)] text-white font-mono text-base font-semibold rounded-full shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-display text-[1.1rem] text-[var(--color-text)] mb-2">
                  External oracles
                </h4>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-1 bg-[rgba(59,130,246,0.15)] rounded font-mono text-[0.75rem] font-semibold text-[var(--color-precision)]">
                    PE
                  </span>
                  <span className="text-[0.9rem] text-[var(--color-text-secondary)]">
                    PolicyEngine
                  </span>
                  <span className="px-2 py-1 bg-[rgba(59,130,246,0.15)] rounded font-mono text-[0.75rem] font-semibold text-[var(--color-precision)]">
                    TX
                  </span>
                  <span className="text-[0.9rem] text-[var(--color-text-secondary)]">
                    TAXSIM
                  </span>
                </div>
                <p className="text-[0.85rem] text-[var(--color-text-muted)]">
                  Fast (~10s), free &mdash; generates comparison data for LLM reviewers
                </p>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-gradient-to-b from-[var(--color-border)] to-[var(--color-precision)] mx-auto" />

            {/* Tier 3 */}
            <div className="flex gap-4 p-6 bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-precision)] text-white font-mono text-base font-semibold rounded-full shrink-0">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-display text-[1.1rem] text-[var(--color-text)] mb-2">
                  LLM reviewers
                </h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["RAC Reviewer", "Formula Reviewer", "Parameter Reviewer", "Integration Reviewer"].map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-[rgba(255,255,255,0.05)] border border-[var(--color-border-subtle)] rounded font-mono text-[0.75rem] text-[var(--color-text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-[0.85rem] text-[var(--color-text-muted)]">
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
              className="flex items-center gap-2 text-[0.9rem] text-[var(--color-text-secondary)]"
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
