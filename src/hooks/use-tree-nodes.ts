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
import { synthesiseRuleFromCitationPath } from "@/lib/axiom/rulespec/synth-rule";
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
  // Encoded-paths set is jurisdiction-scoped — keyed so a navigation
  // from /us to /us-co doesn't keep filtering against US paths.
  const encodedPathsRef = useRef<{
    jurisdiction: string;
    paths: Set<string>;
  } | null>(null);
  // Incrementing token so a stale fetch (e.g. one issued before the
  // encoded-only filter flipped) cannot overwrite newer state. Any
  // fetch whose token no longer matches ``inflight.current`` is
  // silently dropped on resolution.
  const inflight = useRef(0);

  const cacheKey = `${dbJurisdictionId}/${ruleSegments.join("/")}${encodedOnly ? ":encoded" : ""}`;

  useEffect(() => {
    // Invalidate any in-flight fetch for the previous cacheKey —
    // its result is no longer relevant.
    inflight.current += 1;

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
    const token = ++inflight.current;
    setLoading(true);
    setError(null);

    try {
      // Intermediate data — don't touch React state until we've
      // confirmed the token is still current. Otherwise a fetch
      // issued before a filter toggle can blank setLeafRule / clear
      // setCurrentRule after the fresh fetch has already populated
      // them, which is exactly the "button lit but list unfiltered"
      // glitch users hit.
      let result: {
        nodes: TreeNode[];
        hasMore: boolean;
        currentRule?: Rule | null;
        leafRule?: Rule | null;
      };

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
        // Lazy-load (or refresh) the encoded-paths index for this
        // jurisdiction. The ref is keyed on ``dbJurisdictionId`` so a
        // navigation across jurisdictions doesn't leak the previous
        // jurisdiction's encoded set into the current filter.
        if (
          !encodedPathsRef.current ||
          encodedPathsRef.current.jurisdiction !== dbJurisdictionId
        ) {
          const paths = await getEncodedPaths(dbJurisdictionId);
          encodedPathsRef.current = { jurisdiction: dbJurisdictionId, paths };
        }
        const encodedPaths = encodedPathsRef.current.paths;

        if (segs.length === 1) {
          // Doc type selected, show titles.
          const fetched = await getTitleNodes(
            dbJurisdictionId,
            segs[0],
            encodedPaths,
            encodedOnly
          );
          result = { nodes: fetched, hasMore: false };
        } else {
          // Deep navigation via citation path.
          const pathPrefix = `${dbJurisdictionId}/${segs.join("/")}`;
          const r: TreeResult = await getSectionNodes(
            pathPrefix,
            pageNum,
            encodedPaths,
            encodedOnly
          );
          if (r.leafRule) {
            result = {
              nodes: [],
              hasMore: false,
              leafRule: r.leafRule,
            };
          } else if (
            r.nodes.length === 0 &&
            !r.currentRule &&
            segs.length >= 2
          ) {
            // No corpus row at this depth. The corpus is still being
            // backfilled with deeper US citations, but the rules-*
            // repos already carry the encodings — synth a leaf so
            // the standard rule-detail layout can render them under
            // the canonical /axiom/<citation> URL.
            const synth = await synthesiseRuleFromCitationPath(
              dbJurisdictionId,
              pathPrefix
            );
            if (synth) {
              result = { nodes: [], hasMore: false, leafRule: synth };
            } else {
              result = {
                nodes: r.nodes,
                hasMore: r.hasMore,
                currentRule: r.currentRule ?? null,
              };
            }
          } else {
            result = {
              nodes: r.nodes,
              hasMore: r.hasMore,
              currentRule: r.currentRule ?? null,
            };
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
            result = { nodes: [], hasMore: false, leafRule: rule };
          } else {
            result = { nodes: r.nodes, hasMore: r.hasMore };
          }
        } else {
          result = { nodes: [], hasMore: false };
        }
      }

      // Drop the result if a newer fetch has been issued (e.g. the
      // user toggled "Encoded only" mid-flight, or navigated).
      if (token !== inflight.current) return;

      if (append) {
        setNodes((prev) => [...prev, ...result.nodes]);
      } else {
        setNodes(result.nodes);
      }
      setLeafRule(result.leafRule ?? null);
      setCurrentRule(result.currentRule ?? null);
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
      if (token !== inflight.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      if (token === inflight.current) setLoading(false);
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
