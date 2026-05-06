import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { axiomAppHref } from "@/lib/urls";

const LAYERS = [
  {
    n: "01",
    kicker: "Open API",
    title: "Open infrastructure for U.S. law",
    body:
      "Federal statutes, federal regulations, IRS guidance, and state tax law — fetched from official sources, addressable by citation, served with provenance and point-in-time metadata. One consistent shape across jurisdictions, free to use, openly licensed.",
    bullets: [
      "United States Code (federal statutes)",
      "Code of Federal Regulations",
      "IRS revenue procedures, rulings, and notices",
      "State codes and tax law",
    ],
    cta: { label: "Open Axiom", href: axiomAppHref(), external: true },
  },
  {
    n: "02",
    kicker: "Encodings",
    title: "Encoded so they can be computed",
    body:
      "The same rules turned into machine-readable form — every value cites a section, every clause is dated, formulas are executable. Compiles to native code; runs anywhere.",
    bullets: [
      "Cited — every value traces to a statute",
      "Time-aware — effective dates on every clause",
      "Composable — reform a parameter without rewriting",
      "Verified — cross-checked against PolicyEngine and TAXSIM",
    ],
    cta: { label: "Compare formats", href: "/format", external: false },
  },
];

const PTC_TIMELINE = [
  {
    period: "2014 – 2020",
    note: "Original ACA",
    rate: "2.0% – 9.5%",
    desc: "Sliding scale, 100–400% FPL",
  },
  {
    period: "2021 – 2025",
    note: "ARPA + IRA extension",
    rate: "0.0% – 8.5%",
    desc: "Suspended floor, no income cap",
    highlight: true,
  },
  {
    period: "2026 →",
    note: "Reverts",
    rate: "2.0% – 9.5%",
    desc: "Back to original schedule",
  },
];

export function EncodedLawSection() {
  return (
    <section id="encoded" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            II &middot; What we publish
          </span>
          <h2 className="heading-section mb-6 mt-2">
            Two layers, both in the open
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[680px] mx-auto leading-relaxed">
            Source documents anyone can fetch and cite, plus the encodings that
            make those rules{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              computable, time-aware, and verifiable
            </span>
            .
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-[1080px] mx-auto mb-28">
          {LAYERS.map((layer) => (
            <article key={layer.n} className="card-edition p-8 flex flex-col">
              <div className="flex items-baseline justify-between mb-5">
                <span className="font-mono text-[0.65rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)]">
                  {layer.kicker}
                </span>
              </div>
              <h3 className="font-display text-[1.4rem] font-light tracking-[0.02em] text-[var(--color-ink)] mb-4 leading-snug">
                {layer.title}
              </h3>
              <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed mb-5">
                {layer.body}
              </p>
              <ul className="space-y-1.5 mb-7 m-0 p-0 list-none font-mono text-[0.78rem] text-[var(--color-ink-muted)] tracking-[0.04em]">
                {layer.bullets.map((b) => (
                  <li key={b}>&middot; {b}</li>
                ))}
              </ul>
              {layer.cta.external ? (
                <a
                  href={layer.cta.href}
                  className="mt-auto inline-flex items-center gap-2 font-mono text-[0.78rem] tracking-[0.16em] uppercase text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
                >
                  {layer.cta.label}
                  <ArrowRightIcon className="w-4 h-4" />
                </a>
              ) : (
                <Link
                  href={layer.cta.href}
                  className="mt-auto inline-flex items-center gap-2 font-mono text-[0.78rem] tracking-[0.16em] uppercase text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
                >
                  {layer.cta.label}
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              )}
            </article>
          ))}
        </div>

        {/* Worked example */}
        <div className="max-w-[920px] mx-auto">
          <div className="text-center mb-10">
            <span className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)]">
              An encoding, in detail
            </span>
            <h3 className="font-display font-light text-[1.6rem] tracking-[0.04em] text-[var(--color-ink)] mt-3 mb-3">
              ACA Premium Tax Credit, three eras
            </h3>
            <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
              The same statute &mdash;{" "}
              <span className="font-mono text-[0.85rem] text-[var(--color-ink)]">
                26 USC &sect; 36B(b)(3)
              </span>{" "}
              &mdash; computes three different answers depending on when you
              ask.
            </p>
          </div>

          <div className="border border-[var(--color-rule)] rounded-md overflow-hidden bg-[var(--color-paper-elevated)]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr] font-mono text-[0.65rem] tracking-[0.18em] uppercase border-b border-[var(--color-rule)] bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
              <div className="px-5 py-3">Effective</div>
              <div className="px-5 py-3">Trigger</div>
              <div className="px-5 py-3">Rate band</div>
              <div className="px-5 py-3">Notes</div>
            </div>
            {PTC_TIMELINE.map((row) => (
              <div
                key={row.period}
                className={`grid grid-cols-[1.2fr_1fr_1fr_1.4fr] border-b border-[var(--color-rule-subtle)] last:border-b-0 transition-colors ${
                  row.highlight ? "bg-[var(--color-accent-light)]" : ""
                }`}
              >
                <div
                  className={`px-5 py-4 font-mono text-[0.85rem] tnum ${
                    row.highlight
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-ink)]"
                  }`}
                  style={{ fontFeatureSettings: '"tnum","lnum"' }}
                >
                  {row.period}
                </div>
                <div className="px-5 py-4 font-body text-[0.9rem] text-[var(--color-ink-secondary)]">
                  {row.note}
                </div>
                <div
                  className="px-5 py-4 font-mono text-[0.85rem] text-[var(--color-ink)] tnum"
                  style={{ fontFeatureSettings: '"tnum","lnum"' }}
                >
                  {row.rate}
                </div>
                <div className="px-5 py-4 font-body text-[0.85rem] text-[var(--color-ink-secondary)]">
                  {row.desc}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 font-body text-[0.95rem] text-[var(--color-ink-muted)] max-w-[640px] mx-auto leading-relaxed">
            <span className="serif-italic text-[var(--color-ink-secondary)]">
              Same code, three answers.
            </span>{" "}
            Pass a date, get the rule that applied.
          </p>

          <div className="flex justify-center gap-4 mt-12 flex-wrap">
            <a href={axiomAppHref()} className="btn-primary">
              See it in Axiom
              <ArrowRightIcon className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/TheAxiomFoundation/axiom-rules"
              className="btn-outline"
            >
              Spec on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
