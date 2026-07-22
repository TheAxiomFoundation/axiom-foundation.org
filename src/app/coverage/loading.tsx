import { RollingNumber } from "@/components/coverage/rolling-number";
import { STACK_LAYERS } from "@/components/coverage/copy";

/**
 * Loading state for /coverage: the hero itself, mid-count — the
 * isometric planes assemble on the left while every figure's reels
 * spin (pure CSS, so they move before hydration). Header copy and
 * layer copy come from the same sources as the real page, so the
 * handoff when data streams in doesn't jump. (Safe on this route —
 * /coverage never 404s, so committing the response early is fine.)
 */
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

        {/* .pscroll (without -live) picks up the same pre-hide rules
            as the real hero, so loading shows exactly what the
            hydrated page will: layer one, counting. */}
        <div className="pscroll mt-14">
          <div className="pstack">
            <div className="pstack-visual" aria-hidden>
            {STACK_LAYERS.map((layer, i) => (
              <div key={layer.key} className="pstack-slot">
                <div
                  className={`pstack-plane pstack-plane-${layer.key}`}
                  style={{ "--layer": i } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
          <ol className="pstack-callouts">
            {STACK_LAYERS.map((layer, i) => (
              <li key={layer.key} className="pstack-callout">
                <div className="pstack-callout-body">
                  <span className="pstack-callout-name">
                    <span className="pstack-ordinal" aria-hidden>
                      0{i + 1}
                    </span>
                    {layer.name}
                  </span>
                  <span className="pstack-callout-value">
                    <RollingNumber text={layer.loadingPattern} spin />
                  </span>
                  <span className="pstack-callout-detail pstack-prose">
                    {layer.detail}
                  </span>
                </div>
              </li>
            ))}
            </ol>
          </div>
        </div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
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
