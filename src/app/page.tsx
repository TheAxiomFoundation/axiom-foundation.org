import { Hero } from "@/components/landing/hero";
import { AtlasSection } from "@/components/landing/atlas-section";
import { RacSection } from "@/components/landing/rac-section";
import { RacFormat } from "@/components/landing/rac-format";
import { AutoracSection } from "@/components/landing/autorac-section";
import { SpecSection } from "@/components/landing/spec-section";
import { GroundTruthSection } from "@/components/landing/ground-truth-section";
import { CoverageSection } from "@/components/landing/coverage-section";
import { CtaSection } from "@/components/landing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <AtlasSection />
      <RacSection />
      <RacFormat />
      <AutoracSection />
      <SpecSection />
      <GroundTruthSection />
      <CoverageSection />
      <CtaSection />
    </>
  );
}
