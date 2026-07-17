import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  buildLegislationJsonLd,
  getAxiomRuleMetadata,
} from "@/lib/axiom/metadata";
import { getSectionPageData } from "@/lib/axiom/section-page";
import { SectionReader } from "@/components/axiom/section/section-reader";
import {
  getBrowsePageData,
  MAX_BROWSE_SEGMENTS,
} from "@/lib/axiom/browse-page";
import { BrowseView } from "@/components/axiom/section/browse-view";

/**
 * v2 section reader — the first server-rendered surface of the app
 * rebuild. Renders a provision and its whole subtree as one reading
 * column (single-column reader + sticky TOC), instead of the
 * client-monolith tree browser.
 *
 * Preview route: kept noindex with a canonical pointing at the v1
 * URL until it replaces the v1 rule page as the canonical statute
 * surface.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ segments: string[] }>;
}

function decodeSegments(segments: string[]): string[] {
  return segments.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { segments } = await params;
  const decoded = decodeSegments(segments);
  if (decoded.length <= MAX_BROWSE_SEGMENTS) {
    return {
      title: `${decoded.join("/")} · Axiom`,
      robots: { index: false, follow: true },
    };
  }
  const meta = await getAxiomRuleMetadata(decoded);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonicalUrl },
    // Launch flip: the whole /axiom subtree is noindexed until the
    // Jul 28 reveal (see src/app/axiom/layout.tsx).
    robots: { index: false, follow: true },
  };
}

export default async function SectionPage({ params }: PageProps) {
  const { segments } = await params;
  const decoded = decodeSegments(segments);

  // Browse depth (jurisdiction / doc type / title) renders the list
  // view; section depth and deeper renders the reader.
  if (decoded.length <= MAX_BROWSE_SEGMENTS) {
    const browse = await getBrowsePageData(decoded);
    if (!browse) notFound();
    return <BrowseView data={browse} />;
  }

  const [data, meta] = await Promise.all([
    getSectionPageData(decoded),
    getAxiomRuleMetadata(decoded),
  ]);
  if (!data) notFound();

  const jsonLd = buildLegislationJsonLd(meta);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense>
        <SectionReader data={data} />
      </Suspense>
    </>
  );
}
