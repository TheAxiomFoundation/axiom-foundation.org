"use client";

import { useCallback, useState } from "react";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";
import { trackAxiomEvent } from "@/lib/analytics";
import { useTraceRun, type TraceRun } from "./trace-context";

interface RunResponse {
  outputs: TraceRun["outputs"];
  trace: TraceRun["trace"];
  period: string | null;
  sample: boolean;
}

export function runParamFor(program: ProvisionProgramCoverage): string {
  return `${program.jurisdiction}/${program.programId}`;
}

/** Reflect the active run in the URL so the computation is shareable;
 *  ?run=us-co/co-snap re-executes the sample on load. */
export function syncRunParam(value: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value) url.searchParams.set("run", value);
  else url.searchParams.delete("run");
  window.history.replaceState({}, "", url.toString());
}

/**
 * Execute a program's canonical sample household through the hosted
 * engine and publish the result to the trace context — shared by the
 * header action strip's Run button and the rail's permalink executor
 * so both drive one run state.
 */
export function useRunProgram() {
  const [running, setRunning] = useState(false);
  // "uncertified" is the certified-serving refusal (422) — a state
  // about the program, not an outage — so consumers can say so.
  const [error, setError] = useState<false | "generic" | "uncertified">(
    false
  );
  const { run, setRun } = useTraceRun();

  const runProgram = useCallback(
    async (
      target: ProvisionProgramCoverage,
      sectionRuleIds: string[] = []
    ) => {
      setRunning(true);
      setError(false);
      const track = (outcome: "ok" | "error" | "refused") =>
        trackAxiomEvent("axiom_run_executed", {
          program_id: target.programId,
          jurisdiction: target.jurisdiction,
          outcome,
          surface: "reader",
        });
      try {
        const response = await fetch("/api/axiom/runtime/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jurisdiction: target.jurisdiction,
            program_id: target.programId,
            section_rules: sectionRuleIds,
          }),
        });
        if (response.status === 422) {
          setError("uncertified");
          track("refused");
          return;
        }
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as RunResponse;
        setRun({
          jurisdiction: target.jurisdiction,
          programId: target.programId,
          period: data.period,
          outputs: data.outputs,
          trace: data.trace,
        });
        syncRunParam(runParamFor(target));
        track("ok");
      } catch {
        setError("generic");
        track("error");
      } finally {
        setRunning(false);
      }
    },
    [setRun]
  );

  const clearRun = useCallback(() => {
    setRun(null);
    syncRunParam(null);
  }, [setRun]);

  return { run, runProgram, clearRun, running, error };
}
