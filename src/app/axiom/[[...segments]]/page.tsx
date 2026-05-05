import type { Metadata } from "next";
import {
  buildLegislationJsonLd,
  getAxiomRuleMetadata,
} from "@/lib/axiom/metadata";
import {
  getActNodes,
  getDocTypeNodes,
  getTitleNodes,
  resolveAxiomPath,
} from "@/lib/tree-data";
import {
  treeNodesCacheKey,
  type InitialTreeNodesState,
} from "@/lib/axiom/tree-cache";
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

  if (ruleSegments.length === 0) {
    if (hasCitationPaths) {
      const nodes = await withTimeout(
        getDocTypeNodes(slug),
        INITIAL_TREE_STATE_TIMEOUT_MS,
        null
      );
      if (!nodes) return null;
      return {
        cacheKey,
        nodes,
        hasMore: false,
        currentRule: null,
        leafRule: null,
      };
    }

    const result = await getActNodes(slug, 0);
    return {
      cacheKey,
      nodes: result.nodes,
      hasMore: result.hasMore,
      currentRule: null,
      leafRule: null,
    };
  }

  if (hasCitationPaths && ruleSegments.length === 1) {
    const nodes = await withTimeout(
      getTitleNodes(slug, ruleSegments[0], undefined, false),
      INITIAL_TREE_STATE_TIMEOUT_MS,
      null
    );
    if (!nodes) return null;
    return {
      cacheKey,
      nodes,
      hasMore: false,
      currentRule: null,
      leafRule: null,
    };
  }

  return null;
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
