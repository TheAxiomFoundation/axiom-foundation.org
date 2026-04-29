"use client";

import { useEffect, useRef, useState } from "react";

interface TerminalLine {
  content: React.ReactNode;
  delay: number;
}

const LINES: TerminalLine[] = [
  {
    delay: 0,
    content: (
      <>
        <span className="text-[var(--color-success)]">$ </span>
        <span className="text-[var(--color-ink)] font-medium">
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
        <span className="font-semibold text-[var(--color-warning)]">[axiom]</span>
        <span className="text-[var(--color-ink-muted)]">
          {" "}Loading 26 USC 32...
        </span>
        <span className="text-[var(--color-ink)] font-medium">
          {" "}81,247 characters
        </span>
      </>
    ),
  },
  {
    delay: 0.9,
    content: (
      <>
        <span className="font-semibold text-[var(--color-warning)]">[axiom]</span>
        <span className="text-[var(--color-ink-muted)]">
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
        <span className="font-semibold text-[var(--color-accent)]">[encode]</span>
        <span className="text-[var(--color-ink-muted)]">
          {" "}Wave 1: (a) (b) (c) (d) (f) (h) (i) (j) (m) (n)
        </span>
      </>
    ),
  },
  {
    delay: 1.7,
    content: (
      <>
        <span className="font-semibold text-[var(--color-accent)]">[encode]</span>
        <span className="text-[var(--color-ink-muted)]">
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
        <span className="font-semibold text-[var(--color-accent)]">[encode]</span>
        <span className="inline-block text-[var(--color-accent)]">
          {" "}████████████████████
        </span>
        <span className="text-[var(--color-ink)] font-medium">
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
        <span className="text-[var(--color-ink-muted)]"> CI:           </span>
        <span className="text-[var(--color-success)]">14/14 passed</span>
      </>
    ),
  },
  {
    delay: 3.0,
    content: (
      <>
        <span className="font-semibold text-[#a78bfa]">[validate]</span>
        <span className="text-[var(--color-ink-muted)]"> PolicyEngine: </span>
        <span className="text-[var(--color-success)]">12/14 match</span>
      </>
    ),
  },
  {
    delay: 3.3,
    content: (
      <>
        <span className="font-semibold text-[#a78bfa]">[validate]</span>
        <span className="text-[var(--color-ink-muted)]"> TAXSIM:       </span>
        <span className="text-[var(--color-success)]">11/14 match</span>
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
        <span className="font-semibold text-[var(--color-success)]">[done]</span>
        <span className="text-[var(--color-success)]">
          {" "}14 RuleSpec files written to{" "}
        </span>
        <span className="text-[var(--color-ink)] font-medium">
          us/statute/26/32/*.rulespec
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
    <section id="encoder" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            III &middot; The encoder
          </span>
          <h2 className="heading-section mb-6 mt-2">
            Statutes, encoded automatically. Verified before they ship.
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[640px] mx-auto leading-relaxed">
            An AI-driven pipeline reads a statute, encodes it section by
            section, and runs the result against{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              PolicyEngine and TAXSIM
            </span>{" "}
            before any human signs off.
          </p>
        </div>

        <Terminal />

        <div className="mt-20 grid gap-6 md:grid-cols-3 max-w-[960px] mx-auto">
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
                "An agent per subsection drafts the encoding, citing the section it came from. Conflicts and re-tries are logged.",
            },
            {
              n: "03",
              label: "Verify",
              body:
                "CI checks, oracle comparison against PolicyEngine and TAXSIM, reviewer agents that explain any discrepancy.",
            },
          ].map((step) => (
            <div key={step.n} className="card-edition p-6">
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
            </div>
          ))}
        </div>

        <p className="mt-14 text-center font-body text-[0.95rem] text-[var(--color-ink-muted)] max-w-[640px] mx-auto leading-relaxed">
          Every encoding decision is logged.{" "}
          <span className="serif-italic text-[var(--color-ink-secondary)]">
            Disagreements get explained, not erased.
          </span>
        </p>
      </div>
    </section>
  );
}
