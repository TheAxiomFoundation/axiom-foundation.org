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

/**
 * The Plane's preview: real node cards (the canvas's own vocabulary —
 * Question / Rule / Result) over animated edges, output lit with its
 * computed value. HTML cards + an SVG edge layer, so type renders as
 * crisply as the app itself.
 */
function PlanePreview() {
  const node =
    "absolute rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-2.5 py-1.5 shadow-[0_1px_2px_rgba(28,25,23,0.06)]";
  const eyebrow =
    "block font-mono text-[7.5px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]";
  const label = "block text-[11px] font-medium text-[var(--color-ink)]";
  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: "340 / 150" }}
      role="img"
      aria-label="A rule graph computing an allotment from income and household size"
    >
      <style>{`
        .portal-edge { stroke-dasharray: 5 4; animation: portal-flow 1.1s linear infinite; }
        @keyframes portal-flow { to { stroke-dashoffset: -9; } }
        @media (prefers-reduced-motion: reduce) { .portal-edge { animation: none; } }
      `}</style>
      <svg
        viewBox="0 0 340 150"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <g
          className="portal-edge"
          stroke="var(--color-ink-muted)"
          strokeOpacity="0.45"
          strokeWidth="1.3"
          fill="none"
        >
          <path d="M126 33 C 146 33, 138 71, 158 71" />
          <path d="M126 117 C 146 117, 138 79, 158 79" />
          <path d="M250 75 C 256 75, 256 75, 262 75" />
        </g>
      </svg>

      <div className={node} style={{ left: "2.4%", top: "9%", width: "34%" }}>
        <span className={eyebrow}>Question</span>
        <span className={label}>Monthly income · $500</span>
      </div>
      <div className={node} style={{ left: "2.4%", top: "65%", width: "34%" }}>
        <span className={eyebrow}>Question</span>
        <span className={label}>Household · 3 people</span>
      </div>
      <div className={node} style={{ left: "46.5%", top: "37%", width: "27%" }}>
        <span className={eyebrow}>Rule</span>
        <span className={label}>Net income</span>
      </div>
      <div
        className="absolute rounded-lg border border-[var(--color-accent)] bg-[var(--color-paper-elevated)] px-2.5 py-1.5 shadow-[0_0_0_3px_var(--color-accent-light),0_6px_16px_-6px_rgba(217,119,6,0.5)]"
        style={{ left: "77%", top: "30%", width: "21%" }}
      >
        <span className="block font-mono text-[7.5px] uppercase tracking-[0.12em] text-[var(--color-accent)]">
          Result
        </span>
        <span className="block text-[11px] font-medium text-[var(--color-ink)]">
          Allotment
        </span>
        <span className="block text-[15px] font-semibold tracking-tight text-[var(--color-accent-hover)]">
          $785
        </span>
      </div>
    </div>
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
          href="/app"
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
