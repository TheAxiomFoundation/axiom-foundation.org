"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { axiomAppHref } from "@/lib/urls";
import { Reveal, RevealGroup, RevealItem } from "./reveal";

interface TerminalLine {
  content: React.ReactNode;
  delay: number;
}

const LINES: TerminalLine[] = [
  {
    delay: 0,
    content: (
      <>
        <span className="text-[#86efac]">$ </span>
        <span className="text-[#fafaf9] font-medium">
          axiom encode &quot;26 USC 32&quot;
        </span>
      </>
    ),
  },
  {
    delay: 0.4,
    content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span>,
  },
  {
    delay: 0.6,
    content: (
      <>
        <span className="font-semibold text-[#fbbf24]">[axiom]</span>
        <span className="text-[#a8a29e]">
          {" "}Loading 26 USC 32...
        </span>
        <span className="text-[#fafaf9] font-medium">
          {" "}81,247 characters
        </span>
      </>
    ),
  },
  {
    delay: 0.9,
    content: (
      <>
        <span className="font-semibold text-[#fbbf24]">[axiom]</span>
        <span className="text-[#a8a29e]">
          {" "}14 subsections extracted
        </span>
      </>
    ),
  },
  {
    delay: 1.2,
    content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span>,
  },
  {
    delay: 1.4,
    content: (
      <>
        <span className="font-semibold text-[#fdba74]">[encode]</span>
        <span className="text-[#a8a29e]">
          {" "}Wave 1: (a) (b) (c) (d) (f) (h) (i) (j) (m) (n)
        </span>
      </>
    ),
  },
  {
    delay: 1.7,
    content: (
      <>
        <span className="font-semibold text-[#fdba74]">[encode]</span>
        <span className="text-[#a8a29e]">
          {" "}Wave 2: (e) (g) (k) (l)
        </span>
        <span className="text-[rgba(255,255,255,0.35)]">
          {" "}&mdash; depends on wave 1
        </span>
      </>
    ),
  },
  {
    delay: 2.1,
    content: (
      <>
        <span className="font-semibold text-[#fdba74]">[encode]</span>
        <span className="inline-block text-[#fdba74]">
          {" "}████████████████████
        </span>
        <span className="text-[#fafaf9] font-medium">
          {" "}14/14 complete
        </span>
      </>
    ),
  },
  {
    delay: 2.5,
    content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span>,
  },
  {
    delay: 2.7,
    content: (
      <>
        <span className="font-semibold text-[#a78bfa]">[validate]</span>
        <span className="text-[#a8a29e]"> CI:           </span>
        <span className="text-[#86efac]">14/14 passed</span>
      </>
    ),
  },
  {
    delay: 3.0,
    content: (
      <>
        <span className="font-semibold text-[#a78bfa]">[validate]</span>
        <span className="text-[#a8a29e]"> PolicyEngine: </span>
        <span className="text-[#86efac]">14/14 match</span>
      </>
    ),
  },
  {
    delay: 3.3,
    content: (
      <>
        <span className="font-semibold text-[#a78bfa]">[validate]</span>
        <span className="text-[#a8a29e]"> TAXSIM:       </span>
        <span className="text-[#86efac]">14/14 match</span>
      </>
    ),
  },
  {
    delay: 3.6,
    content: <span className="text-[rgba(255,255,255,0.35)]">&nbsp;</span>,
  },
  {
    delay: 3.8,
    content: (
      <>
        <span className="font-semibold text-[#86efac]">[done]</span>
        <span className="text-[#86efac]">
          {" "}14 RuleSpec files written to{" "}
        </span>
        <span className="text-[#fafaf9] font-medium">
          rulespec-us/statutes/26/32/*.yaml
        </span>
      </>
    ),
  },
];

function Terminal() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-[760px] mx-auto" ref={ref}>
      <div className="bg-[#0c0c0c] rounded-md border border-[var(--color-rule)] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_40px_var(--color-accent-light)]">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(255,255,255,0.06)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="font-mono text-[0.7rem] text-[rgba(255,255,255,0.3)] ml-2">
            axiom &mdash; zsh
          </span>
        </div>
        <div className="px-5 py-4 font-mono text-[0.82rem] leading-[1.8] overflow-x-auto min-h-[320px]">
          {LINES.map((line, i) => (
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

export function EncoderSection() {
  return (
    <section
      id="encoder"
      className="section-tint-cream relative z-1 py-32 px-8"
    >
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="text-center mb-16">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            III &middot; The encoder
          </span>
          <h2 className="heading-section mb-6 mt-2">
            Statutes, encoded automatically. Verified before they ship.
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[640px] mx-auto leading-relaxed">
            An AI-driven pipeline reads a statute, encodes it section by
            section, and runs the result against oracles like PolicyEngine
            and TAXSIM before any human signs off.
          </p>
        </Reveal>

        <Terminal />

        <RevealGroup
          className="mt-20 grid gap-6 md:grid-cols-3 max-w-[960px] mx-auto"
          staggerChildren={0.1}
        >
          {[
            {
              n: "01",
              label: "Read",
              body:
                "Pull the statute. Walk the subsection tree. Plan the dependency graph between siblings.",
            },
            {
              n: "02",
              label: "Encode",
              body:
                "An agent per subsection drafts the encoding, citing the section it came from. The pipeline logs every conflict and retry.",
            },
            {
              n: "03",
              label: "Verify",
              body:
                "Continuous Integration checks, comparison against independent oracles, reviewer agents that explain any discrepancy.",
            },
          ].map((step) => (
            <RevealItem
              key={step.n}
              className="card-edition p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex items-baseline justify-between mb-4">
                <span className="serial">Step {step.n}</span>
                <span className="serif-italic text-[1rem] text-[var(--color-ink-muted)]">
                  {step.label.toLowerCase()}
                </span>
              </div>
              <h3 className="font-body text-base font-medium text-[var(--color-ink)] mb-2">
                {step.label}
              </h3>
              <p className="font-body text-[0.88rem] text-[var(--color-ink-secondary)] leading-relaxed m-0">
                {step.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal
          as="p"
          className="mt-14 text-center font-body text-[0.95rem] text-[var(--color-ink-muted)] max-w-[640px] mx-auto leading-relaxed"
        >
          The encoder logs every decision.{" "}
          <span className="serif-italic text-[var(--color-ink-secondary)]">
            Disagreements get explained, not erased.
          </span>
        </Reveal>

        <Reveal className="mt-8 text-center">
          <a
            href={axiomAppHref()}
            className="inline-flex items-center gap-2 font-mono text-[0.75rem] tracking-[0.12em] uppercase text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
          >
            Explore the encodings
            <ArrowRightIcon className="w-4 h-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
