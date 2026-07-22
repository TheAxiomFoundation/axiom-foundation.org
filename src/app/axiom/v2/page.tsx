import type { Metadata } from "next";
import Link from "next/link";

/**
 * The app's front door: two entries into the same corpus.
 *
 *   Plane   — graph first. Operate the law: explore the dependency
 *             graph, set a scenario, run it, watch the computation.
 *   Library — text first. Read the law, grounded and cited.
 *
 * Each door carries a framed preview of the surface behind it — a
 * miniature of the real thing, not an abstract illustration: the
 * Plane shows a lit execution graph, the Library a page from the
 * reader with its trust chips and finding list. The divider carries
 * the ∀ mark — one corpus behind both doors.
 */

export const metadata: Metadata = {
  title: "Axiom — the law, readable and runnable",
  description:
    "Two ways into encoded law: run it on the Plane, or read it in the Library.",
  robots: { index: false, follow: true },
};

/** Miniature browser-window frame around each door's preview. */
function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-[0_10px_30px_-18px_rgba(28,25,23,0.4)] transition-transform duration-200 group-hover:-translate-y-0.5">
      <div className="flex items-center gap-1.5 border-b border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[var(--color-rule)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--color-rule)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--color-rule)]" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** The Plane's preview: a small execution graph, output lit. */
function PlanePreview() {
  return (
    <svg
      viewBox="0 0 340 128"
      className="h-auto w-full"
      role="img"
      aria-label="A rule graph computing an allotment from income and household size"
    >
      <defs>
        <marker
          id="portal-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L8 4 L0 8 z" fill="#a8a29e" />
        </marker>
      </defs>
      {/* edges */}
      <g
        stroke="#a8a29e"
        strokeWidth="1.4"
        fill="none"
        markerEnd="url(#portal-arrow)"
        className="portal-flow"
      >
        <path d="M96 30 C 128 30, 132 56, 158 60" />
        <path d="M96 96 C 128 96, 132 70, 158 64" />
        <path d="M232 62 C 248 62, 252 62, 264 62" />
      </g>
      {/* input nodes */}
      <g fontFamily="var(--f-mono, monospace)" fontSize="10">
        <rect x="8" y="16" width="88" height="28" rx="7" fill="#ffffff" stroke="#e7e5e4" />
        <text x="52" y="34" textAnchor="middle" fill="#57534e">
          income · $500
        </text>
        <rect x="8" y="82" width="88" height="28" rx="7" fill="#ffffff" stroke="#e7e5e4" />
        <text x="52" y="100" textAnchor="middle" fill="#57534e">
          household · 3
        </text>
        {/* intermediate */}
        <rect x="158" y="48" width="74" height="28" rx="7" fill="#ffffff" stroke="#e7e5e4" />
        <text x="195" y="66" textAnchor="middle" fill="#57534e">
          net income
        </text>
        {/* output, lit */}
        <rect
          x="264"
          y="44"
          width="70"
          height="36"
          rx="8"
          fill="rgba(217,119,6,0.08)"
          stroke="#d97706"
          strokeWidth="1.4"
        />
        <text x="299" y="59" textAnchor="middle" fill="#78716c" fontSize="8.5">
          ALLOTMENT
        </text>
        <text
          x="299"
          y="73"
          textAnchor="middle"
          fill="#b45309"
          fontSize="12"
          fontWeight="600"
        >
          $785
        </text>
      </g>
    </svg>
  );
}

/** The Library's preview: a miniature reader page. */
function LibraryPreview() {
  const bar = "rounded-full bg-[var(--color-rule)]";
  return (
    <div>
      <p
        className="text-[15px] font-semibold text-[var(--color-ink)]"
        style={{ fontFamily: "var(--f-serif)" }}
      >
        § 2017 — Value of allotment
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-2 py-0.5 text-[9px] font-medium text-[var(--color-ink-secondary)]">
          <span className="text-[var(--color-accent)]">∀</span> 8 rules
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-2 py-0.5">
          <span className="inline-flex items-center gap-[2px]">
            <span className="h-[3px] w-[8px] rounded-full bg-[var(--color-accent)]" />
            <span className="h-[3px] w-[8px] rounded-full bg-[var(--color-rule)]" />
            <span className="h-[3px] w-[8px] rounded-full bg-[var(--color-rule)]" />
            <span className="h-[3px] w-[8px] rounded-full bg-[var(--color-rule)]" />
          </span>
          <span className="text-[9px] font-medium text-[var(--color-ink-secondary)]">
            1 of 6
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(22,101,52,0.25)] bg-[rgba(22,101,52,0.06)] px-2 py-0.5 text-[9px] font-medium text-[var(--color-success)]">
          ✓ Verified
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className={`${bar} h-[5px] w-full`} />
        <div className={`${bar} h-[5px] w-11/12`} />
        <div className={`${bar} h-[5px] w-4/5`} />
      </div>
      <div className="mt-3 space-y-1.5 border-t border-[var(--color-rule)] pt-2.5">
        {[
          ["7", "Agriculture", "∀ 21 / 36"],
          ["26", "Internal Revenue Code", "∀ 26 / 92"],
        ].map(([num, label, mark]) => (
          <div key={num} className="flex items-baseline gap-2">
            <span
              className="w-5 shrink-0 text-right text-[11px] text-[var(--color-ink-muted)]"
              style={{ fontFamily: "var(--f-serif)" }}
            >
              {num}
            </span>
            <span className="text-[10.5px] text-[var(--color-ink-secondary)]">
              {label}
            </span>
            <span className="min-w-3 flex-1 border-b border-dotted border-[var(--color-rule)]" />
            <span className="font-mono text-[9px] text-[var(--color-accent)]">
              {mark}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DOOR_CLASS =
  "group relative flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[0_24px_60px_-24px_rgba(28,25,23,0.35)]";

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
          One corpus, two doors. Step onto the canvas and run the law — or
          read it grounded in its encodings.
        </p>
      </header>

      <div className="relative grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/graph"
          className={DOOR_CLASS}
          style={{
            backgroundImage:
              "radial-gradient(rgba(120,113,108,0.16) 1px, transparent 1px)",
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
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-secondary)]">
              The law as a system. Set a household's numbers, run them, and
              watch the computation light up node by node.
            </p>
          </div>
          <PreviewFrame>
            <PlanePreview />
          </PreviewFrame>
          <span className="mt-auto pt-5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]">
            ▶ Step onto the plane →
          </span>
        </Link>

        <Link href="/us" className={DOOR_CLASS}>
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
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-secondary)]">
              Browse the corpus like a finding aid — text, encodings,
              coverage, and citations on one page.
            </p>
          </div>
          <PreviewFrame>
            <LibraryPreview />
          </PreviewFrame>
          <span className="mt-auto pt-5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-accent)]">
            Open the library →
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
