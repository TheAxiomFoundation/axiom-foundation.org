import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import { CoverageHeader } from "@/components/coverage/header";
import { StackHero } from "@/components/coverage/stack-hero";
import { CoverageViews } from "@/components/coverage/coverage-views";
import {
  getProgramCoverage,
  getRegistryStats,
  type ProgramCoverage,
  type RegistryStats,
} from "@/lib/axiom/program-coverage";
import {
  getCoverageData,
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
  const [data, programs, registry] = await Promise.all([
    getCoverageData(),
    getProgramCoverage(),
    getRegistryStats(),
  ]);

  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="max-w-[1080px] mx-auto">
        {/* No Reveal on the header: the loading state already shows
            it, so re-animating on the stream swap reads as a jump. */}
        <div className="mb-14 max-w-[760px]">
          <CoverageHeader />
        </div>

        {data === null ? (
          <Reveal className="py-16 text-center text-[var(--color-ink-muted)]">
            Live counts are temporarily unavailable. Reload to try again.
          </Reveal>
        ) : (
          <CoverageBody data={data} programs={programs} registry={registry} />
        )}
      </div>
    </div>
  );
}

const numberFormat = new Intl.NumberFormat("en-US");

function CoverageBody({
  data,
  programs,
  registry,
}: {
  data: CoverageData;
  programs: ProgramCoverage[];
  registry: RegistryStats | null;
}) {
  return (
    <>
      {/* No Reveal wrapper here: its transform would break the
          sticky scrollytelling stage inside the hero. */}
      <div className="mb-20">
        <StackHero data={data} />
      </div>

      {/* The certified layer: only compiled packages carry the
          signature — fixture previews don't count here. */}
      {registry && (
        <Reveal className="-mt-6 mb-20 text-center">
          <p className="m-0 mx-auto max-w-[640px] font-body text-[1.05rem] text-[var(--color-ink-secondary)] leading-relaxed">
            Of these,{" "}
            <span className="font-mono text-[var(--color-accent)]">
              {numberFormat.format(registry.compiledPrograms)}
            </span>{" "}
            programs are compiled into the signed runtime registry &mdash;{" "}
            <span className="font-mono text-[var(--color-accent)]">
              {numberFormat.format(registry.certifiedRules)}
            </span>{" "}
            certified rules,{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              executable today
            </span>
            .
          </p>
        </Reveal>
      )}

      <Reveal as="section" className="mb-16">
        <CoverageViews
          jurisdictions={data.jurisdictions}
          programs={programs}
        />
      </Reveal>
    </>
  );
}
