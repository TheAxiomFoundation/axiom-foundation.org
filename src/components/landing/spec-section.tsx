"use client";

import { useState } from "react";
import CodeBlock from "@/components/code-block";
import { specContent } from "@/lib/rulespec-examples";

export function SpecSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="spec" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="heading-section mb-6">
            RULESPEC_SPEC.md
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Complete specification for the RuleSpec file format
          </p>
        </div>

        <div className="bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 bg-[var(--color-accent-light)] border-b border-[var(--color-rule)]">
            <span className="font-mono text-base font-semibold text-[var(--color-accent)]">
              RULESPEC_SPEC.md
            </span>
            <button
              className="px-4 py-2 bg-transparent border border-[var(--color-rule)] rounded-sm font-body text-[0.85rem] text-[var(--color-ink-secondary)] cursor-pointer transition-all duration-150 hover:bg-[var(--color-accent-light)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
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
              language="rulespec"
              className="m-0 p-5 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap border-0 rounded-none bg-transparent"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
