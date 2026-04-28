import { CheckIcon, GitHubIcon } from "@/components/icons";
import { axiomAppHref } from "@/lib/urls";

export function AxiomSection() {
  return (
    <section id="axiom" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">§</span>
            I &middot; The Archive
          </span>
          <h2 className="heading-section text-[var(--color-ink)] mb-6 mt-2">
            Axiom
          </h2>
          <p className="font-body text-lg font-light text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            The open platform for exploring encoded law. Browse the Archive of
            source documents, RuleSpec encodings, and validation results across
            jurisdictions.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 mt-12 mb-12">
          {[
            {
              n: "01",
              title: "Federal statutes",
              stat: "53",
              statLabel: "USC titles",
              desc: "82,854 sections \u00b7 160,360 cross-references",
            },
            {
              n: "02",
              title: "IRS guidance",
              stat: "570",
              statLabel: "documents",
              desc: "148 Rev. Procs \u00b7 105 Rev. Rulings \u00b7 317 Notices",
            },
            {
              n: "03",
              title: "State codes",
              stat: "48",
              statLabel: "states archived",
              desc: "NY, CA, DC with full section-level data",
            },
            {
              n: "04",
              title: "Regulations",
              stat: "7",
              statLabel: "CFR 271\u2013283",
              desc: "SNAP ingested \u00b7 Treasury and agency rules next",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="card-edition p-7 flex flex-col"
            >
              <div className="flex items-baseline justify-between mb-5">
                <span className="serial">{item.n}</span>
                <span className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)]">
                  Archive
                </span>
              </div>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="tnum font-display font-light text-[2.4rem] leading-none text-[var(--color-ink)]">
                  {item.stat}
                </span>
                <span className="font-mono text-[0.7rem] tracking-[0.12em] uppercase text-[var(--color-ink-muted)]">
                  {item.statLabel}
                </span>
              </div>
              <h3 className="font-body text-base font-medium text-[var(--color-ink)] mb-1.5">
                {item.title}
              </h3>
              <p className="font-body text-[0.85rem] text-[var(--color-ink-secondary)] leading-snug m-0">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 mb-12">
          {[
            "Provenance tracking \u2014 fetch date, source URL, checksums",
            "Full-text search \u2014 query by citation, keyword, or path",
            "Change detection \u2014 know when upstream sources update",
          ].map((text) => (
            <div
              key={text}
              className="flex items-center gap-2 font-body text-sm text-[var(--color-ink-secondary)]"
            >
              <CheckIcon className="w-4 h-4 text-[var(--color-success)]" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <a href={axiomAppHref()} className="btn-primary">
            Explore Axiom
          </a>
          <a
            href="https://github.com/TheAxiomFoundation"
            className="btn-outline"
          >
            <GitHubIcon className="w-5 h-5" />
            Archive on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
