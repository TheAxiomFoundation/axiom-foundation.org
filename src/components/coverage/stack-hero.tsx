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
  const perDocument =
    data.totals.documents > 0
      ? Math.round(data.totals.provisions / data.totals.documents)
      : 0;
  const topEncoded = [...data.jurisdictions].sort(
    (a, b) => b.encodingFileCount - a.encodingFileCount
  )[0];

  const Num = ({ value }: { value: number }) => (
    <span className="pstack-num">{n(value)}</span>
  );

  // Who is covered — a far better fact than a document-type
  // histogram (which the flat state manuals dominate). Computed
  // live from the corpus jurisdictions.
  const corpus = data.jurisdictions.filter((j) => j.provisionCount > 0);
  const hasFederal = corpus.some((j) => j.slug === "us");
  const hasDC = corpus.some((j) => j.slug === "us-dc");
  const stateCount = corpus.filter(
    (j) => j.slug.startsWith("us-") && j.slug !== "us-dc"
  ).length;
  const otherNations = corpus
    .filter((j) => j.slug !== "us" && !j.slug.startsWith("us-"))
    .map((j) => j.label)
    .slice(0, 3);

  const whoParts: React.ReactNode[] = [
    hasFederal ? "US federal" : null,
    stateCount > 0 ? (
      <span key="states">
        <Num value={stateCount} /> states{hasDC ? " & DC" : ""}
      </span>
    ) : null,
    ...otherNations,
  ].filter(Boolean);

  const layers: Array<{
    key: string;
    name: string;
    value: number;
    facts: React.ReactNode;
    detail: React.ReactNode;
  }> = [
    {
      key: "documents",
      name: "Source documents",
      value: data.totals.documents,
      facts: (
        <>
          <Num value={corpusJurisdictions} /> jurisdiction
          {corpusJurisdictions === 1 ? "" : "s"} —{" "}
          {whoParts.map((part, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {part}
            </span>
          ))}
        </>
      ),
      detail:
        "Statutes, regulations, and agency guidance — from U.S. Code titles and CFR parts to state benefit manuals.",
    },
    {
      key: "provisions",
      name: "Provisions",
      value: data.totals.provisions,
      facts:
        perDocument > 0 ? (
          <>
            ≈ <Num value={perDocument} /> per document
          </>
        ) : null,
      detail:
        "Every document, split into the atomic citable sections the reader, search, and citation graph all work on.",
    },
    {
      key: "encodings",
      name: "RuleSpec encodings",
      value: data.totals.encodingFiles,
      facts: (
        <>
          <Num value={encodedJurisdictions} /> jurisdiction
          {encodedJurisdictions === 1 ? "" : "s"} encoded
          {topEncoded && topEncoded.encodingFileCount > 0 && (
            <>
              {" "}
              · {topEncoded.label} leads with{" "}
              <Num value={topEncoded.encodingFileCount} />
            </>
          )}
        </>
      ),
      detail:
        "Machine-readable rules, each linked back to the exact provisions it encodes.",
    },
  ];

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
                  <span className="pstack-callout-value">{n(layer.value)}</span>
                  {layer.facts && (
                    <span className="pstack-callout-facts">{layer.facts}</span>
                  )}
                  <span className="pstack-callout-detail pstack-prose">
                    {layer.detail}
                  </span>
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
