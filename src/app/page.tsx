import { Hero } from "@/components/landing/hero";
import { EncodingMarquee } from "@/components/landing/encoding-marquee";
import { TheGapSection } from "@/components/landing/the-gap-section";
import { EncodedLawSection } from "@/components/landing/encoded-law-section";
import { EncoderSection } from "@/components/landing/encoder-section";
import { ApplicationsSection } from "@/components/landing/applications-section";
import { FoundationSection } from "@/components/landing/foundation-section";
import { CitationNetwork3D } from "@/components/landing/citation-network-3d";

export default function Home() {
  return (
    <>
      <CitationNetwork3D />
      <Hero />
      <EncodingMarquee />
      <TheGapSection />
      <EncodedLawSection />
      <EncoderSection />
      <ApplicationsSection />
      <FoundationSection />
    </>
  );
}
