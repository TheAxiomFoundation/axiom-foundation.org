import { Hero } from "@/components/landing/hero";
import { AxiomSection } from "@/components/landing/axiom-section";
import { RuleSpecSection } from "@/components/landing/rulespec-section";
import { RuleSpecFormat } from "@/components/landing/rulespec-format";
import { AutoRuleSpecSection } from "@/components/landing/autorulespec-section";
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
      <AutoRuleSpecSection />
      <SpecSection />
      <GroundTruthSection />
      <CoverageSection />
      <CtaSection />
    </>
  );
}
