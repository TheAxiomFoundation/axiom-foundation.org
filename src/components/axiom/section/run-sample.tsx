"use client";

import { useState } from "react";
import type { ProvisionProgramCoverage } from "@/lib/axiom/runtime/coverage";

interface RunResponse {
  outputs: Record<string, number | string | boolean | null>;
  trace: Array<{
    rule_id: string;
    variable: string;
    value: number | string | boolean | null;
    sources: string[];
  }>;
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

/**
 * F2 slice 0: execute a program's canonical sample household through
 * the hosted engine and show its default outputs in the rail. Each
 * output that traces back to the section being read gets a "§ here"
 * marker — the seed of the full trace overlay.
 */
export function RunSample({
  program,
  sectionFocus,
}: {
  program: ProvisionProgramCoverage;
  /** File-legal-id prefix of the section being read
   *  ("us:statutes/7/2017"), for marking outputs it produced. */
  sectionFocus: string | null;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);

  const run = async () => {
    setRunning(true);
    setError(false);
    try {
      const response = await fetch("/api/axiom/runtime/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jurisdiction: program.jurisdiction,
          program_id: program.programId,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setResult((await response.json()) as RunResponse);
    } catch {
      setError(true);
    } finally {
      setRunning(false);
    }
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
      {!result && (
        <button
          type="button"
          onClick={run}
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
              onClick={() => setResult(null)}
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
