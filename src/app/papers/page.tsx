import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { papers, paperPdfPath } from "@/lib/papers";

export const metadata: Metadata = {
  title: "Papers — Axiom Foundation",
  description:
    "Method papers on encoding law and holding the encodings to account, with the data and code behind each result.",
  // Round 1 pull-back — noindexed until the Jul 28 launch.
  robots: { index: false, follow: false },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function PapersPage() {
  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[900px] mx-auto">
        <header className="mb-16 max-w-[760px]">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] mb-4">
            Papers
          </p>
          <h1 className="heading-page mb-6">Method, written down</h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed">
            Each paper states a method, reports what it produced, and names what
            it does not establish. Every result is computed from public data by
            public code, so the numbers can be recomputed rather than taken on
            our word.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {papers.map((paper) => (
            <article
              key={paper.slug}
              className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                  {formatDate(paper.date)}
                </p>
                {paper.status === "draft" ? (
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                    Draft
                  </span>
                ) : null}
              </div>

              <h2 className="font-body text-2xl text-[var(--color-ink)] mb-2">
                <Link
                  href={`/papers/${paper.slug}`}
                  className="hover:text-[var(--color-accent)]"
                >
                  {paper.title}
                </Link>
              </h2>
              <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-5">
                {paper.subtitle}
              </p>

              <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed mb-3">
                {paper.summary}
              </p>
              <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed mb-6">
                {paper.contribution}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href={`/papers/${paper.slug}`} className="btn-primary">
                  Read
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
                <a href={paperPdfPath(paper.slug)} className="btn-outline">
                  PDF
                </a>
                {paper.preprintUrl ? (
                  <a href={paper.preprintUrl} className="btn-outline">
                    Preprint
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
