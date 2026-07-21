import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import {
  getCoverageData,
  type CoverageData,
  type JurisdictionCoverage,
} from "@/lib/axiom/coverage-page";

export const metadata: Metadata = {
  title: "Coverage — Axiom Foundation",
  description:
    "What Axiom holds today: legal documents by type and jurisdiction, provision counts, and RuleSpec encoding files — refreshed from the live corpus.",
};

// Static page revalidated from the live corpus; counts change only
// when a release is activated or the encodings mirror syncs.
export const revalidate = 600;

/** Column buckets for the per-jurisdiction table. Everything not
 *  statute/regulation (policy, guidance, manuals, forms, plans)
 *  folds into one "other" column with a hover breakdown. */
const PRIMARY_TYPES = ["statute", "regulation"] as const;

const DOC_TYPE_LABELS: Record<string, string> = {
  statute: "Statutes",
  regulation: "Regulations",
  policy: "Policy documents",
  guidance: "Guidance documents",
  manual: "Manuals",
  form: "Forms",
  "district-plan": "District plans",
};

function docTypeLabel(type: string): string {
  return (
    DOC_TYPE_LABELS[type] ??
    type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")
  );
}

function otherDocs(j: JurisdictionCoverage): {
  count: number;
  breakdown: string;
} {
  const entries = Object.entries(j.documents).filter(
    ([type]) => !(PRIMARY_TYPES as readonly string[]).includes(type)
  );
  return {
    count: entries.reduce((sum, [, count]) => sum + count, 0),
    breakdown: entries
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${count} ${docTypeLabel(type).toLowerCase()}`)
      .join(", "),
  };
}

const numberFormat = new Intl.NumberFormat("en-US");
const n = (value: number) => numberFormat.format(value);

export default async function CoveragePage() {
  const data = await getCoverageData();

  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="max-w-[1080px] mx-auto">
        <Reveal className="mb-16 max-w-[760px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Coverage &middot; What&apos;s inside
          </span>
          <h1 className="heading-page mb-6 mt-2">
            The corpus, counted
          </h1>
          <p className="font-body text-[1.2rem] text-[var(--color-ink-secondary)] leading-relaxed text-pretty">
            Every number on this page comes from the live corpus release
            and the encodings mirror, refreshed every ten minutes. A
            document is a top-level instrument &mdash; a U.S.&nbsp;Code
            title, a CFR part, a state act, an agency manual. Encoding
            files are RuleSpec YAML; one file can define several rules.
          </p>
        </Reveal>

        {data === null ? (
          <Reveal className="py-16 text-center text-[var(--color-ink-muted)]">
            Live counts are temporarily unavailable. Reload to try again.
          </Reveal>
        ) : (
          <CoverageBody data={data} />
        )}
      </div>
    </div>
  );
}

function CoverageBody({ data }: { data: CoverageData }) {
  return (
    <>
      <Reveal as="section" className="mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatTile value={data.totals.jurisdictions} label="Jurisdictions" />
          <StatTile value={data.totals.documents} label="Documents" />
          <StatTile value={data.totals.provisions} label="Provisions" />
          <StatTile value={data.totals.encodingFiles} label="Encoding files" />
        </div>
        {data.docTypeTotals.length > 0 && (
          <p className="mt-5 font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--color-ink-muted)]">
            {data.docTypeTotals
              .map(({ type, count }) => `${n(count)} ${docTypeLabel(type).toLowerCase()}`)
              .join(" · ")}
          </p>
        )}
      </Reveal>

      <Reveal as="section" className="mb-16">
        <h2 className="m-0 mb-8 font-display text-[1.35rem] font-light tracking-[0.02em] text-[var(--color-ink)]">
          <span aria-hidden className="mb-3 block h-px w-7 bg-[var(--color-accent)]" />
          By jurisdiction
        </h2>
        <div className="overflow-x-auto border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-rule)] font-mono text-[0.68rem] tracking-[0.12em] uppercase text-[var(--color-ink-muted)]">
                <th className="px-4 py-3 font-normal">Jurisdiction</th>
                <th className="px-4 py-3 font-normal text-right">Statutes</th>
                <th className="px-4 py-3 font-normal text-right">Regulations</th>
                <th className="px-4 py-3 font-normal text-right">Other docs</th>
                <th className="px-4 py-3 font-normal text-right">Provisions</th>
                <th className="px-4 py-3 font-normal text-right">
                  Encoding files
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule-subtle)]">
              {data.jurisdictions.map((j) => (
                <JurisdictionRow key={j.slug} j={j} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[720px] font-body text-[0.9rem] leading-relaxed text-[var(--color-ink-muted)]">
          Jurisdictions with encoding files but no provision counts have
          RuleSpec encodings published ahead of their corpus ingestion.
          Click a jurisdiction to browse its documents in the Axiom app.
        </p>
      </Reveal>
    </>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="card-edition p-6">
      <div className="font-mono text-[1.7rem] text-[var(--color-ink)]">
        {n(value)}
      </div>
      <div className="mt-1 font-mono text-[0.68rem] tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
        {label}
      </div>
    </div>
  );
}

function JurisdictionRow({ j }: { j: JurisdictionCoverage }) {
  const other = otherDocs(j);
  const inCorpus = j.provisionCount > 0;
  const cell =
    "px-4 py-2.5 text-right font-mono text-[0.8rem] text-[var(--color-ink-secondary)]";
  return (
    <tr className="hover:bg-[var(--color-paper)] transition-colors">
      <td className="px-4 py-2.5">
        {inCorpus ? (
          <a
            href={`/${j.slug}`}
            className="font-body text-[0.95rem] text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
          >
            {j.label}
          </a>
        ) : (
          <span className="font-body text-[0.95rem] text-[var(--color-ink)]">
            {j.label}
          </span>
        )}
      </td>
      <td className={cell}>{cellCount(j.documents.statute, inCorpus)}</td>
      <td className={cell}>{cellCount(j.documents.regulation, inCorpus)}</td>
      <td className={cell} title={other.breakdown || undefined}>
        {cellCount(other.count || undefined, inCorpus)}
      </td>
      <td className={cell}>{inCorpus ? n(j.provisionCount) : "—"}</td>
      <td className={`${cell} text-[var(--color-accent)]`}>
        {j.encodingFileCount > 0 ? n(j.encodingFileCount) : "—"}
      </td>
    </tr>
  );
}

function cellCount(value: number | undefined, inCorpus: boolean): string {
  if (!inCorpus) return "—";
  return value ? n(value) : "·";
}
