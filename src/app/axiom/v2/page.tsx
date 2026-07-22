import type { Metadata } from "next";
import Link from "next/link";

/**
 * The app's front door: two entries into the same corpus.
 *
 *   Library — text first. Read the law, grounded and cited.
 *   Plane   — graph first. Operate the law: explore, set a
 *             scenario, run it, watch the computation.
 *
 * One split surface, each half in its own material: the Library in
 * the reading room's warm serif, the Plane in the canvas's cooler
 * technical register. The divider carries the ∀ mark — the same
 * corpus behind both doors.
 */

export const metadata: Metadata = {
  title: "Axiom — the law, readable and runnable",
  description:
    "Two ways into encoded law: read it in the Library, or run it on the Plane.",
  robots: { index: false, follow: true },
};

export default function PortalPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[88rem] flex-col px-4 pt-24 pb-10">
      <header className="mb-8 text-center">
        <h1
          className="text-[2.6rem] leading-[1.08] font-semibold text-[var(--color-ink)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          The law, readable and runnable.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-ink-secondary)]">
          One corpus, two doors. Read statutes and regulations grounded in
          their encodings — or step onto the canvas and run them.
        </p>
      </header>

      <div className="relative grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/us"
          className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[0_24px_60px_-24px_rgba(28,25,23,0.35)]"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Text first
            </p>
            <h2
              className="mt-2 text-[1.9rem] font-semibold text-[var(--color-ink)]"
              style={{ fontFamily: "var(--f-serif)" }}
            >
              Library
            </h2>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-secondary)]">
              Browse the corpus like a finding aid — statutes, regulations,
              and policy with their encodings, coverage, and citations
              alongside the text.
            </p>
          </div>
          <div aria-hidden className="mt-8 space-y-2 opacity-70">
            <div className="flex items-baseline gap-3">
              <span
                className="w-8 text-right text-[1.05rem] text-[var(--color-ink-muted)]"
                style={{ fontFamily: "var(--f-serif)" }}
              >
                26
              </span>
              <span className="text-[13px] text-[var(--color-ink-secondary)]">
                Internal Revenue Code
              </span>
              <span className="min-w-4 flex-1 border-b border-dotted border-[var(--color-rule)]" />
              <span className="font-mono text-[11px] text-[var(--color-accent)]">
                ∀ 26
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className="w-8 text-right text-[1.05rem] text-[var(--color-ink-muted)]"
                style={{ fontFamily: "var(--f-serif)" }}
              >
                7
              </span>
              <span className="text-[13px] text-[var(--color-ink-secondary)]">
                Agriculture
              </span>
              <span className="min-w-4 flex-1 border-b border-dotted border-[var(--color-rule)]" />
              <span className="font-mono text-[11px] text-[var(--color-accent)]">
                ∀ 21
              </span>
            </div>
          </div>
          <span className="mt-6 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]">
            Open the library →
          </span>
        </Link>

        <Link
          href="/graph"
          className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[0_24px_60px_-24px_rgba(28,25,23,0.35)]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(120,113,108,0.18) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Graph first
            </p>
            <h2 className="mt-2 text-[1.9rem] font-semibold text-[var(--color-ink)]">
              Plane
            </h2>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-secondary)]">
              The law as a system. Walk the dependency graph, set a
              household's numbers, and run — the computation lights up node
              by node.
            </p>
          </div>
          <div aria-hidden className="mt-8 flex items-center gap-2 opacity-80">
            <span className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-[11px] text-[var(--color-ink-secondary)] shadow-sm">
              gross income
            </span>
            <span className="text-[var(--color-ink-muted)]">──</span>
            <span className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-[11px] text-[var(--color-ink-secondary)] shadow-sm">
              net income
            </span>
            <span className="text-[var(--color-ink-muted)]">──</span>
            <span className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-light)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-accent-hover)] shadow-sm">
              allotment · $298
            </span>
          </div>
          <span className="mt-6 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]">
            ▶ Step onto the plane →
          </span>
        </Link>

        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-[15px] text-[var(--color-accent)] shadow-sm md:flex"
        >
          ∀
        </span>
      </div>
    </div>
  );
}
