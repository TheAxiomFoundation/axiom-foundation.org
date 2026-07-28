"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TraceEntry } from "@/lib/axiom/runtime/trace-map";

/**
 * Shared state for the trace overlay: RunSample (in the rail) posts
 * the run result here; ChunkTraceChips (in the reading column)
 * subscribe and annotate the subsections the computation touched.
 * Server components stay server — this provider wraps them as a slot.
 */

export interface TraceRun {
  jurisdiction: string;
  programId: string;
  period: string | null;
  outputs: Record<string, number | string | boolean | null>;
  trace: TraceEntry[];
}

const TraceRunContext = createContext<{
  run: TraceRun | null;
  setRun: (run: TraceRun | null) => void;
}>({ run: null, setRun: () => {} });

export function TraceProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<TraceRun | null>(null);
  return (
    <TraceRunContext.Provider value={{ run, setRun }}>
      {children}
    </TraceRunContext.Provider>
  );
}

export function useTraceRun() {
  return useContext(TraceRunContext);
}
