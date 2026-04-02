"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TreeNode, TreeResult } from "@/lib/tree-data";
import {
  getDocTypeNodes,
  getTitleNodes,
  getSectionNodes,
  getActNodes,
  getChildrenByParentId,
  getRuleById,
  getEncodedPaths,
  isUUID,
} from "@/lib/tree-data";
import type { Rule } from "@/lib/supabase";

interface CacheEntry {
  nodes: TreeNode[];
  hasMore: boolean;
  currentRule: Rule | null;
}

const MAX_CACHE_ENTRIES = 20;

/**
 * Fetch tree nodes for a resolved jurisdiction.
 * Receives pre-resolved jurisdiction info — no longer dispatches on jurisdiction segments.
 */
export function useTreeNodes(
  dbJurisdictionId: string,
  ruleSegments: string[],
  hasCitationPaths: boolean,
  encodedOnly: boolean = false
) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [leafRule, setLeafRule] = useState<Rule | null>(null);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);

  const pageRef = useRef(0);
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const encodedPathsRef = useRef<Set<string> | null>(null);

  const cacheKey = `${dbJurisdictionId}/${ruleSegments.join("/")}${encodedOnly ? ":encoded" : ""}`;

  useEffect(() => {
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setNodes(cached.nodes);
      setHasMore(cached.hasMore);
      setCurrentRule(cached.currentRule);
      setLoading(false);
      setLeafRule(null);
      setError(null);
      pageRef.current = 0;
      return;
    }

    fetchNodes(ruleSegments, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  /* v8 ignore start -- async Supabase-dependent fetch logic */
  async function fetchNodes(
    segs: string[],
    pageNum: number,
    append: boolean
  ) {
    setLoading(true);
    setError(null);
    setLeafRule(null);
    setCurrentRule(null);

    try {
      let result: { nodes: TreeNode[]; hasMore: boolean };

      if (segs.length === 0) {
        // Root of jurisdiction: show doc types or acts
        if (hasCitationPaths) {
          const fetched = await getDocTypeNodes(dbJurisdictionId);
          result = { nodes: fetched, hasMore: false };
        } else {
          const r: TreeResult = await getActNodes(dbJurisdictionId, pageNum);
          result = { nodes: r.nodes, hasMore: r.hasMore };
        }
      } else if (hasCitationPaths) {
        if (segs.length === 1) {
          // Doc type selected, show titles
          // Lazy-load encoded paths for filtering
          if (!encodedPathsRef.current) {
            encodedPathsRef.current = await getEncodedPaths();
          }
          const fetched = await getTitleNodes(
            dbJurisdictionId,
            segs[0],
            encodedPathsRef.current,
            encodedOnly
          );
          result = { nodes: fetched, hasMore: false };
        } else {
          // Deep navigation via citation path
          const pathPrefix = `${dbJurisdictionId}/${segs.join("/")}`;
          // Lazy-load encoded paths once for RAC badge indicators
          if (!encodedPathsRef.current) {
            encodedPathsRef.current = await getEncodedPaths();
          }
          const r: TreeResult = await getSectionNodes(
            pathPrefix,
            pageNum,
            encodedPathsRef.current,
            encodedOnly
          );
          if (r.leafRule) {
            setLeafRule(r.leafRule);
            result = { nodes: [], hasMore: false };
          } else {
            setCurrentRule(r.currentRule ?? null);
            result = { nodes: r.nodes, hasMore: r.hasMore };
          }
        }
      } else {
        // Non-citation-path jurisdiction: navigate by parent_id (UUID)
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
        cache.current.set(cacheKey, {
          nodes: result.nodes,
          hasMore: result.hasMore,
          currentRule: result.currentRule ?? null,
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
      fetchNodes(ruleSegments, pageRef.current + 1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, cacheKey]);

  return { nodes, loading, error, hasMore, loadMore, leafRule, currentRule };
}
