/**
 * One loader for every surface that mirrors the corpus (the landing
 * field, the viewer's subtree picker): the live rulespec mirror
 * first, the committed census snapshot as ballast.
 *
 * The live endpoint (`/api/axiom/corpus/subtrees`, proxying the
 * API's GET /v1/corpus/subtrees) lists every subtree the mirror
 * serves — but carries no sizes, so the snapshot supplies
 * ruleCount/importCount for the targets it knows (new targets get a
 * default dot). If the endpoint fails in any way, the snapshot IS
 * the corpus: the field must never be empty.
 */

import {
  mergeLiveSubtrees,
  type CorpusModule,
  type CorpusSource,
  type LiveSubtree,
} from "./corpus-field";

const LIVE_TIMEOUT_MS = 6000;

export interface LoadedCorpus {
  modules: CorpusModule[];
  source: CorpusSource;
}

async function fetchLiveSubtrees(): Promise<LiveSubtree[] | null> {
  try {
    const response = await fetch("/api/axiom/corpus/subtrees", {
      signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const envelope = (await response.json()) as {
      status?: string;
      data?: { count?: number; subtrees?: LiveSubtree[] };
    };
    const subtrees = envelope.data?.subtrees;
    if (envelope.status !== "ok" || !Array.isArray(subtrees)) return null;
    const valid = subtrees.filter(
      (item): item is LiveSubtree =>
        typeof item?.target === "string" &&
        typeof item?.jurisdiction === "string" &&
        typeof item?.bucket === "string",
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

export async function loadCorpusModules(): Promise<LoadedCorpus> {
  // The snapshot ships as its own cached chunk (~590 KB), never
  // inline; it is needed either way (sizes when live, everything
  // when not).
  const snapshot = (await import("./corpus-subtrees.json")).default
    .modules as CorpusModule[];
  const live = await fetchLiveSubtrees();
  if (live) {
    return { modules: mergeLiveSubtrees(snapshot, live), source: "live" };
  }
  return { modules: snapshot, source: "snapshot" };
}
