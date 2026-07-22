"use client";

import { useEffect, useRef, useState } from "react";
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

const DOC_TYPE_LABELS: Record<string, string> = {
  statute: "statutes",
  regulation: "regulations",
  policy: "policy docs",
  guidance: "guidance docs",
  manual: "manuals",
  form: "forms",
  "district-plan": "district plans",
};

function docTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type.replace(/-/g, " ");
}

/** How far through the tall section each layer joins the stack. */
const STEP_THRESHOLDS = [0.28, 0.6];

export function StackHero({ data }: { data: CoverageData }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [live, setLive] = useState(false);
  const [step, setStep] = useState(3);

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

  const corpusJurisdictions = data.jurisdictions.filter(
    (j) => j.provisionCount > 0
  ).length;
  const encodedJurisdictions = data.jurisdictions.filter(
    (j) => j.encodingFileCount > 0
  ).length;
  const topTypes = data.docTypeTotals.slice(0, 3);

  const layers = [
    {
      key: "documents",
      name: "Source documents",
      value: data.totals.documents,
      breadth: `${corpusJurisdictions} jurisdictions · ${data.docTypeTotals.length} document types`,
      detail: topTypes
        .map(({ type, count }) => `${n(count)} ${docTypeLabel(type)}`)
        .join(" · "),
    },
    {
      key: "provisions",
      name: "Provisions",
      value: data.totals.provisions,
      breadth: "every document, split into atomic citable sections",
      detail: "the unit the reader, search, and citation graph work on",
    },
    {
      key: "encodings",
      name: "RuleSpec encodings",
      value: data.totals.encodingFiles,
      breadth: `${encodedJurisdictions} jurisdictions encoded so far`,
      detail: "machine-readable rules, linked back to their source provisions",
    },
  ] as const;

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
                <span
                  className={`pstack-key pstack-key-${layer.key}`}
                  aria-hidden
                />
                <div className="pstack-callout-body">
                  <span className="pstack-callout-name">{layer.name}</span>
                  <span className="pstack-callout-value">
                    {n(layer.value)}
                    <span className="pstack-callout-breadth">
                      {" "}
                      {layer.breadth}
                    </span>
                  </span>
                  <span className="pstack-callout-detail">{layer.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        {live && (
          <p
            className="pscroll-hint"
            aria-hidden
            data-done={step >= 3 || undefined}
          >
            scroll to assemble the stack ↓
          </p>
        )}
      </div>
    </section>
  );
}
