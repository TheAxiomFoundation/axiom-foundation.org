import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import { Stacks, buildShelves } from "@/components/coverage/stacks";
import { ShelfCards } from "@/components/coverage/shelf-cards";
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
    ([type]) => type !== "statute" && type !== "regulation"
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
        <Reveal className="mb-14 max-w-[760px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Coverage &middot; The stacks
          </span>
          <h1 className="heading-page mb-6 mt-2">
            Every shelf, counted
          </h1>
          <p className="font-body text-[1.2rem] text-[var(--color-ink-secondary)] leading-relaxed text-pretty">
            What Axiom holds today, shelved the way a law library would:
            statutes, regulations, and agency guidance &mdash; and beneath
            them, the gilt shelf machines can read. A document is a
            top-level instrument (a U.S.&nbsp;Code title, a CFR part, a
            state act, an agency manual); counts come from the live corpus
            release and refresh every ten minutes.
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
  const { shelves, quantum } = buildShelves(data);
  return (
    <>
      <Reveal as="section" className="mb-20" aria-label="The stacks">
        <Stacks
          shelves={shelves}
          quantum={quantum}
          provisions={data.totals.provisions}
          jurisdictions={data.totals.jurisdictions}
        />
      </Reveal>

      <Reveal as="section" className="mb-16">
        <h2 className="m-0 mb-8 font-display text-[1.35rem] font-light tracking-[0.02em] text-[var(--color-ink)]">
          <span aria-hidden className="mb-3 block h-px w-7 bg-[var(--color-accent)]" />
          By jurisdiction
        </h2>
        <ShelfCards jurisdictions={data.jurisdictions} />
        <p className="mt-6 max-w-[720px] font-body text-[0.9rem] leading-relaxed text-[var(--color-ink-muted)]">
          Each card is that jurisdiction&apos;s own shelf — the mix of
          statutes, regulations, and other documents at a glance, with
          the exact counts beside it. Cards without provision counts
          have RuleSpec encodings published ahead of their corpus
          ingestion. Click a card to browse its documents in the Axiom
          app.
        </p>
        <details className="mt-8">
          <summary className="cursor-pointer font-mono text-[0.7rem] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]">
            View as table
          </summary>
          <div className="mt-4">
            <JurisdictionTable data={data} />
          </div>
        </details>
      </Reveal>
    </>
  );
}

function JurisdictionTable({ data }: { data: CoverageData }) {
  const maxProvisions = Math.max(
    1,
    ...data.jurisdictions.map((j) => j.provisionCount)
  );
  return (
    <div className="overflow-x-auto border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--color-rule)] font-mono text-[0.68rem] tracking-[0.12em] uppercase text-[var(--color-ink-muted)]">
            <th className="px-4 py-3 font-normal">Jurisdiction</th>
            <th className="px-4 py-3 font-normal min-w-[140px]">
              <span className="sr-only">Provision share</span>
            </th>
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
            <JurisdictionRow key={j.slug} j={j} maxProvisions={maxProvisions} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JurisdictionRow({
  j,
  maxProvisions,
}: {
  j: JurisdictionCoverage;
  maxProvisions: number;
}) {
  const other = otherDocs(j);
  const inCorpus = j.provisionCount > 0;
  const share = Math.max(
    j.provisionCount > 0 ? 1.5 : 0,
    (j.provisionCount / maxProvisions) * 100
  );
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
      <td className="px-4 py-2.5" aria-hidden>
        <span className="coverage-bar">
          <span style={{ width: `${share}%` }} />
        </span>
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
