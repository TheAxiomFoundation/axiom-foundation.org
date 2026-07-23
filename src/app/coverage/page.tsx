import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import { StackHero } from "@/components/coverage/stack-hero";
import { ShelfCards } from "@/components/coverage/shelf-cards";
import {
  getCoverageData,
  usOnlyCoverage,
  type CoverageData,
} from "@/lib/axiom/coverage-page";

export const metadata: Metadata = {
  title: "Coverage — Axiom Foundation",
  description:
    "What Axiom holds today: legal documents by type and jurisdiction, provision counts, and RuleSpec encoding files — refreshed from the live corpus.",
};

// Static page revalidated from the live corpus; counts change only
// when a release is activated or the encodings mirror syncs.
export const revalidate = 600;

export default async function CoveragePage() {
  const all = await getCoverageData();
  // Launch scope: US federal + states only for now.
  const data = all && usOnlyCoverage(all);

  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="max-w-[1080px] mx-auto">
        <Reveal className="mb-14 max-w-[760px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Coverage &middot; Depth &amp; breadth
          </span>
          {/* GradientSync styles this heading before the streamed
              boundary hydrates (loading.tsx makes the page stream);
              the attribute delta is intentional. */}
          <h1 className="heading-page mb-6 mt-2" suppressHydrationWarning>
            The whole stack, counted
          </h1>
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
  return (
    <>
      {/* No Reveal wrapper here: its transform would break the
          sticky scrollytelling stage inside the hero. */}
      <div className="mb-20">
        <StackHero data={data} />
      </div>

      <Reveal as="section" className="mb-16">
        <h2 className="m-0 mb-8 font-display text-[1.35rem] font-light tracking-[0.02em] text-[var(--color-ink)]">
          <span aria-hidden className="mb-3 block h-px w-7 bg-[var(--color-accent)]" />
          By jurisdiction
        </h2>
        <ShelfCards jurisdictions={data.jurisdictions} />
      </Reveal>
    </>
  );
}
