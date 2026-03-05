"use client";

import { useState, useEffect } from "react";
import { ArrowRightIcon, GitHubIcon } from "@/components/icons";

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative z-1 min-h-screen flex items-center justify-center py-32 px-8">
      <div
        className={`max-w-[900px] text-center transition-all duration-800 ${
          mounted
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <h1 className="heading-page text-[var(--color-text)] mb-8">
          Encoding the{" "}
          <span className="text-[var(--color-precision)]">
            world&apos;s rules
          </span>
        </h1>

        <p className="font-[family-name:var(--f-body)] text-xl font-light text-[var(--color-text-secondary)] leading-relaxed max-w-[600px] mx-auto mb-12">
          Rule Atlas builds open, machine-readable encodings of
          statutes, regulations, and policy rules. Ground truth for AI systems.
          Verifiable by design.
        </p>

        <div className="flex gap-6 justify-center mb-16 flex-wrap">
          <a href="/atlas" className="btn-primary">
            Explore Atlas
            <ArrowRightIcon className="w-5 h-5" />
          </a>
          <a href="https://github.com/RuleAtlas" className="btn-outline">
            <GitHubIcon className="w-5 h-5" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
