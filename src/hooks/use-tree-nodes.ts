"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { TreeNode, TreeResult, BreadcrumbItem } from "@/lib/tree-data";
import {
  getJurisdictionNodes,
  getDocTypeNodes,
  getTitleNodes,
  getSectionNodes,
  getActNodes,
  getChildrenByParentId,
  getRuleById,
  getEncodedPaths,
  buildBreadcrumbs,
  getJurisdiction,
  isUUID,
} from "@/lib/tree-data";
import type { Rule } from "@/lib/supabase";

interface CacheEntry {
  nodes: TreeNode[];
  hasMore: boolean;
}

const MAX_CACHE_ENTRIES = 20;

export function useTreeNodes(segments: string[]) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [leafRule, setLeafRule] = useState<Rule | null>(null);

  const pageRef = useRef(0);
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const encodedPathsRef = useRef<Set<string> | null>(null);

  const segmentsKey = segments.join("/");

  const breadcrumbs: BreadcrumbItem[] = useMemo(
    () => buildBreadcrumbs(segments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segmentsKey]
  );

  useEffect(() => {
    const cached = cache.current.get(segmentsKey);
    if (cached) {
      setNodes(cached.nodes);
      setHasMore(cached.hasMore);
      setLoading(false);
      setLeafRule(null);
      setError(null);
      pageRef.current = 0;
      return;
    }

    fetchNodes(segments, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentsKey]);

  /* v8 ignore start -- async Supabase-dependent fetch logic */
  async function fetchNodes(
    segs: string[],
    pageNum: number,
    append: boolean
  ) {
    setLoading(true);
    setError(null);
    setLeafRule(null);

    try {
      let result: { nodes: TreeNode[]; hasMore: boolean };

      if (segs.length === 0) {
        const fetched = await getJurisdictionNodes();
        result = { nodes: fetched, hasMore: false };
      } else if (segs.length === 1) {
        const jur = getJurisdiction(segs[0]);
        if (jur && jur.hasCitationPaths) {
          const fetched = await getDocTypeNodes(segs[0]);
          result = { nodes: fetched, hasMore: false };
        } else {
          const r: TreeResult = await getActNodes(segs[0], pageNum);
          result = { nodes: r.nodes, hasMore: r.hasMore };
        }
      } else {
        const jur = getJurisdiction(segs[0]);
        if (jur && jur.hasCitationPaths) {
          if (segs.length === 2) {
            const fetched = await getTitleNodes(segs[0], segs[1]);
            result = { nodes: fetched, hasMore: false };
          } else {
            const pathPrefix = segs.join("/");
            // Lazy-load encoded paths once for RAC badge indicators
            if (!encodedPathsRef.current) {
              encodedPathsRef.current = await getEncodedPaths();
            }
            const r: TreeResult = await getSectionNodes(
              pathPrefix,
              pageNum,
              encodedPathsRef.current
            );
            if (r.leafRule) {
              setLeafRule(r.leafRule);
              result = { nodes: [], hasMore: false };
            } else {
              result = { nodes: r.nodes, hasMore: r.hasMore };
            }
          }
        } else {
          const lastSegment = segs[segs.length - 1];
          if (isUUID(lastSegment)) {
            const r: TreeResult = await getChildrenByParentId(
              lastSegment,
              pageNum
            );
            if (r.nodes.length === 0) {
              const rule = await getRuleById(lastSegment);
              setLeafRule(rule);
              result = { nodes: [], hasMore: false };
            } else {
              result = { nodes: r.nodes, hasMore: r.hasMore };
            }
          } else {
            result = { nodes: [], hasMore: false };
          }
        }
      }

      if (append) {
        setNodes((prev) => [...prev, ...result.nodes]);
      } else {
        setNodes(result.nodes);
      }
      setHasMore(result.hasMore);
      pageRef.current = pageNum;

      if (!append) {
        // Evict oldest entries if cache is full
        if (cache.current.size >= MAX_CACHE_ENTRIES) {
          const firstKey = cache.current.keys().next().value;
          if (firstKey !== undefined) cache.current.delete(firstKey);
        }
        cache.current.set(segmentsKey, {
          nodes: result.nodes,
          hasMore: result.hasMore,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }
  /* v8 ignore stop */

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNodes(segments, pageRef.current + 1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, segmentsKey]);

  return { nodes, loading, error, hasMore, loadMore, breadcrumbs, leafRule };
}
