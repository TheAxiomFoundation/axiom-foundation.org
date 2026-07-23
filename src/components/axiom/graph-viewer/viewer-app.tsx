"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  InteractiveRuleGraph,
  type IrgNodeData,
} from "./InteractiveRuleGraph";
import { axiomAppUrl, fileLegalIdOf, humanizeCitation } from "./citations";
import "./styles.css";
import "./graph-styles.css";
import "./plane.css";
import {
  countriesFromPrograms,
  PREFERRED_DEFAULT_PROGRAM_KEY,
  countryLabel,
  countryOf,
  countryShortLabel,
  defaultOutputsForProgram,
  displayNameForProgram,
  fetchAllPrograms,
  fetchComposedGraph,
  fetchProgramGraph,
  programKey,
  programRefFromSummary,
  summaryForProgram,
} from "./api";
import type { Country, DashboardSpec, LegalId, ParameterRule, ProgramGraph, ProgramRef, ProgramSummary, RuleNode, TraceNode } from "./types";

export function GraphViewerApp() {
  const [allPrograms, setAllPrograms] = useState<ProgramSummary[]>([]);
  const [country, setCountry] = useState<Country>(() => initialCountry());
  const [program, setProgram] = useState<ProgramRef | null>(null);
  const [graph, setGraph] = useState<ProgramGraph | null>(null);
  const [selectedOutputs, setSelectedOutputs] = useState<LegalId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [outputSearch, setOutputSearch] = useState("");
  // ── The Plane: scenario → run → execution overlay ──
  // Scenario values keyed by input bare name; seeded from the graph's
  // sample values when a program loads, editable in the panel.
  const [scenario, setScenario] = useState<Record<string, number | boolean>>(
    {},
  );
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<IrgNodeData | null>(null);
  const [runResult, setRunResult] = useState<{
    outputs: Record<string, number | string | boolean | null>;
    trace: Array<{ variable: string; value: unknown }>;
  } | null>(null);
  // Deep-link params, consumed once: ?program=us-co/co-snap selects a
  // program as soon as the registry loads; ?focus=us:statutes/7/2017
  // pre-selects the rules whose fileLegalId sits at or under that
  // prefix, so an external link (e.g. an Axiom app section page) lands
  // on the subgraph for the provision the reader came from.
  const [requestedProgramKey, setRequestedProgramKey] = useState<
    string | null
  >(() => initialParam("program"));
  const pendingFocusRef = useRef<string | null>(initialParam("focus"));
  // The entry launcher: a cold arrival (no deep link) opens with
  // "what law do you want to run?" instead of a bare canvas. Picking
  // a program dissolves the launcher into the graph.
  const [launcher, setLauncher] = useState<"open" | "leaving" | "closed">(
    () =>
      typeof window !== "undefined" &&
      !new URL(window.location.href).searchParams.get("program") &&
      !new URL(window.location.href).searchParams.get("focus") &&
      !new URL(window.location.href).searchParams.get("compose")
        ? "open"
        : "closed",
  );
  const dismissLauncher = () => {
    setLauncher("leaving");
    window.setTimeout(() => setLauncher("closed"), 420);
  };
  // ?compose=us:regulations/47-cfr/54/403[#rule] renders a graph composed
  // on demand from the encodings mirror — for law that is encoded but not
  // yet inside any compiled program package. Choosing a program or
  // country exits compose mode back to the package registry.
  const [composeFocus, setComposeFocus] = useState<string | null>(() =>
    initialParam("compose"),
  );
  const [composedFiles, setComposedFiles] = useState<LegalId[]>([]);
  const [composedTruncated, setComposedTruncated] = useState(false);

  // Load the full program registry once; countries and the per-country program
  // list are derived from it, so a newly compiled program appears here with no
  // code change.
  useEffect(() => {
    let cancelled = false;
    setProgramsLoading(true);
    fetchAllPrograms()
      .then((programs) => {
        if (!cancelled) setAllPrograms(programs);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setProgramsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const composedProgram = useMemo<ProgramRef | null>(() => {
    if (!composeFocus) return null;
    return {
      jurisdiction: composeFocus.split(":")[0] ?? "us",
      programId: "composed",
      displayName: composeFocus.split("#")[0] ?? composeFocus,
    };
  }, [composeFocus]);
  const effectiveProgram = program ?? composedProgram;

  // Editable scenario fields. Programs with a known lever vocabulary
  // get a curated set (the abstract household keys the API's mapping
  // layer computes from — verified live); everything else falls back
  // to the graph's own scalar inputs.
  const scenarioFields = useMemo(() => {
    const programId = effectiveProgram?.programId ?? "";
    if (programId.includes("snap")) {
      return [
        { name: "household_size", label: "household_size", sample: 2 },
        {
          name: "snap_gross_monthly_income",
          label: "snap_gross_monthly_income",
          sample: 1200,
        },
        { name: "shelter_costs", label: "shelter_costs", sample: 900 },
        { name: "age", label: "age", sample: 40 },
      ] as Array<{ name: string; label: string; sample: number | boolean }>;
    }
    const fields: Array<{
      name: string;
      label: string;
      sample: number | boolean;
    }> = [];
    const seen = new Set<string>();
    for (const input of graph?.inputs ?? []) {
      if (seen.has(input.name)) continue;
      const sample = input.sample;
      if (typeof sample !== "number" && typeof sample !== "boolean") continue;
      seen.add(input.name);
      fields.push({ name: input.name, label: input.name, sample });
    }
    return fields.slice(0, 16);
  }, [graph, effectiveProgram]);

  useEffect(() => {
    setScenario(
      Object.fromEntries(
        scenarioFields.map((field) => [field.name, field.sample]),
      ),
    );
    setRunResult(null);
    setRunError(null);
  }, [scenarioFields]);

  const runScenario = async () => {
    if (!effectiveProgram || running) return;
    setRunning(true);
    setRunError(null);
    try {
      // Trace the selected outputs plus their reachable rules so the
      // execution lights intermediate nodes, not just the results.
      // Derived rules only — asking the engine to trace a parameter
      // fails the whole run ("unknown derived output").
      const reachable = new Set<string>();
      const byId = new Map((graph?.rules ?? []).map((r) => [r.legalId, r]));
      const walk = (id: string) => {
        if (reachable.has(id) || reachable.size > 60) return;
        const rule = byId.get(id);
        if (!rule) return;
        if (rule.kind === "derived") reachable.add(id);
        for (const dep of rule.ruleDeps) walk(dep);
      };
      for (const id of selectedOutputs) walk(id);
      const attempt = (variables: string[]) =>
        fetch("/api/axiom/runtime/calculate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jurisdiction: effectiveProgram.jurisdiction,
            program_id: effectiveProgram.programId,
            values: scenario,
            variables,
          }),
        });
      let response = await attempt([...reachable].slice(0, 32));
      if (!response.ok && reachable.size > 0) {
        // A rejected trace variable fails the whole run — fall back
        // to the outputs alone rather than failing the scenario.
        response = await attempt([]);
      }
      if (!response.ok) throw new Error(`run failed (${response.status})`);
      const data = (await response.json()) as {
        outputs: Record<string, number | string | boolean | null>;
        trace: Array<{ variable: string; value: unknown }>;
      };
      setRunResult(data);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "run failed");
    } finally {
      setRunning(false);
    }
  };

  const countries = useMemo(() => countriesFromPrograms(allPrograms), [allPrograms]);
  const programs = useMemo(
    () => allPrograms.filter((item) => countryOf(item.jurisdiction) === country),
    [allPrograms, country],
  );

  useEffect(() => {
    syncCountryToUrl(country);
  }, [country]);

  // Keep the country/program selection valid as the registry loads or the
  // country changes: snap to an existing country, then default to its first
  // program when none is selected.
  useEffect(() => {
    // Compose mode owns the graph; don't auto-select a package program
    // underneath it.
    if (composeFocus) return;
    if (allPrograms.length === 0) return;
    // A ?program= deep link wins once, as soon as the registry can
    // resolve it; the country snaps to the program's.
    if (requestedProgramKey) {
      const requested = allPrograms.find(
        (item) => programKey(item) === requestedProgramKey,
      );
      setRequestedProgramKey(null);
      if (requested) {
        const requestedCountry = countryOf(requested.jurisdiction);
        if (requestedCountry !== country) setCountry(requestedCountry);
        setProgram(programRefFromSummary(requested));
        return;
      }
    }
    if (!countries.includes(country)) {
      // Unknown country (bad ?country= param, or a country that lost its last
      // program): prefer US, else the first available.
      setCountry(countries.includes("us") ? "us" : countries[0]);
      return;
    }
    const selectionValid =
      program != null &&
      countryOf(program.jurisdiction) === country &&
      programs.some((item) => programKey(item) === programKey(program));
    if (!selectionValid) {
      const preferred = programs.find(
        (item) => programKey(item) === PREFERRED_DEFAULT_PROGRAM_KEY,
      );
      const next = preferred ?? programs[0];
      setProgram(next ? programRefFromSummary(next) : null);
    }
  }, [allPrograms, countries, country, programs, program, requestedProgramKey, composeFocus]);

  useEffect(() => {
    if (!program) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProgramGraph(program)
      .then((nextGraph) => {
        if (cancelled) return;
        setGraph(nextGraph);
        setSelectedOutputs((current) => {
          const focus = pendingFocusRef.current;
          if (focus) {
            // "us:statutes/7/2017/a#rule_name" targets one rule;
            // without the fragment it's a file/section prefix.
            const matched = focus.includes("#")
              ? nextGraph.rules
                  .filter((rule) => rule.legalId === focus)
                  .map((rule) => rule.legalId)
              : nextGraph.rules
                  .filter(
                    (rule) =>
                      rule.fileLegalId === focus ||
                      rule.fileLegalId.startsWith(`${focus}/`),
                  )
                  .map((rule) => rule.legalId);
            if (matched.length > 0) {
              pendingFocusRef.current = null;
              return matched.slice(0, 24);
            }
          }
          const legalIds = new Set(nextGraph.rules.map((rule) => rule.legalId));
          const retained = current.filter((id) => legalIds.has(id));
          if (retained.length > 0) return retained;
          return defaultOutputsForProgram(nextGraph);
        });
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [program]);

  // Compose mode: fetch the on-demand graph for the focus legal id. The
  // server narrows ownOutputs to the focus rule when a #fragment is given.
  useEffect(() => {
    if (!composeFocus) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchComposedGraph(composeFocus)
      .then((composed) => {
        if (cancelled) return;
        setGraph(composed.graph);
        setComposedFiles(composed.files);
        setComposedTruncated(composed.truncated);
        const rulesById = new Map(
          composed.graph.rules.map((rule) => [rule.legalId, rule]),
        );
        // Prefer outputs with a real computation to draw; fall back to
        // everything the focus file declares (a parameter-only section
        // still renders its nodes).
        const own = composed.graph.ownOutputs.filter((id) => rulesById.has(id));
        const derived = own.filter((id) => {
          const rule = rulesById.get(id);
          return rule?.kind === "derived" && rule.formula?.trim();
        });
        setSelectedOutputs((derived.length > 0 ? derived : own).slice(0, 24));
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [composeFocus]);

  const outputRules = useMemo(
    () => rankOutputRules(graph, { includeLeaves: composeFocus != null }),
    [graph, composeFocus],
  );
  const filteredOutputRules = useMemo(() => {
    const query = outputSearch.trim().toLowerCase();
    if (!query) return outputRules;
    return outputRules.filter((rule) => {
      const haystack = [
        rule.name,
        humanize(rule.name),
        rule.legalId,
        rule.dtype,
        rule.kind,
        rule.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [outputRules, outputSearch]);
  const parameterRules = useMemo<ParameterRule[]>(
    () =>
      (graph?.rules ?? [])
        .filter((rule) => rule.kind === "parameter")
        .map((rule) => ({
          legalId: rule.legalId,
          name: rule.name,
          fileLegalId: rule.fileLegalId,
          source: rule.source,
          sourceUrl: rule.sourceUrl,
          unit: rule.unit,
          dtype: rule.dtype,
          formula: rule.formula,
        })),
    [graph],
  );
  // In compose mode there is no registry program; a synthetic ref keeps
  // the header and dashboard spec coherent.

  const spec = useMemo<DashboardSpec | null>(
    () =>
      effectiveProgram
        ? {
            specVersion: "0.1",
            meta: {
              title: effectiveProgram.displayName ?? effectiveProgram.programId,
            },
            program: effectiveProgram,
            period: { kind: "month", start: "2026-01-01" },
            inputs: [],
            outputs: selectedOutputs.map((legalId) => ({
              id: legalId.split("#").pop() ?? legalId,
              legalId,
              label: labelForRule(graph, legalId),
            })),
          }
        : null,
    [graph, effectiveProgram, selectedOutputs],
  );

  const selectedSet = useMemo(() => new Set(selectedOutputs), [selectedOutputs]);
  const selectedOutputRules = useMemo(
    () =>
      selectedOutputs.map((legalId) => ({
        legalId,
        label: labelForRule(graph, legalId),
      })),
    [graph, selectedOutputs],
  );
  const structureTraces = useMemo(
    () => buildStructureTraces(graph, selectedOutputs),
    [graph, selectedOutputs],
  );

  // Execution overlay: clone the structural traces and light them
  // with the run's computed values (rules by durable id or bare
  // fragment) and the scenario's input values.
  const liveTraces = useMemo(() => {
    if (!runResult) return { traces: structureTraces, executed: new Set<string>() };
    const valueByFragment = new Map<string, unknown>();
    const valueByLegalId = new Map<string, unknown>();
    const record = (variable: string, value: unknown) => {
      if (variable.includes("#")) valueByLegalId.set(variable, value);
      else valueByFragment.set(variable, value);
    };
    for (const entry of runResult.trace) record(entry.variable, entry.value);
    for (const [name, value] of Object.entries(runResult.outputs)) {
      record(name, value);
    }
    const executed = new Set<string>();
    const seen = new Map<TraceNode, TraceNode>();
    const light = (node: TraceNode): TraceNode => {
      const cached = seen.get(node);
      if (cached) return cached;
      const fragment = node.legalId.split("#").pop() ?? "";
      const ranValue =
        valueByLegalId.get(node.legalId) ?? valueByFragment.get(fragment);
      const scenarioValue =
        node.dtype === "input"
          ? scenario[fragment.replace(/^input\./, "")]
          : undefined;
      if (ranValue !== undefined || scenarioValue !== undefined) {
        executed.add(node.legalId);
      }
      let value: unknown = ranValue ?? scenarioValue;
      const next: TraceNode = {
        ...node,
        value:
          value === undefined ? node.value : (value as TraceNode["value"]),
        inputSource:
          node.dtype === "input" &&
          fragment.replace(/^input\./, "") in scenario
            ? "user"
            : node.inputSource,
      };
      seen.set(node, next);
      next.children = (node.children ?? []).map(light);
      return next;
    };
    return {
      traces: Object.fromEntries(
        Object.entries(structureTraces).map(([key, node]) => [
          key,
          light(node),
        ]),
      ),
      executed,
    };
  }, [structureTraces, runResult, scenario]);

  function toggleOutput(legalId: LegalId) {
    setSelectedOutputs((current) =>
      current.includes(legalId)
        ? current.filter((id) => id !== legalId)
        : [...current, legalId],
    );
  }

  // Leaving compose mode: clear the composed graph and the ?compose=
  // param so the registry-driven selection takes over again.
  function exitComposeMode() {
    if (!composeFocus) return;
    setComposeFocus(null);
    setComposedFiles([]);
    setComposedTruncated(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("compose");
      window.history.replaceState({}, "", url.toString());
    }
  }

  function selectProgram(value: string) {
    const next = programs.find((item) => programKey(item) === value);
    if (!next) return;
    exitComposeMode();
    setProgram(programRefFromSummary(next));
    setGraph(null);
    setSelectedOutputs([]);
  }

  function selectCountry(nextCountry: Country) {
    if (nextCountry === country && !composeFocus) return;
    exitComposeMode();
    setCountry(nextCountry);
    // The selection effect picks the first program of the new country.
    setProgram(null);
    setGraph(null);
    setSelectedOutputs([]);
    setOutputSearch("");
    setError(null);
  }

  return (
    <div className="graph-viewer-root">
    {launcher !== "closed" && (
      <div
        className={`plane-launcher ${launcher === "leaving" ? "is-leaving" : ""}`}
        role="dialog"
        aria-label="Choose a program to run"
      >
        <div className="plane-launcher-inner">
          <p className="plane-launcher-eyebrow">Axiom · Plane</p>
          <h1 className="plane-launcher-title">
            What law do you want to run?
          </h1>
          <p className="plane-launcher-sub">
            Pick a program — its rule graph opens on the canvas, ready to
            explore, set a scenario, and execute.
          </p>
          {programsLoading ? (
            <p className="plane-launcher-loading">Loading programs…</p>
          ) : (
            <div className="plane-launcher-grid">
              {allPrograms.map((item, index) => (
                <button
                  key={programKey(item)}
                  type="button"
                  className="plane-launcher-card"
                  style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
                  onClick={() => {
                    selectProgram(programKey(item));
                    dismissLauncher();
                  }}
                >
                  <span className="plane-launcher-chip">
                    {countryShortLabel(countryOf(item.jurisdiction))}
                    {item.jurisdiction.includes("-")
                      ? ` · ${item.jurisdiction.split("-")[1].toUpperCase()}`
                      : ""}
                  </span>
                  <strong>{displayNameForProgram(item)}</strong>
                  <span className="plane-launcher-meta">
                    {item.outputCount
                      ? `${item.outputCount} outputs`
                      : "compiled program"}
                    {item.inputCount ? ` · ${item.inputCount} inputs` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          <a className="plane-launcher-alt" href="/us">
            Just reading? Open the Library →
          </a>
        </div>
      </div>
    )}
    <main className="app-shell">
      <aside className="side-panel">
        <div className="brand">
          <span>Axiom</span>
          <strong>Plane</strong>
          <p>Law as a system: pick a program, set a household, run it, and watch the computation light up.</p>
          <a className="brand-switch" href="/us">
            ⇄ Library — read the law
          </a>
        </div>

        <section className="control-block program-controls">
          <div className="section-head stacked">
            <h2>Program</h2>
            <span>
              {programsLoading
                ? "Loading programs"
                : graph
                  ? `${graph.rules.length} rules loaded`
                  : "Loading graph"}
            </span>
          </div>
          <label>
            Select program
            <select
              value={program ? programKey(program) : ""}
              onChange={(event) => selectProgram(event.target.value)}
              disabled={programs.length === 0}
            >
              {composeFocus && <option value="">Composed view</option>}
              {programs.length === 0 && !composeFocus && (
                <option value="">No programs available</option>
              )}
              {programs.map((item) => (
                <option key={programKey(item)} value={programKey(item)}>
                  {displayNameForProgram(item)}
                </option>
              ))}
            </select>
          </label>
          {program && <p className="program-summary">{summaryForProgram(programs, program)}</p>}
          {composeFocus && (
            <p className="program-summary">
              Composed on demand from {composedFiles.length || "the"} encoded{" "}
              {composedFiles.length === 1 ? "file" : "files"}
              {composedTruncated ? " (import walk truncated)" : ""}. Pick a
              program above to return to compiled packages.
            </p>
          )}
        </section>

        <section className="control-block outputs-control">
          <div className="section-head outputs-head">
            <div>
              <h2>Outputs</h2>
              <span>Pick the graph results to show</span>
            </div>
            <strong>{selectedOutputs.length} selected</strong>
          </div>
          {selectedOutputRules.length > 0 && (
            <div className="selected-output-list" aria-label="Selected outputs">
              {selectedOutputRules.map((output) => (
                <button
                  type="button"
                  key={output.legalId}
                  onClick={() => toggleOutput(output.legalId)}
                  title="Remove output from graph"
                >
                  {output.label}
                </button>
              ))}
            </div>
          )}
          <label className="output-search">
            <span>Search outputs</span>
            <input
              type="search"
              value={outputSearch}
              onChange={(event) => setOutputSearch(event.target.value)}
              placeholder="Eligibility, allotment, income..."
            />
          </label>
          <div className="output-list">
            {filteredOutputRules.map((rule) => (
              <button
                type="button"
                key={rule.legalId}
                className={`output-option ${selectedSet.has(rule.legalId) ? "is-selected" : ""}`}
                onClick={() => toggleOutput(rule.legalId)}
              >
                <span>{humanize(rule.name)}</span>
              </button>
            ))}
            {filteredOutputRules.length === 0 && (
              <div className="output-empty">No outputs match this search.</div>
            )}
          </div>
        </section>

        {scenarioFields.length > 0 && (
          <section className="control-block scenario-block">
            <div className="section-head stacked">
              <h2>Scenario</h2>
              <span>The levers of the law — edit and run</span>
            </div>
            <div className="scenario-fields">
              {scenarioFields.map((field) => (
                <label key={field.name} className="scenario-field">
                  <span>{humanize(field.name)}</span>
                  {typeof field.sample === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(scenario[field.name])}
                      onChange={(event) =>
                        setScenario((current) => ({
                          ...current,
                          [field.name]: event.target.checked,
                        }))
                      }
                    />
                  ) : (
                    <input
                      type="number"
                      value={String(scenario[field.name] ?? field.sample)}
                      onChange={(event) =>
                        setScenario((current) => ({
                          ...current,
                          [field.name]: Number(event.target.value),
                        }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="run-button"
              disabled={running || selectedOutputs.length === 0}
              onClick={() => void runScenario()}
            >
              {running ? "Running…" : "▶ Run this scenario"}
            </button>
            {runError && <p className="run-error">{runError}</p>}
          </section>
        )}
      </aside>

      <section className="viewer-panel">
        <header className="viewer-header">
          <div>
            <p>{composeFocus ? "composed view" : effectiveProgram?.jurisdiction ?? ""}</p>
            <h1>{effectiveProgram?.displayName ?? "RuleSpec program"}</h1>
          </div>
          <div className="country-toggle" role="tablist" aria-label="Country">
            {countries.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={country === option}
                className={`country-toggle-btn ${country === option ? "is-active" : ""}`}
                onClick={() => selectCountry(option)}
                title={countryLabel(option)}
              >
                {countryShortLabel(option)}
              </button>
            ))}
          </div>
        </header>

        {runResult && (
          <div className="exec-pill" role="status">
            <span className="exec-pill-dot" aria-hidden />
            Execution layer · live
            <button type="button" onClick={() => setRunResult(null)}>
              exit
            </button>
          </div>
        )}
        <div className={`graph-stage ${runResult ? "plane-live" : ""}`}>
          {error && <div className="status error">{error}</div>}

          {loading ? (
            <div className="loading-state" role="status" aria-live="polite">
              <span className="loading-spinner" aria-hidden="true" />
              <span>Loading graph...</span>
            </div>
          ) : spec && Object.keys(structureTraces).length > 0 ? (
            <InteractiveRuleGraph
              spec={spec}
              traces={liveTraces.traces}
              showValues={Boolean(runResult)}
              executionActive={Boolean(runResult)}
              executedLegalIds={liveTraces.executed}
              onInspect={setInspected}
              parameterRules={parameterRules}
              selectedOutputIds={selectedSet}
            />
          ) : (
            <div className="empty-state">Select at least one output to render its computation graph.</div>
          )}
        </div>

        {inspected && (
          <aside className="node-inspector" aria-label="Node details">
            <div className="node-inspector-head">
              <span className="node-inspector-kind">{inspected.kind}</span>
              <button
                type="button"
                className="results-close"
                onClick={() => setInspected(null)}
                aria-label="Close inspector"
              >
                ×
              </button>
            </div>
            <h2 className="node-inspector-title">
              {humanize(
                "label" in inspected ? (inspected.label ?? "") : "",
              )}
            </h2>
            {"value" in inspected && inspected.value ? (
              <p className="node-inspector-value">{inspected.value}</p>
            ) : null}
            {"legalId" in inspected && inspected.legalId ? (
              <p className="node-inspector-cite">
                {humanizeCitation(fileLegalIdOf(inspected.legalId))}
              </p>
            ) : null}
            {"meta" in inspected &&
            (inspected.meta?.formulaPreview ||
              inspected.meta?.parameterValue) ? (
              <pre className="node-inspector-formula">
                {inspected.meta.formulaPreview ??
                  inspected.meta.parameterValue}
              </pre>
            ) : null}
            {"legalId" in inspected &&
            inspected.legalId &&
            axiomAppUrl(fileLegalIdOf(inspected.legalId)) ? (
              <a
                className="node-inspector-link"
                href={axiomAppUrl(fileLegalIdOf(inspected.legalId)) ?? "#"}
              >
                Read in the Library →
              </a>
            ) : null}
          </aside>
        )}

        {runResult && (
          <aside className="results-sheet" role="status">
            <div className="results-head">
              <div>
                <span className="results-eyebrow">Executed</span>
                <strong>{effectiveProgram?.displayName ?? "Program"}</strong>
              </div>
              <button
                type="button"
                className="results-close"
                onClick={() => setRunResult(null)}
                aria-label="Dismiss results"
              >
                ×
              </button>
            </div>
            <div className="results-grid">
              {Object.entries(runResult.outputs)
                .filter(([name]) => !name.includes(":"))
                .slice(0, 6)
                .map(([name, value]) => (
                  <div key={name} className="results-cell">
                    <span className="results-label">{humanize(name)}</span>
                    <span className="results-value">
                      {typeof value === "boolean"
                        ? value
                          ? "Yes"
                          : "No"
                        : typeof value === "number"
                          ? value.toLocaleString("en-US")
                          : String(value ?? "—")}
                    </span>
                  </div>
                ))}
            </div>
            <p className="results-note">
              Computed by the Axiom engine from your scenario — the graph
              above shows every intermediate value.
            </p>
          </aside>
        )}
      </section>
    </main>
    </div>
  );
}

function buildStructureTraces(
  graph: ProgramGraph | null,
  outputIds: LegalId[],
): Record<string, TraceNode> {
  if (!graph) return {};

  const rulesById = new Map(graph.rules.map((rule) => [rule.legalId, rule]));
  const inputsById = new Map(graph.inputs.map((input) => [input.legalId, input]));
  const relationsById = new Map(graph.relations.map((relation) => [relation.legalId, relation]));
  const cache = new Map<LegalId, TraceNode>();

  function nodeFor(legalId: LegalId, stack: Set<LegalId> = new Set()): TraceNode {
    const cached = cache.get(legalId);
    if (cached) return cached;

    const rule = rulesById.get(legalId);
    if (rule) {
      const trace: TraceNode = {
        legalId: rule.legalId,
        label: rule.name,
        ruleKind: rule.kind,
        value: null,
        dtype: traceDtype(rule.dtype),
        source: rule.source ?? undefined,
        sourceUrl: rule.sourceUrl ?? null,
        formula: rule.formula ?? null,
        children: [],
      };
      cache.set(legalId, trace);
      if (!stack.has(legalId)) {
        const nextStack = new Set(stack).add(legalId);
        trace.children = [
          ...rule.ruleDeps,
          ...rule.inputDeps,
          ...rule.relationDeps,
        ].map((depId) => nodeFor(depId, nextStack));
      }
      return trace;
    }

    const input = inputsById.get(legalId);
    if (input) {
      const trace: TraceNode = {
        legalId: input.legalId,
        label: input.name,
        value: scalarSample(input.sample),
        dtype: "input",
        inputSource: "default",
        source: input.fileLegalId,
        homeFile: input.fileLegalId,
        children: [],
      };
      cache.set(legalId, trace);
      return trace;
    }

    const relation = relationsById.get(legalId);
    if (relation) {
      const trace: TraceNode = {
        legalId: relation.legalId,
        label: relation.name,
        value: null,
        dtype: "input",
        inputSource: "default",
        source: relation.fileLegalId,
        homeFile: relation.fileLegalId,
        children: [],
      };
      cache.set(legalId, trace);
      return trace;
    }

    const trace: TraceNode = {
      legalId,
      label: legalId.split("#").pop()?.replace(/^(input|relation)\./, "") ?? legalId,
      value: null,
      dtype: "input",
      inputSource: "default",
      children: [],
    };
    cache.set(legalId, trace);
    return trace;
  }

  return Object.fromEntries(
    outputIds
      .filter((legalId) => rulesById.has(legalId))
      .map((legalId) => [legalId, nodeFor(legalId)]),
  );
}

function traceDtype(dtype: string | null): TraceNode["dtype"] {
  const normalized = (dtype ?? "").toLowerCase();
  if (normalized === "judgment") return "judgment";
  if (normalized === "boolean" || normalized === "bool") return "boolean";
  if (normalized === "integer") return "integer";
  if (normalized === "date") return "date";
  if (normalized === "string" || normalized === "text") return "string";
  return "decimal";
}

function scalarSample(value: unknown): TraceNode["value"] {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

function rankOutputRules(
  graph: ProgramGraph | null,
  options: { includeLeaves?: boolean } = {},
): RuleNode[] {
  if (!graph) return [];
  const terminal = new Set(graph.terminalOutputs);
  return graph.rules
    // Composed graphs are views of partial encodings, where a rule with
    // no resolved deps (a leaf constant) is still worth selecting.
    .filter((rule) =>
      options.includeLeaves ? Boolean(rule.formula?.trim()) : isGraphableOutputRule(rule),
    )
    .map((rule) => ({
      rule,
      score:
        (terminal.has(rule.legalId) ? 100 : 0) +
        (/eligible|eligibility/i.test(rule.name) ? 30 : 0) +
        (/allotment|benefit|amount|award|allowance|deduction/i.test(rule.name) ? 25 : 0) +
        (/universal_credit_award_amount/i.test(rule.name) ? 40 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.rule.name.localeCompare(b.rule.name))
    .map(({ rule }) => rule);
}

function isGraphableOutputRule(rule: RuleNode): boolean {
  if (rule.kind !== "derived") return false;
  if (!rule.formula?.trim()) return false;
  return (
    rule.ruleDeps.length > 0 ||
    rule.inputDeps.length > 0 ||
    rule.relationDeps.length > 0
  );
}

function labelForRule(graph: ProgramGraph | null, legalId: LegalId): string {
  const rule = graph?.rules.find((candidate) => candidate.legalId === legalId);
  return humanize(rule?.name ?? legalId.split("#").pop() ?? legalId);
}

function humanize(value: string): string {
  return value
    .replace(/^snap_/, "")
    .replace(/^universal_credit_/, "UC ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function initialCountry(): Country {
  if (typeof window === "undefined") return "us";
  return new URL(window.location.href).searchParams.get("country") ?? "us";
}

function initialParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  const value = new URL(window.location.href).searchParams.get(name);
  return value && value.trim().length > 0 ? value.trim() : null;
}

function syncCountryToUrl(country: Country) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (country === "us") url.searchParams.delete("country");
  else url.searchParams.set("country", country);
  window.history.replaceState({}, "", url.toString());
}
