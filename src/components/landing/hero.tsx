"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { axiomAppHref } from "@/lib/urls";

export function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative z-1 min-h-screen flex flex-col justify-center pt-32 pb-32 px-8">
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
            Statutes, regulations, and policy rules turned into machine-readable
            encodings &mdash;{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              cited, time-aware, executable
            </span>{" "}
            &mdash; so anyone can run, audit, or reform them.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href={axiomAppHref()} className="btn-primary">
              Open Axiom
              <ArrowRightIcon className="w-5 h-5" />
            </a>
            <a href="#gap" className="btn-outline">
              Why this exists
            </a>
          </div>
        </div>
      </div>

    </section>
  );
}
