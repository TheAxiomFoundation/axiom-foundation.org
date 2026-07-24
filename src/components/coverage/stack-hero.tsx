"use client";

import { useEffect, useRef, useState } from "react";
import { RollingNumber } from "@/components/coverage/rolling-number";
import { STACK_LAYERS } from "@/components/coverage/copy";
import type { CoverageData } from "@/lib/axiom/coverage-page";

/**
 * The coverage hero: Axiom's holdings as a platform stack — three
 * isometric layers descending from raw source documents through
 * atomic provisions to machine-readable RuleSpec encodings.
 *
 * On desktop this is a scrollytelling section: the stage is sticky
 * and the layers assemble one by one as the reader scrolls, each
 * bringing its callout. data-step counts the visible layers (1–3).
 * The scroll driver only engages on wide viewports without
 * prefers-reduced-motion; otherwise (and without JS, and in the
 * server-rendered HTML) everything is visible and the section is
 * normal height — the finished diagram, not a broken story.
 */

const numberFormat = new Intl.NumberFormat("en-US");
const n = (value: number) => numberFormat.format(value);

/** How far through the tall section each layer joins the stack. */
const STEP_THRESHOLDS = [0.28, 0.6];

/** Longest odometer settle: delay + per-digit stagger + strip transition. */
const SETTLE_MS = 1900;

export function StackHero({ data }: { data: CoverageData }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [live, setLive] = useState(false);
  const [step, setStep] = useState(3);
  const [counting, setCounting] = useState(true);

  // While any odometer is still rolling toward its figure, the hint
  // line reads "counting the corpus…" — the same line the loading
  // state shows, so the handoff is seamless — and only becomes the
  // scroll cue once the digits settle. Each step change starts a new
  // roll, so the window restarts with it.
  useEffect(() => {
    setCounting(true);
    const t = setTimeout(() => setCounting(false), SETTLE_MS);
    return () => clearTimeout(t);
  }, [live, step]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof window.matchMedia !== "function") return;
    const wide = window.matchMedia("(min-width: 901px)");
    const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!wide.matches || noMotion.matches) return;

    setLive(true);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const p =
          total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
        setStep(p < STEP_THRESHOLDS[0] ? 1 : p < STEP_THRESHOLDS[1] ? 2 : 3);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const values: Record<(typeof STACK_LAYERS)[number]["key"], number> = {
    documents: data.totals.documents,
    provisions: data.totals.provisions,
    encodings: data.totals.encodingFiles,
  };
  const layers = STACK_LAYERS.map((layer) => ({
    ...layer,
    value: values[layer.key],
  }));

  return (
    <section
      ref={sectionRef}
      className={live ? "pscroll pscroll-live" : "pscroll"}
      data-step={step}
      aria-label="The stack"
    >
      <div className="pscroll-sticky">
        <div className="pstack">
          <div className="pstack-visual" aria-hidden>
            {layers.map((layer, i) => (
              <div key={layer.key} className="pstack-slot">
                <div
                  className={`pstack-plane pstack-plane-${layer.key}`}
                  style={{ "--layer": i } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
          <ol className="pstack-callouts">
            {layers.map((layer, i) => (
              <li
                key={layer.key}
                className="pstack-callout"
                data-layer={layer.key}
                style={{ "--layer": i } as React.CSSProperties}
              >
                <div className="pstack-callout-body">
                  <span className="pstack-callout-name">
                    <span className="pstack-ordinal" aria-hidden>
                      0{i + 1}
                    </span>
                    {layer.name}
                  </span>
                  <span className="pstack-callout-value">
                    {/* Rolls up from zero when this layer assembles. */}
                    <RollingNumber
                      text={n(layer.value)}
                      active={!live || step > i}
                      delayMs={140}
                    />
                  </span>
                  <span className="pstack-callout-detail pstack-prose">
                    {layer.detail}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        {/* Rendered in server HTML too (visibility is CSS-gated to
            scrolly mode) so the loading state's "counting…" line
            hands off to this without a blink. */}
        <p
          className={
            counting
              ? "pscroll-hint pscroll-hint-scroll cov-counting"
              : "pscroll-hint pscroll-hint-scroll"
          }
          aria-hidden
          data-done={(live && step >= 3) || undefined}
        >
          {counting ? "counting the corpus" : <>scroll to assemble the stack ↓</>}
        </p>
      </div>
    </section>
  );
}
