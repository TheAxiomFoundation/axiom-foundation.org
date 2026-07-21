"use client";

import { useEffect } from "react";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";
import { useRunProgram, runParamFor } from "./use-run-program";

function formatValue(value: number | string | boolean | null): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

/**
 * Params already auto-executed this page load. Module-level on
 * purpose: RunSample unmounts/remounts as the rail's scroll-spy
 * flips between overview and node views, so a per-mount ref would
 * re-fire the engine call on every scroll transition.
 */
const attemptedRuns = new Set<string>();

/** Test hook: module-level state must reset between test mounts. */
export function _resetAttemptedRuns() {
  attemptedRuns.clear();
}

/**
 * The rail's run panel: executes ?run= permalinks once per page load
 * and renders the active run's outputs. The run itself lives in the
 * trace context (shared with the header strip's Run button), so it
 * survives the rail's overview/node remounts and lights up the
 * reading column either way.
 */
export function RunSample({
  programs,
  sectionFocus,
  sectionRuleIds = [],
}: {
  /** The family group's runnable programs; a ?run= permalink can
   *  select any of them. */
  programs: ProvisionProgramCoverage[];
  /** File-legal-id prefix of the section being read
   *  ("us:statutes/7/2017"), for marking outputs it produced. */
  sectionFocus: string | null;
  /** Durable legal ids traced with permalink runs. */
  sectionRuleIds?: string[];
}) {
  const { run, runProgram, clearRun, running, error } = useRunProgram();
  const activeProgram = programs.find(
    (candidate) =>
      run &&
      candidate.jurisdiction === run.jurisdiction &&
      candidate.programId === run.programId
  );
  const contextRun = activeProgram ? run : null;

  // attemptedRuns is module-level, so it outlives client-side route
  // changes — back/forward to a ?run= URL would otherwise silently
  // skip the re-run the URL promises. History navigation resets it.
  useEffect(() => {
    const reset = () => attemptedRuns.clear();
    window.addEventListener("popstate", reset);
    return () => window.removeEventListener("popstate", reset);
  }, []);

  // ?run=<jurisdiction>/<program> permalinks execute once per page
  // load — whichever program in this family the param names. The
  // context run guards against remount re-execution; attemptedRuns
  // additionally stops failure retry loops.
  useEffect(() => {
    if (typeof window === "undefined" || contextRun) return;
    const requested = new URL(window.location.href).searchParams.get("run");
    if (!requested || attemptedRuns.has(requested)) return;
    const match = programs.find(
      (candidate) => requested === runParamFor(candidate)
    );
    if (match) {
      attemptedRuns.add(requested);
      void runProgram(match, sectionRuleIds);
    }
  }, [programs, runProgram, contextRun, sectionRuleIds]);

  const clear = () => {
    if (activeProgram) {
      attemptedRuns.delete(runParamFor(activeProgram));
    }
    clearRun();
  };

  const fromThisSection = (variable: string): boolean => {
    if (!sectionFocus || !contextRun) return false;
    const entry = contextRun.trace.find((item) => item.variable === variable);
    return Boolean(
      entry?.sources.some((source) => {
        const file = source.split("#")[0];
        return file === sectionFocus || file.startsWith(`${sectionFocus}/`);
      })
    );
  };

  if (!contextRun && !running && !error) return null;

  return (
    <div data-testid="run-sample" className="mt-1.5">
      {running && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          running sample household…
        </p>
      )}
      {error && (
        <p className="mt-1 font-mono text-[10px] text-[var(--color-ink-muted)]">
          run failed — engine unavailable
        </p>
      )}
      {contextRun && (
        <div
          data-testid="run-sample-result"
          className="mt-1.5 rounded-sm border border-[var(--color-rule)] p-2"
        >
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
              sample household · {contextRun.jurisdiction}
              {contextRun.period ? ` · ${contextRun.period}` : ""}
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
            {Object.entries(contextRun.outputs)
              .filter(([name]) => !name.includes(":"))
              .map(([name, value]) => (
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
