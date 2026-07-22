import { RollingNumber } from "@/components/coverage/rolling-number";

/**
 * Loading state for /coverage: the hero's own layout with the
 * figures as spinning odometer reels — loading IS the interface
 * here, not a separate skeleton. The static header copy renders for
 * real so the handoff to the loaded page doesn't jump; the reels
 * settle into the live figures when the stream arrives. Cards below
 * stay as quiet pulse blocks. (Safe on this route — /coverage never
 * 404s, so committing the response early costs nothing.)
 */

const LOADING_LAYERS = [
  { name: "Source documents", pattern: "0,000" },
  { name: "Provisions", pattern: "00,000" },
  { name: "RuleSpec encodings", pattern: "0,000" },
];

export default function CoverageLoading() {
  const bar = "animate-pulse rounded bg-[var(--color-rule)]/70";
  return (
    <div className="relative z-1 pt-32 pb-24 px-8" aria-busy>
      <div className="max-w-[1080px] mx-auto">
        <span className="kicker mb-6 inline-flex">
          <span className="kicker-mark">&sect;</span>
          Coverage &middot; Depth &amp; breadth
        </span>
        <h1 className="heading-page mb-6 mt-2" suppressHydrationWarning>
          The whole stack, counted
        </h1>
        <p className="max-w-[760px] font-body text-[1.2rem] text-[var(--color-ink-secondary)] leading-relaxed text-pretty">
          What Axiom holds today, layer by layer: source documents
          (a U.S.&nbsp;Code title, a CFR part, a state act, an agency
          manual), the atomic provisions they split into, and the
          machine-readable RuleSpec encodings built on top. Counts come
          from the live corpus release and refresh every ten minutes.
        </p>

        <ol className="mt-16 m-0 p-0 list-none flex flex-col gap-8 max-w-[520px]">
          {LOADING_LAYERS.map((layer, i) => (
            <li key={layer.name} className="pstack-callout">
              <div className="pstack-callout-body">
                <span className="pstack-callout-name">
                  <span className="pstack-ordinal" aria-hidden>
                    0{i + 1}
                  </span>
                  {layer.name}
                </span>
                <span className="pstack-callout-value">
                  <RollingNumber text={layer.pattern} spin />
                </span>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          counting the corpus…
        </p>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${bar} h-36 rounded-lg`} />
          ))}
        </div>
      </div>
    </div>
  );
}
