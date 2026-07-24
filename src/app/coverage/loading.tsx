import { RollingNumber } from "@/components/coverage/rolling-number";
import { CoverageHeader } from "@/components/coverage/header";
import { STACK_LAYERS } from "@/components/coverage/copy";

/**
 * Loading state for /coverage: the hero itself, mid-count — reels
 * spinning in pure CSS so they move before hydration, and a visible
 * "counting the corpus…" line so a slow load never reads as stuck.
 *
 * The markup mirrors the loaded page's structure exactly (same
 * wrappers, margins, and sticky stage) so the stream swap doesn't
 * shift a single pixel of the shared frame. (Safe on this route —
 * /coverage never 404s, so committing the response early is fine.)
 */
export default function CoverageLoading() {
  return (
    <div className="relative z-1 pt-32 pb-24 px-8" aria-busy>
      <div className="max-w-[1080px] mx-auto">
        <div className="mb-14 max-w-[760px]">
          <CoverageHeader />
        </div>

        <div className="mb-20">
          <section className="pscroll" aria-label="The stack">
            <div className="pscroll-sticky">
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
                  {/* Same in-column status as the loaded hero — the
                      bottom line is below the fold on tall stages. */}
                  <li className="pstack-counting" aria-hidden data-on>
                    <span className="cov-counting">counting the corpus</span>
                  </li>
                </ol>
              </div>
              <p className="pscroll-hint cov-counting" role="status">
                counting the corpus
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
