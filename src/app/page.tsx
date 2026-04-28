import { Hero } from "@/components/landing/hero";
import { AxiomSection } from "@/components/landing/axiom-section";
import { RuleSpecSection } from "@/components/landing/rulespec-section";
import { RuleSpecFormat } from "@/components/landing/rulespec-format";
import { EncoderSection } from "@/components/landing/encoder-section";
import { SpecSection } from "@/components/landing/spec-section";
import { GroundTruthSection } from "@/components/landing/ground-truth-section";
import { CoverageSection } from "@/components/landing/coverage-section";
import { CtaSection } from "@/components/landing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <AxiomSection />
      <RuleSpecSection />
      <RuleSpecFormat />
      <EncoderSection />
      <SpecSection />
      <GroundTruthSection />
      <CoverageSection />
      <CtaSection />
    </>
  );
}
