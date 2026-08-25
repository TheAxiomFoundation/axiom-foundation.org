import type { Metadata } from "next";

/**
 * Shelled wrapper for the tariff rules working paper — the manuscript
 * never serves bare at /tariff/paper. The raw Quarto render lives in
 * public/tariff/paper/web/ (index.html + index.pdf + paper_files/);
 * refresh it from the paper repo with:
 *
 *   cd ~/TheAxiomFoundation/tariff-rules-paper
 *   quarto render paper.qmd --to html && quarto render paper.qmd --to pdf
 *   cp paper.html  <axiom.org>/public/tariff/paper/web/index.html
 *   cp paper.pdf   <axiom.org>/public/tariff/paper/web/index.pdf
 *   cp -R paper_files <axiom.org>/public/tariff/paper/web/paper_files
 *   # then: fix the internal PDF link (paper.pdf -> index.pdf) and
 *   # bump PAPER_VERSION below.
 *
 * PAPER_VERSION busts CDN and browser caches: it must change on every
 * manuscript revision and be identical on the iframe and every
 * standalone link (a test locks the lockstep).
 */
export const PAPER_VERSION = "r2-20260825";

// Root-absolute: Next serves this route without a trailing slash, so
// relative URLs would resolve against /tariff/ and miss the render.
const MANUSCRIPT_URL = `/tariff/paper/web/index.html?v=${PAPER_VERSION}`;
const PDF_URL = `/tariff/paper/web/index.pdf?v=${PAPER_VERSION}`;
const REPO_URL = "https://github.com/TheAxiomFoundation/tariff-rules-paper";

export const metadata: Metadata = {
  title: "Executable tariff law — working paper — Axiom Foundation",
  description:
    "Deterministic derivations and conformance for the 2025–26 trade shock: 13,790 rated lines encoded as cited rules, reconciled against Yale Budget Lab's tracker across 9.9 million cells with zero unexplained mismatches; the machine-checked certificate's current verdict is no, with the remaining encoding named inside it.",
  openGraph: {
    type: "article",
    title: "Executable tariff law — working paper",
    url: "https://axiom.org/tariff/paper",
  },
};

const linkClass =
  "border border-[var(--color-rule)] px-4 py-2 font-mono text-xs uppercase tracking-wider text-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)]";

export default function TariffPaperPage() {
  return (
    <main className="relative z-1 px-5 pb-24 pt-32 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-8 max-w-[800px]">
          <p className="kicker mb-5 inline-flex">Working paper</p>
          <h1 className="heading-page mb-5">
            Executable tariff law: deterministic derivations and conformance for
            the 2025–26 trade shock
          </h1>
          <p className="font-body text-lg leading-relaxed text-[var(--color-ink-secondary)]">
            How the 2026 Harmonized Tariff Schedule — 13,790 rated lines, 100
            chapter compositions, and the chapter-99 action layer — was encoded
            as cited, executable rules and reconciled against Yale Budget
            Lab&apos;s tariff-rate tracker across 9.9 million evaluated cells,
            with every disagreement assigned to a receipted explanation and a
            machine-checked certificate that currently says no. This page embeds
            the manuscript snapshot below.
          </p>
          <p className="mt-4 inline-flex border border-[var(--color-rule)] px-3 py-1 font-mono text-xs text-[var(--color-ink-muted)]">
            Revision 2 · 2026-08-25 · Max Ghenis, the Axiom Foundation
          </p>
        </header>

        <nav aria-label="Paper actions" className="mb-8 flex flex-wrap gap-3">
          <a className={linkClass} href={MANUSCRIPT_URL}>
            Open standalone HTML
          </a>
          <a className={linkClass} href={PDF_URL}>
            Download PDF
          </a>
          <a className={linkClass} href="/tariff/schedule">
            Live schedule browser
          </a>
          <a className={linkClass} href={REPO_URL}>
            Code and artifacts
          </a>
        </nav>

        <div className="border border-[var(--color-rule)]">
          <iframe
            src={MANUSCRIPT_URL}
            title="Executable tariff law: deterministic derivations and conformance for the 2025–26 trade shock — manuscript"
            loading="lazy"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="same-origin"
            className="block w-full"
            style={{
              height: "calc(100vh - 16rem)",
              minHeight: 720,
              background: "#fff",
            }}
          />
        </div>

        <p className="mt-6 font-mono text-xs text-[var(--color-ink-muted)]">
          <a className="text-[var(--color-accent)] underline" href="#top">
            ↑ Back to top
          </a>
          {" · "}
          <a
            className="text-[var(--color-accent)] underline"
            href={MANUSCRIPT_URL}
          >
            Open manuscript in a new page
          </a>
        </p>
      </div>
    </main>
  );
}
