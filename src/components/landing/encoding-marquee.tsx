"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Continuously scrolling band of recently-encoded citations. Sits
 * between the hero and the gap section to add a "live system" texture
 * before the user reads the prose. The list is hand-curated rather
 * than fetched so the marquee paints instantly with no layout shift;
 * the citations all resolve in the corpus today.
 *
 * Doubles the list and animates a translate-x from 0 → -50%, which
 * gives a seamless loop. Pauses on hover so users can read a citation
 * mid-scroll, and respects ``prefers-reduced-motion`` (falls back to
 * a static row).
 */
const CITATIONS = [
  { code: "26 USC § 24", label: "Child Tax Credit" },
  { code: "26 USC § 32", label: "Earned Income Credit" },
  { code: "7 USC § 2017", label: "SNAP allotment" },
  { code: "26 USC § 1411", label: "Net Investment Income Tax" },
  { code: "42 USC § 1382", label: "Supplemental Security Income" },
  { code: "26 USC § 36B", label: "ACA Premium Tax Credit" },
  { code: "26 USC § 63", label: "Standard Deduction" },
  { code: "UKSI 2013/376 reg 22", label: "Universal Credit elements" },
  { code: "26 USC § 3101", label: "OASDI payroll tax" },
  { code: "26 USC § 401(k)", label: "Cash or deferred arrangements" },
  { code: "20 CFR § 416.1110", label: "SSI earned-income exclusion" },
];

export function EncodingMarquee() {
  const reduceMotion = useReducedMotion();
  const items = [...CITATIONS, ...CITATIONS];

  return (
    <section
      aria-label="Recently encoded citations"
      className="relative z-1 border-y border-[var(--color-rule)] bg-[var(--color-paper)] py-3 overflow-hidden"
    >
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--color-paper)] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--color-paper)] to-transparent z-10" />
        <motion.ul
          className="m-0 flex w-max list-none gap-10 p-0"
          animate={
            reduceMotion
              ? undefined
              : { x: ["0%", "-50%"] }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 96,
                  ease: "linear",
                  repeat: Infinity,
                }
          }
          whileHover={reduceMotion ? undefined : { animationPlayState: "paused" }}
          style={{ animationPlayState: "running" }}
        >
          {items.map((item, index) => (
            <li
              key={`${item.code}-${index}`}
              className="flex shrink-0 items-baseline gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]"
            >
              <span className="text-[var(--color-accent)]">{item.code}</span>
              <span
                aria-hidden
                className="text-[var(--color-rule-strong)]"
              >
                ·
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
