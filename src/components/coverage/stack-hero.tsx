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

  // Document-type mix for the mini bar — same segment language and
  // validated hues as the jurisdiction cards below.
  const statuteDocs =
    data.docTypeTotals.find((t) => t.type === "statute")?.count ?? 0;
  const regulationDocs =
    data.docTypeTotals.find((t) => t.type === "regulation")?.count ?? 0;
  const otherDocs = Math.max(
    0,
    data.totals.documents - statuteDocs - regulationDocs
  );
  const docMix = [
    { key: "statute", count: statuteDocs, hue: "#C75B50" },
    { key: "regulation", count: regulationDocs, hue: "#7C83E0" },
    { key: "other", count: otherDocs, hue: "#2E9E85" },
  ].filter((segment) => segment.count > 0);

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
          {corpusJurisdictions === 1 ? "" : "s"} ·{" "}
          <Num value={data.docTypeTotals.length} /> document type
          {data.docTypeTotals.length === 1 ? "" : "s"}
        </>
      ),
      detail: (
        <>
          {topTypes.map(({ type, count }, i) => (
            <span key={type}>
              {i > 0 && " · "}
              <Num value={count} /> {docTypeLabel(type)}
            </span>
          ))}
        </>
      ),
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
                  {layer.key === "documents" && docMix.length > 0 && (
                    <span className="pstack-mix" aria-hidden>
                      {docMix.map((segment) => (
                        <span
                          key={segment.key}
                          style={{
                            flexGrow: segment.count,
                            background: segment.hue,
                          }}
                        />
                      ))}
                    </span>
                  )}
                  <span
                    className={
                      layer.key === "documents"
                        ? "pstack-callout-detail"
                        : "pstack-callout-detail pstack-prose"
                    }
                  >
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
