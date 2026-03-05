import Link from "next/link";
import { CheckIcon, GitHubIcon } from "@/components/icons";

export function AtlasSection() {
  return (
    <section id="atlas" className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <span className="eyebrow block mb-4">Platform</span>
          <h2 className="heading-section text-[var(--color-text)] mb-6">
            Atlas
          </h2>
          <p className="font-[family-name:var(--f-body)] text-lg font-light text-[var(--color-text-secondary)] max-w-[600px] mx-auto leading-relaxed">
            The open platform for exploring encoded law. Browse the Archive
            of source documents, RAC encodings, and validation results
            across jurisdictions.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 mt-12 mb-12">
          {[
            {
              title: "Federal statutes",
              desc: "53 USC titles \u2022 82,854 sections \u2022 160,360 cross-references",
            },
            {
              title: "IRS guidance",
              desc: "148 Rev. Procs \u2022 105 Rev. Rulings \u2022 317 Notices",
            },
            {
              title: "State codes",
              desc: "48 states archived \u2022 NY, CA, DC with full section data",
            },
            {
              title: "Regulations",
              desc: "CFR titles, Treasury regulations, agency rules \u2014 coming soon",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-gradient-to-br from-[var(--color-bg)] to-[var(--color-void)] border border-[var(--color-border)] rounded-xl p-8 transition-all duration-200 hover:border-[var(--color-precision)] hover:-translate-y-0.5"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              <h4 className="font-[family-name:var(--f-body)] text-lg text-[var(--color-text)] mb-2">
                {item.title}
              </h4>
              <p className="font-[family-name:var(--f-body)] text-sm text-[var(--color-text-secondary)] leading-normal m-0">
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
              className="flex items-center gap-2 font-[family-name:var(--f-body)] text-sm text-[var(--color-text-secondary)]"
            >
              <CheckIcon className="w-4 h-4 text-[var(--color-success)]" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/atlas" className="btn-primary">
            Explore Atlas
          </Link>
          <a
            href="https://github.com/RuleAtlas/atlas"
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
