"use client";

import { useState } from "react";
import CodeBlock from "@/components/code-block";
import { specContent } from "@/lib/rac-examples";

export function SpecSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="spec" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="eyebrow block mb-4">Reference</span>
          <h2 className="heading-section text-[var(--color-text)] mb-6">
            RAC_SPEC.md
          </h2>
          <p className="text-lg font-light text-[var(--color-text-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Complete specification for the .rac file format
          </p>
        </div>

        <div className="bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 bg-[rgba(59,130,246,0.05)] border-b border-[var(--color-border-subtle)]">
            <span className="font-mono text-base font-semibold text-[var(--color-precision)]">
              RAC_SPEC.md
            </span>
            <button
              className="px-4 py-2 bg-transparent border border-[var(--color-border)] rounded-md text-[0.85rem] text-[var(--color-text-secondary)] cursor-pointer transition-all duration-150 hover:bg-[rgba(59,130,246,0.1)] hover:border-[var(--color-precision)] hover:text-[var(--color-precision)]"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Collapse" : "Expand full spec"}
            </button>
          </div>

          <div
            className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
            style={{ maxHeight: expanded ? "2000px" : "400px" }}
          >
            <CodeBlock
              code={specContent}
              language="rac"
              className="m-0 p-5 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap border-0 rounded-none bg-transparent"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
