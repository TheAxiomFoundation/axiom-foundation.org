"use client";

import { useState, useEffect } from "react";
import { ArrowRightIcon } from "@/components/icons";
import CodeBlock from "@/components/code-block";
import { heroRuleSpecCode } from "@/lib/rulespec-examples";

function HeroTransform() {
  const [showRuleSpec, setShowRuleSpec] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setShowRuleSpec((v) => !v);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleClick = () => {
    setIsPaused(true);
    setShowRuleSpec((v) => !v);
  };

  const statuteText = `(a) Allowance of credit.\u2014 There shall be allowed as a credit against the tax imposed by this chapter for the taxable year an amount equal to the sum of $2,000 multiplied by the number of qualifying children of the taxpayer.`;

  return (
    <div
      className="max-w-[520px] mx-auto cursor-pointer select-none"
      onClick={handleClick}
      title="Click to toggle"
    >
      <div className="border border-[#2a2826] rounded-md overflow-hidden">
        {/* Tab bar */}
        <div className="gradient-fill flex border-b border-[#2a2826]">
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors duration-300 ${
              !showRuleSpec
                ? "text-white border-b-2 border-white -mb-px"
                : "text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)]"
            }`}
            style={{ fontFamily: "var(--f-serif)" }}
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(true);
              setShowRuleSpec(false);
            }}
          >
            26 USC &sect; 24(a)
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-xs transition-colors duration-300 ${
              showRuleSpec
                ? "text-white border-b-2 border-white -mb-px"
                : "text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(true);
              setShowRuleSpec(true);
            }}
          >
            statute/26/24/a.yaml
          </button>
        </div>

        {/* Content area — fixed height with crossfade */}
        <div className="relative min-h-[250px]">
          {/* Statute view — serif font on gradient bg */}
          <div
            className={`gradient-fill absolute inset-0 p-6 text-[0.95rem] text-[var(--color-code-text)] leading-[1.8] transition-opacity duration-2000 ${
              !showRuleSpec ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {statuteText}
          </div>

          {/* RuleSpec view — solid black bg */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-2000 ${
              showRuleSpec ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <CodeBlock
              code={heroRuleSpecCode}
              language="rulespec"
              className="p-6 font-mono text-[0.85rem] leading-relaxed whitespace-pre-wrap m-0 h-full"
            />
          </div>
        </div>
      </div>

      {/* Subtle hint */}
      <p className="text-center mt-3 font-mono text-[0.65rem] text-[var(--color-ink-muted)] tracking-wide uppercase">
        Same law, two representations
      </p>
    </div>
  );
}

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative z-1 min-h-screen flex items-center justify-center py-24 px-8">
      <div
        className={`max-w-[1100px] transition-all duration-800 ${
          mounted
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <div className="text-center mb-14">
          <h1 className="heading-page mb-6">
            The world&apos;s rules, encoded
          </h1>

          <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-[540px] mx-auto">
            Axiom Foundation is the nonprofit home of The Axiom Project. We build
            open, machine-readable encodings of statutes, regulations, and policy
            rules, with Axiom Labs prototyping the applied layer on top.
          </p>
        </div>

        <HeroTransform />

        <div className="flex gap-6 justify-center mt-14 flex-wrap">
          <a href="/atlas" className="btn-primary">
            Explore the atlas
            <ArrowRightIcon className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
