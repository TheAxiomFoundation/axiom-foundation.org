import type { Metadata } from "next";
import {
  buildLegislationJsonLd,
  getAxiomRuleMetadata,
} from "@/lib/axiom/metadata";
import { AxiomClient } from "./axiom-client";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { segments } = await params;
  const meta = await getAxiomRuleMetadata(segments);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonicalUrl },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.canonicalUrl,
      type: "article",
      siteName: "Axiom · Axiom Foundation",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function AxiomPage({ params }: PageProps) {
  const { segments } = await params;
  const meta = await getAxiomRuleMetadata(segments);
  const jsonLd = buildLegislationJsonLd(meta);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AxiomClient segments={segments ?? []} />
    </>
  );
}
