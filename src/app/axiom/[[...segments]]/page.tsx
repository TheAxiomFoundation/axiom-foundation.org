import type { Metadata } from "next";
import {
  buildLegislationJsonLd,
  getAxiomRuleMetadata,
} from "@/lib/axiom/metadata";
import { resolveAxiomPath } from "@/lib/tree-data";
import {
  treeNodesCacheKey,
  type InitialTreeNodesState,
} from "@/lib/axiom/tree-cache";
import { loadTreeNodes } from "@/lib/axiom/tree-node-loader";
import { AxiomClient } from "./axiom-client";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
}

const INITIAL_TREE_STATE_TIMEOUT_MS = 1500;

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
  const [meta, initialTreeState] = await Promise.all([
    getAxiomRuleMetadata(segments),
    getInitialTreeState(segments ?? []),
  ]);
  const jsonLd = buildLegislationJsonLd(meta);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AxiomClient
        segments={segments ?? []}
        initialTreeState={initialTreeState}
      />
    </>
  );
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

async function getInitialTreeState(
  segments: string[]
): Promise<InitialTreeNodesState | null> {
  const decodedSegments = segments.map(decodeSegment);
  const resolved = resolveAxiomPath(decodedSegments);
  if (resolved.phase !== "rule" || !resolved.jurisdiction) {
    return null;
  }

  const {
    jurisdiction: { slug, hasCitationPaths },
    ruleSegments,
  } = resolved;
  const cacheKey = treeNodesCacheKey(slug, ruleSegments, false);

  const result = await withTimeout(
    loadTreeNodes({
      dbJurisdictionId: slug,
      ruleSegments,
      hasCitationPaths,
      encodedOnly: false,
      page: 0,
    }),
    INITIAL_TREE_STATE_TIMEOUT_MS,
    null
  );
  if (!result) return null;

  return {
    cacheKey,
    nodes: result.nodes,
    hasMore: result.hasMore,
    currentRule: result.currentRule ?? null,
    leafRule: result.leafRule ?? null,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}
