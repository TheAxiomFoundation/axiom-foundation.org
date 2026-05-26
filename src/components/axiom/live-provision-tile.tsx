"use client";

import CodeBlock from "@/components/code-block";
import { heroRuleSpecCode } from "@/lib/rulespec-examples";

/**
 * Right-hand hero peek — shows a real RuleSpec module so the landing
 * communicates what Axiom actually produces, not just that it has a
 * navigation tree. The example is the Child Tax Credit snippet that
 * already drives the site's hero animation (and ships in
 * ``src/lib/rulespec-examples.ts``), so the encoded view stays in
 * sync with the rest of the product surface and isn't a one-off mock.
 */
export function LiveProvisionTile() {
  return (
    <figure className="not-prose relative overflow-hidden rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.12)]">
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2 truncate">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            26 USC § 24
          </span>
          <span aria-hidden className="text-[var(--color-rule-strong)]">·</span>
          <span className="truncate font-body text-sm text-[var(--color-ink)]">
            Child Tax Credit
          </span>
        </div>
        <span className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          RuleSpec
        </span>
      </div>
      <div className="overflow-x-auto bg-[var(--color-code-bg)]">
        <CodeBlock
          code={heroRuleSpecCode}
          language="yaml"
          className="!m-0 !rounded-none !border-0 !bg-transparent !px-5 !py-4 !text-[12px] !leading-relaxed"
        />
      </div>
    </figure>
  );
}
