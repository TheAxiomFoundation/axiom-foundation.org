"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";
import { useTraceRun, type TraceRun } from "./trace-context";

interface RunResponse {
  outputs: Record<string, number | string | boolean | null>;
  trace: TraceRun["trace"];
  period: string | null;
  sample: boolean;
}

function formatValue(value: number | string | boolean | null): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

function runParamFor(program: ProvisionProgramCoverage): string {
  return `${program.jurisdiction}/${program.programId}`;
}

/** Reflect the active run in the URL so the computation is shareable;
 *  ?run=us-co/co-snap re-executes the sample on load. */
function syncRunParam(value: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value) url.searchParams.set("run", value);
  else url.searchParams.delete("run");
  window.history.replaceState({}, "", url.toString());
}

/**
 * F2: execute a program's canonical sample household through the
 * hosted engine. Outputs render in the rail; the trace is published
 * to TraceProvider so the reading column lights up the subsections
 * that produced values; the run is URL-addressable via ?run=.
 */
export function RunSample({
  programs,
  sectionFocus,
}: {
  /** The family group's runnable programs; the first is the default,
   *  and a ?run= permalink can select any of them. */
  programs: ProvisionProgramCoverage[];
  /** File-legal-id prefix of the section being read
   *  ("us:statutes/7/2017"), for marking outputs it produced. */
  sectionFocus: string | null;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [activeProgram, setActiveProgram] =
    useState<ProvisionProgramCoverage | null>(null);
  const { setRun } = useTraceRun();
  const autoRan = useRef(false);
  const program = activeProgram ?? programs[0];

  const runProgram = useCallback(async (target: ProvisionProgramCoverage) => {
    setActiveProgram(target);
    setRunning(true);
    setError(false);
    try {
      const response = await fetch("/api/axiom/runtime/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jurisdiction: target.jurisdiction,
          program_id: target.programId,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as RunResponse;
      setResult(data);
      setRun({
        jurisdiction: target.jurisdiction,
        programId: target.programId,
        period: data.period,
        outputs: data.outputs,
        trace: data.trace,
      });
      syncRunParam(runParamFor(target));
    } catch {
      setError(true);
    } finally {
      setRunning(false);
    }
  }, [setRun]);

  // ?run=<jurisdiction>/<program> permalinks re-execute on load —
  // whichever program in this family the param names.
  useEffect(() => {
    if (autoRan.current || typeof window === "undefined") return;
    const requested = new URL(window.location.href).searchParams.get("run");
    const match = programs.find(
      (candidate) => requested === runParamFor(candidate)
    );
    if (match) {
      autoRan.current = true;
      void runProgram(match);
    }
  }, [programs, runProgram]);

  const clear = () => {
    setResult(null);
    setActiveProgram(null);
    setRun(null);
    syncRunParam(null);
  };

  const fromThisSection = (variable: string): boolean => {
    if (!sectionFocus || !result) return false;
    const entry = result.trace.find((item) => item.variable === variable);
    return Boolean(
      entry?.sources.some((source) => {
        const file = source.split("#")[0];
        return file === sectionFocus || file.startsWith(`${sectionFocus}/`);
      })
    );
  };

  return (
    <div data-testid="run-sample" className="mt-1.5">
      {!result && program && (
        <button
          type="button"
          onClick={() => runProgram(program)}
          disabled={running}
          data-testid="run-sample-button"
          className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)] hover:underline disabled:cursor-default disabled:text-[var(--color-ink-muted)]"
        >
          {running
            ? "running…"
            : `run sample household · ${program.jurisdiction} ▶`}
        </button>
      )}
      {error && (
        <p className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
          run failed — engine unavailable
        </p>
      )}
      {result && (
        <div
          data-testid="run-sample-result"
          className="mt-1.5 rounded-sm border border-[var(--color-rule)] p-2"
        >
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              sample household · {program.jurisdiction}
              {result.period ? ` · ${result.period}` : ""}
            </span>
            <button
              type="button"
              onClick={clear}
              className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[10px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              title="Clear result"
            >
              ×
            </button>
          </div>
          <dl className="m-0 space-y-1">
            {Object.entries(result.outputs).map(([name, value]) => (
              <div key={name} className="flex items-baseline justify-between gap-2">
                <dt className="min-w-0 truncate font-mono text-[11px] text-[var(--color-ink-secondary)]">
                  {name}
                  {fromThisSection(name) && (
                    <span
                      title="Computed by rules from this section"
                      className="ml-1 text-[var(--color-accent)]"
                    >
                      § here
                    </span>
                  )}
                </dt>
                <dd className="m-0 shrink-0 font-mono text-[11px] font-semibold text-[var(--color-ink)]">
                  {formatValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
