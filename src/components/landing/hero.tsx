"use client";

import { useState, useEffect } from "react";
import { ArrowRightIcon } from "@/components/icons";
import CodeBlock from "@/components/code-block";
import { heroRacCode } from "@/lib/rac-examples";

function HeroTransform() {
  const [showRac, setShowRac] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setShowRac((v) => !v);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleClick = () => {
    setIsPaused(true);
    setShowRac((v) => !v);
  };

  const statuteText = `(a) In general.\u2014 There is hereby imposed a tax equal to 3.8 percent of the lesser of net investment income or modified AGI in excess of the threshold amount.`;

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
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-xs transition-colors duration-300 ${
              !showRac
                ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-px bg-[rgba(180,83,9,0.06)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-code-text)]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(true);
              setShowRac(false);
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                !showRac ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-muted)]"
              }`}
            />
            26 USC &sect; 1411(a)
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-xs transition-colors duration-300 ${
              showRac
                ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-px bg-[rgba(180,83,9,0.06)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-code-text)]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(true);
              setShowRac(true);
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                showRac ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-muted)]"
              }`}
            />
            statute/26/1411/a.rac
          </button>
        </div>

        {/* Content area — fixed height with crossfade */}
        <div className="relative min-h-[280px]">
          {/* Statute view — serif font on gradient bg */}
          <div
            className={`gradient-fill absolute inset-0 p-6 text-[0.95rem] text-[var(--color-code-text)] leading-[1.8] transition-opacity duration-500 ${
              !showRac ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {statuteText}
          </div>

          {/* RAC view — solid black bg */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-500 ${
              showRac ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <CodeBlock
              code={heroRacCode}
              language="rac"
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
            The Axiom Foundation builds open, machine-readable encodings of
            statutes, regulations, and policy rules. Ground truth for AI systems.
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
