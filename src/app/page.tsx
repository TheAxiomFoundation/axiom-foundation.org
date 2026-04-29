import { Hero } from "@/components/landing/hero";
import { TheGapSection } from "@/components/landing/the-gap-section";
import { EncodedLawSection } from "@/components/landing/encoded-law-section";
import { EncoderSection } from "@/components/landing/encoder-section";
import { ApplicationsSection } from "@/components/landing/applications-section";
import { FoundationSection } from "@/components/landing/foundation-section";

export default function Home() {
  return (
    <>
      <Hero />
      <TheGapSection />
      <EncodedLawSection />
      <EncoderSection />
      <ApplicationsSection />
      <FoundationSection />
    </>
  );
}
