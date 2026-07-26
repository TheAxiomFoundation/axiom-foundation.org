import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaper, papers, paperPdfPath, paperWebPath } from "@/lib/papers";

// Next 15+: dynamic-route params arrive as a Promise. Reading them
// synchronously makes every slug prerender as notFound() at HTTP 200 —
// silently, with no build error. Always await.
interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return papers.map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const paper = getPaper(slug);
  if (!paper) return {};
  return {
    title: `${paper.title} — Axiom Foundation`,
    description: paper.subtitle,
    // Round 1 pull-back — noindexed until the Jul 28 launch.
    robots: { index: false, follow: false },
  };
}

export default async function PaperPage({ params }: PageProps) {
  const { slug } = await params;
  const paper = getPaper(slug);
  if (!paper) notFound();

  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[1000px] mx-auto">
        <header className="mb-8 max-w-[780px]">
          <Link
            href="/papers"
            className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            ← Papers
          </Link>

          {/* The manuscript carries its own title block, so printing the title
              and subtitle again here would double-list them a few hundred
              pixels apart. The heading stays for accessibility and document
              outline; it just isn't drawn twice. */}
          <h1 className="sr-only">{paper.title}</h1>

          <div className="flex flex-wrap gap-3 mt-6">
            <a href={paperPdfPath(paper.slug)} className="btn-primary">
              Download PDF
            </a>
            {paper.preprintUrl ? (
              <a href={paper.preprintUrl} className="btn-outline">
                Preprint
              </a>
            ) : null}
            {paper.sources.map((source) => (
              <a key={source.href} href={source.href} className="btn-outline">
                {source.label}
              </a>
            ))}
          </div>
        </header>

        {/* The manuscript is a self-contained Quarto render served as a static
            asset, so it keeps its own typography and internal links. An iframe
            is the honest container: what a reader sees here is byte-identical
            to what the PDF was built from. */}
        <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] overflow-hidden">
          <iframe
            src={paperWebPath(paper.slug)}
            title={paper.title}
            className="w-full block"
            style={{ height: "min(85vh, 1100px)" }}
            loading="lazy"
          />
        </div>

        <p className="font-body text-[0.85rem] text-[var(--color-ink-muted)] leading-relaxed mt-4">
          Trouble with the embedded view?{" "}
          <a
            href={paperWebPath(paper.slug)}
            className="text-[var(--color-accent)] underline underline-offset-4"
          >
            Open the manuscript directly
          </a>{" "}
          or{" "}
          <a
            href={paperPdfPath(paper.slug)}
            className="text-[var(--color-accent)] underline underline-offset-4"
          >
            download the PDF
          </a>
          .
        </p>
      </div>
    </div>
  );
}
