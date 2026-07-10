"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";

export function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative z-1 min-h-[calc(100vh-120px)] flex flex-col justify-center pt-16 pb-32 px-8">
      <div
        className={`w-full max-w-[1280px] mx-auto transition-all duration-800 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        {/* Copy anchored left; right half is intentionally empty so
            the 3D graph in the background (projected right-of-centre)
            reads as the hero's visual counterpart. */}
        <div className="max-w-[560px]">
          <h1 className="text-balance font-display text-[clamp(2.5rem,5.6vw,4.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]">
            Computable law{" "}
            <span className="text-gradient">for all.</span>
          </h1>

          <p className="mt-7 text-pretty font-body text-lg leading-relaxed text-[var(--color-ink-secondary)]">
            Open, machine-readable encodings of the world&apos;s rules &mdash;
            starting with tax and benefit policy.{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              Cited, time-aware, and executable
            </span>
            , so anyone can run, audit, or reform them.
          </p>

          {/* Registration lives in the announcement card above — the hero
              pulls readers into the story instead of repeating the CTA. */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="#gap" className="btn-primary">
              Why this exists
              <ArrowRightIcon className="w-5 h-5" />
            </a>
            <a href="#encoder" className="btn-outline">
              See the encoder run
            </a>
          </div>
        </div>
      </div>

    </section>
  );
}
