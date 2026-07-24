"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  InteractiveRuleGraph,
  initialCollapse,
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
  const surveyRef = useRef(false);
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
  // The rule lens: "how does this rule work?" — a trail of focused
  // rules over the map. Entering saves the map's output selection;
  // the trail's crumbs step back; leaving restores the map exactly.
  const [lensTrail, setLensTrail] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  // The fold state is shared by the canvas and the navigator tree.
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const foldedInitialized = useRef<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    legalId: string;
    nonce: number;
  } | null>(null);
  const flyTo = (legalId: string) =>
    setFlyTarget((current) => ({
      legalId,
      nonce: (current?.nonce ?? 0) + 1,
    }));
  const savedSelection = useRef<LegalId[] | null>(null);
  const openLens = (legalId: string) => {
    setInspected(null);
    setLensTrail((trail) => {
      if (trail.length === 0) savedSelection.current = selectedOutputs;
      if (trail[trail.length - 1] === legalId) return trail;
      return [...trail, legalId];
    });
    setSelectedOutputs([legalId]);
  };
  const jumpLens = (index: number) => {
    setLensTrail((trail) => {
      const next = trail.slice(0, index + 1);
      setSelectedOutputs([next[next.length - 1]]);
      return next;
    });
  };
  // Clicking an Index entry must land on the canvas even when the
  // target sits inside a folded branch: unfold its ancestry first,
  // then fly — the camera chases the relayout to where it settles.
  const flyFromIndex = (legalId: string) => {
    setFolded((current) => {
      const next = new Set(current);
      const unfoldPath = (node: TraceNode, ancestors: string[]): boolean => {
        if (node.legalId === legalId) {
          for (const id of ancestors) next.delete(id);
          return true;
        }
        return (node.children ?? []).some((child) =>
          unfoldPath(child, [...ancestors, node.legalId]),
        );
      };
      for (const id of selectedOutputs) {
        const root = structureTraces[id];
        if (root && unfoldPath(root, [])) break;
      }
      return next;
    });
    flyTo(legalId);
  };
  const closeLens = () => {
    setLensTrail([]);
    if (savedSelection.current) setSelectedOutputs(savedSelection.current);
    savedSelection.current = null;
  };
  // A click opens the card's info and glides the camera to it — the
  // graph itself stays exactly as drawn (no re-dissection; that's the
  // double-click lens). During a walk the walk owns the camera, so a
  // click only inspects.
  const focusNode = (data: IrgNodeData) => {
    setInspected(data);
    const legalId = "legalId" in data && data.legalId ? data.legalId : null;
    if (!legalId || walk) return;
    if (data.kind !== "output" && data.kind !== "ruleRef") return;
    flyTo(legalId);
  };
  const lensFocusId = lensTrail[lensTrail.length - 1] ?? null;
  // Downstream: who uses the focused rule — the direction the
  // upstream tree cannot draw.
  const lensConsumers = useMemo(() => {
    if (!lensFocusId || !graph) return [];
    return graph.rules
      .filter((rule) => rule.ruleDeps.includes(lensFocusId))
      .slice(0, 10);
  }, [lensFocusId, graph]);
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
  const [launcherStep, setLauncherStep] = useState<"program" | "intent">(
    "program",
  );
  const [intentSearch, setIntentSearch] = useState("");
  const [intentSearchOpen, setIntentSearchOpen] = useState(false);
  // Which kind of piece: a computed rule (output path) or a raw
  // input (question path).
  const [intentKind, setIntentKind] = useState<"output" | "input">("input");
  const [intentInput, setIntentInput] = useState<{
    legalId: string;
    name: string;
  } | null>(null);
  // The guided walk: step through the tree one layer at a time.
  // "up" walks an input toward the results it feeds; "down" walks a
  // result toward the questions it rests on.
  const [walk, setWalk] = useState<{
    direction: "up" | "down";
    trail: string[];
  } | null>(null);
  const [scenarioGlow, setScenarioGlow] = useState(false);
  // The scenario runner belongs to the "Run a scenario" journey only —
  // survey and rule journeys keep a quieter sidebar.
  const [scenarioMode, setScenarioMode] = useState(false);
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
  const reopenJourney = () => {
    setLauncherStep(effectiveProgram ? "intent" : "program");
    setIntentSearch("");
    setIntentSearchOpen(false);
    setIntentKind("input");
    setIntentInput(null);
    setLauncher("open");
  };
  const beginSurvey = () => {
    dismissLauncher();
    setScenarioMode(false);
    // The whole law, literally: every result selected, everything
    // unfolded, camera framing it all. The LOD constellation and the
    // Index keep it legible.
    surveyRef.current = true;
    setSelectedOutputs(outputRules.map((rule) => rule.legalId));
    setFolded(new Set());
    setNavOpen(true);
    setFlyTarget((current) => ({
      legalId: "*",
      nonce: (current?.nonce ?? 0) + 1,
    }));
  };
  const beginScenario = () => {
    dismissLauncher();
    setScenarioMode(true);
    setScenarioGlow(true);
    window.setTimeout(() => setScenarioGlow(false), 2600);
  };
  const beginRuleLens = (legalId: string) => {
    dismissLauncher();
    setScenarioMode(false);
    openLens(legalId);
  };
  const walkRuleById = useMemo(
    () => new Map((graph?.rules ?? []).map((rule) => [rule.legalId, rule])),
    [graph],
  );
  const walkInputById = useMemo(
    () => new Map((graph?.inputs ?? []).map((input) => [input.legalId, input])),
    [graph],
  );
  const consumersOf = (legalId: string) =>
    (graph?.rules ?? []).filter(
      (rule) =>
        rule.ruleDeps.includes(legalId) || rule.inputDeps.includes(legalId),
    );
  const savedWalkSelection = useRef<LegalId[] | null>(null);
  const focusWalkNode = (legalId: string) => {
    if (walkRuleById.has(legalId)) {
      setSelectedOutputs([legalId]);
    } else {
      // An input: show its first consumer's neighborhood so the
      // canvas has something true to stand on.
      const consumer = consumersOf(legalId)[0];
      if (consumer) setSelectedOutputs([consumer.legalId]);
    }
    setFlyTarget((current) => ({ legalId, nonce: (current?.nonce ?? 0) + 1 }));
  };
  const startWalk = (direction: "up" | "down", legalId: string) => {
    dismissLauncher();
    setScenarioMode(false);
    savedWalkSelection.current = selectedOutputs;
    setWalk({ direction, trail: [legalId] });
    focusWalkNode(legalId);
  };
  const walkTo = (legalId: string) => {
    setWalk((current) =>
      current ? { ...current, trail: [...current.trail, legalId] } : current,
    );
    focusWalkNode(legalId);
  };
  const walkBackTo = (index: number) => {
    setWalk((current) => {
      if (!current) return current;
      const trail = current.trail.slice(0, index + 1);
      focusWalkNode(trail[trail.length - 1]);
      return { ...current, trail };
    });
  };
  const endWalk = () => {
    setWalk(null);
    if (savedWalkSelection.current) {
      setSelectedOutputs(savedWalkSelection.current);
      savedWalkSelection.current = null;
    }
  };

  const intentMatches = useMemo(() => {
    const query = intentSearch.trim().toLowerCase();
    if (!query || !graph) return [];
    if (intentKind === "input") {
      const seen = new Set<string>();
      return graph.inputs
        .filter((input) => {
          if (seen.has(input.name)) return false;
          seen.add(input.name);
          return input.name.toLowerCase().includes(query);
        })
        .slice(0, 8)
        .map((input) => ({ legalId: input.legalId, name: input.name }));
    }
    return graph.rules
      .filter(
        (rule) =>
          rule.kind === "derived" &&
          rule.name.toLowerCase().includes(query),
      )
      .slice(0, 8)
      .map((rule) => ({ legalId: rule.legalId, name: rule.name }));
  }, [intentSearch, graph, intentKind]);

  // The chosen input's consumers — the paths it feeds.
  const intentInputConsumers = useMemo(() => {
    if (!intentInput || !graph) return [];
    return graph.rules
      .filter((rule) => rule.inputDeps.includes(intentInput.legalId))
      .slice(0, 8);
  }, [intentInput, graph]);
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

  // Dissect on program/selection/lens change; unfold the executed
  // path when a run lands.
  useEffect(() => {
    const key =
      Object.keys(structureTraces).sort().join("|") +
      "::" +
      (lensTrail.length > 0 || walk ? "always" : "auto");
    if (foldedInitialized.current !== key) {
      foldedInitialized.current = key;
      if (surveyRef.current) {
        // A survey just selected everything — keep it unfolded
        // instead of re-dissecting the new selection.
        surveyRef.current = false;
        setFolded(new Set());
      } else {
        setFolded(
          initialCollapse(
            structureTraces,
            lensTrail.length > 0 ? "always" : "auto",
          ),
        );
      }
    }
  }, [structureTraces, lensTrail.length, walk]);

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

  useEffect(() => {
    if (!runResult) return;
    setFolded((current) => {
      let changed = false;
      const next = new Set(current);
      for (const id of liveTraces.executed) {
        if (next.delete(id)) changed = true;
      }
      return changed ? next : current;
    });
  }, [runResult, liveTraces.executed]);

  // Computed values by durable legal id (from the live traces), for
  // the walk panel.
  const valueByLegalId = useMemo(() => {
    const map = new Map<string, string>();
    const visit = (node: TraceNode, seen: Set<string>) => {
      if (seen.has(node.legalId)) return;
      seen.add(node.legalId);
      if (node.value !== null && node.value !== undefined) {
        map.set(
          node.legalId,
          typeof node.value === "number"
            ? node.value.toLocaleString("en-US")
            : typeof node.value === "boolean"
              ? node.value
                ? "Yes"
                : "No"
              : String(node.value),
        );
      }
      for (const child of node.children ?? []) visit(child, seen);
    };
    const seen = new Set<string>();
    for (const root of Object.values(liveTraces.traces)) visit(root, seen);
    return map;
  }, [liveTraces]);


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
    const next = allPrograms.find((item) => programKey(item) === value);
    if (!next) return;
    exitComposeMode();
    setCountry(countryOf(next.jurisdiction));
    setProgram(programRefFromSummary(next));
    setGraph(null);
    setSelectedOutputs([]);
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
          {launcherStep === "intent" ? (
            <>
              <h1 className="plane-launcher-title">
                {effectiveProgram?.displayName ?? "This program"} — what do
                you want to do?
              </h1>
              <div
                className={`journey-grid ${intentSearchOpen ? "is-focused" : ""}`}
              >
                {!intentSearchOpen && (
                <button
                  type="button"
                  className="journey-card"
                  onClick={beginSurvey}
                >
                  <span className="journey-glyph">⊞</span>
                  <strong>Survey the whole law</strong>
                  <span>
                    The map, dissected — results first, unfold as you go,
                    with the full index at hand.
                  </span>
                </button>
                )}
                {intentSearchOpen ? (
                  <div className="journey-card is-search">
                    <div className="journey-head">
                      <span className="journey-glyph">⊙</span>
                      <strong>Understand one rule</strong>
                      <button
                        type="button"
                        className="journey-back"
                        onClick={() => {
                          setIntentSearchOpen(false);
                          setIntentInput(null);
                          setIntentSearch("");
                        }}
                      >
                        ← all journeys
                      </button>
                    </div>
                    <div
                      className="journey-kind"
                      role="tablist"
                      aria-label="Kind of piece"
                    >
                      {(["input", "output"] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          role="tab"
                          aria-selected={intentKind === kind}
                          className={intentKind === kind ? "is-active" : ""}
                          onClick={() => {
                            setIntentKind(kind);
                            setIntentInput(null);
                            setIntentSearch("");
                          }}
                        >
                          {kind === "output" ? "Output · a rule" : "Input · a question"}
                        </button>
                      ))}
                    </div>
                    {intentInput ? (
                      <>
                        <span className="journey-picked">
                          {humanize(intentInput.name)} feeds{" "}
                          {intentInputConsumers.length}
                          {intentInputConsumers.length === 8 ? "+" : ""}{" "}
                          {intentInputConsumers.length === 1 ? "rule" : "rules"} — pick a path:
                        </span>
                        <div className="journey-matches">
                          {intentInputConsumers.map((rule) => (
                            <button
                              key={rule.legalId}
                              type="button"
                              onClick={() => beginRuleLens(rule.legalId)}
                            >
                              {humanize(rule.name)}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="journey-back"
                          onClick={() => setIntentInput(null)}
                        >
                          ← different input
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="search"
                          placeholder={
                            intentKind === "input"
                              ? "Search an input… income, age, household"
                              : "Search a rule… allotment, eligible, income"
                          }
                          value={intentSearch}
                          onChange={(event) =>
                            setIntentSearch(event.target.value)
                          }
                          autoFocus
                        />
                        {intentMatches.length > 0 && (
                          <div className="journey-matches">
                            {intentMatches.map((match) => (
                              <button
                                key={match.legalId}
                                type="button"
                                onClick={() =>
                                  intentKind === "input"
                                    ? startWalk("up", match.legalId)
                                    : startWalk("down", match.legalId)
                                }
                              >
                                {humanize(match.name)}
                              </button>
                            ))}
                          </div>
                        )}
                        {intentSearch.trim() && intentMatches.length === 0 && (
                          <span className="journey-empty">
                            {graph ? "No matches." : "Loading…"}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="journey-card"
                    onClick={() => setIntentSearchOpen(true)}
                  >
                    <span className="journey-glyph">⊙</span>
                    <strong>Understand one rule</strong>
                    <span>
                      Find a single rule and open its lens — what it reads,
                      what it feeds, how it computes.
                    </span>
                  </button>
                )}
                {!intentSearchOpen && (
                <button
                  type="button"
                  className="journey-card"
                  onClick={beginScenario}
                >
                  <span className="journey-glyph">▶</span>
                  <strong>Run a scenario</strong>
                  <span>
                    Set a household's numbers and watch the computation
                    light the path to the result.
                  </span>
                </button>
                )}
              </div>
              <button
                type="button"
                className="plane-launcher-alt as-button"
                onClick={() => setLauncherStep("program")}
              >
                ← Pick a different program
              </button>
            </>
          ) : (
            <>
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
                    setLauncherStep("intent");
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
            </>
          )}
        </div>
      </div>
    )}
    <main className={`app-shell ${walk ? "walk-active" : ""}`}>
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
                  ? `${
                      composeFocus
                        ? "composed view"
                        : (effectiveProgram?.jurisdiction ?? "").toUpperCase()
                    } · ${graph.rules.length} rules`
                  : "Loading graph"}
            </span>
          </div>
          <label>
            Select program
            <select
              value={program ? programKey(program) : ""}
              onChange={(event) => selectProgram(event.target.value)}
              disabled={allPrograms.length === 0}
            >
              {composeFocus && <option value="">Composed view</option>}
              {programs.length === 0 && !composeFocus && (
                <option value="">No programs available</option>
              )}
              {[...new Set(allPrograms.map((i) => countryOf(i.jurisdiction)))].map(
                (group) => (
                  <optgroup key={group} label={countryLabel(group)}>
                    {allPrograms
                      .filter((i) => countryOf(i.jurisdiction) === group)
                      .map((item) => (
                        <option key={programKey(item)} value={programKey(item)}>
                          {displayNameForProgram(item)}
                        </option>
                      ))}
                  </optgroup>
                ),
              )}
            </select>
          </label>
          {program && <p className="program-summary">{summaryForProgram(programs, program)}</p>}
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

        {scenarioMode && scenarioFields.length > 0 && (
          <section
            className={`control-block scenario-block ${scenarioGlow ? "is-glowing" : ""}`}
          >
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
          <button
            type="button"
            className="journey-toggle"
            onClick={reopenJourney}
            title="Start a new journey — survey, one rule, or a scenario"
          >
            ✦ Journey
          </button>
          <button
            type="button"
            className="nav-toggle"
            onClick={() => setNavOpen((open) => !open)}
            aria-expanded={navOpen}
          >
            ☰ Index{graph ? ` · ${graph.rules.length}` : ""}
          </button>
          {navOpen && (
            <div className="nav-panel" aria-label="Computation index">
          {graph && (
            <p className="program-anatomy">
              This program decides{" "}
              <strong>{graph.terminalOutputs.length} results</strong> from{" "}
              <strong>{graph.inputs.length} inputs</strong> through{" "}
              <strong>{graph.rules.length} rules</strong>.
            </p>
          )}
          {composeFocus && (
            <p className="program-summary">
              Composed on demand from {composedFiles.length || "the"} encoded{" "}
              {composedFiles.length === 1 ? "file" : "files"}
              {composedTruncated ? " (import walk truncated)" : ""}. Pick a
              program above to return to compiled packages.
            </p>
          )}
          <div className="navigator-tree" aria-label="Computation navigator">
            {selectedOutputs.map((legalId) => {
              const root = structureTraces[legalId];
              if (!root) return null;
              return (
                <NavigatorBranch
                  key={legalId}
                  node={root}
                  depth={0}
                  folded={folded}
                  onToggleFold={(id) =>
                    setFolded((current) => {
                      const next = new Set(current);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  onFly={flyFromIndex}
                />
              );
            })}
          </div>
            </div>
          )}
        {lensFocusId && (
          <div className="lens-bar" role="navigation" aria-label="Rule lens trail">
            <button type="button" className="lens-crumb lens-crumb-root" onClick={closeLens}>
              ⊞ Map
            </button>
            {lensTrail.map((id, index) => (
              <span key={`${id}-${index}`} className="lens-crumb-wrap">
                <span aria-hidden className="lens-sep">▸</span>
                <button
                  type="button"
                  className={`lens-crumb ${index === lensTrail.length - 1 ? "is-current" : ""}`}
                  onClick={() => jumpLens(index)}
                >
                  {humanize(id.split("#").pop() ?? id)}
                </button>
              </span>
            ))}
            {lensConsumers.length > 0 && (
              <span className="lens-consumers">
                <span className="lens-consumers-label">used by</span>
                {lensConsumers.map((rule) => (
                  <button
                    key={rule.legalId}
                    type="button"
                    className="lens-consumer-chip"
                    onClick={() => openLens(rule.legalId)}
                  >
                    {humanize(rule.name)}
                  </button>
                ))}
              </span>
            )}
          </div>
        )}

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
              dissect={lensFocusId || walk ? "always" : "auto"}
              collapsed={folded}
              onCollapsedChange={setFolded}
              flyTo={flyTarget}
              walkTrail={walk?.trail ?? null}
              onInspect={focusNode}
              onLens={openLens}
              parameterRules={parameterRules}
              selectedOutputIds={selectedSet}
            />
          ) : (
            <div className="empty-state">Select at least one output to render its computation graph.</div>
          )}
        </div>

        {walk && (() => {
          const currentId = walk.trail[walk.trail.length - 1];
          const rule = walkRuleById.get(currentId);
          const input = walkInputById.get(currentId);
          const isUp = walk.direction === "up";
          const nextUp = isUp ? consumersOf(currentId) : [];
          const depRules = !isUp && rule
            ? rule.ruleDeps
                .map((id) => walkRuleById.get(id))
                .filter((dep): dep is NonNullable<typeof dep> => Boolean(dep))
            : [];
          const depInputs = !isUp && rule
            ? rule.inputDeps
                .map((id) => walkInputById.get(id))
                .filter((dep): dep is NonNullable<typeof dep> => Boolean(dep))
            : [];
          const atEnd = isUp ? nextUp.length === 0 : depRules.length === 0;
          const name = humanize(
            (rule?.name ?? input?.name ?? currentId.split("#").pop()) || "",
          );
          const value = valueByLegalId.get(currentId) ?? null;
          return (
            <aside className="walk-panel" aria-label="Guided walk">
              <div className="walk-head">
                <span className="walk-direction">
                  {isUp ? "↑ Bottom-up · from an input" : "↓ Top-down · from a result"}
                </span>
                <button
                  type="button"
                  className="results-close"
                  onClick={endWalk}
                  aria-label="End the walk"
                >
                  ×
                </button>
              </div>
              <div className="walk-trail">
                {walk.trail.map((id, index) => (
                  <button
                    key={`${id}-${index}`}
                    type="button"
                    className={
                      index === walk.trail.length - 1 ? "is-current" : ""
                    }
                    onClick={() => walkBackTo(index)}
                  >
                    {humanize(
                      (walkRuleById.get(id)?.name ??
                        walkInputById.get(id)?.name ??
                        id.split("#").pop()) || "",
                    )}
                  </button>
                ))}
              </div>

              <div className="walk-card">
                <span className="walk-kind">
                  {input ? "Input · a question" : "Rule"}
                </span>
                <h2>{name}</h2>
                {value !== null && <p className="walk-value">{value}</p>}
                {rule?.source && !/composition/i.test(rule.source) && (
                  <p className="walk-cite">{rule.source}</p>
                )}
                {rule?.formula && (
                  <code className="walk-formula" title={rule.formula}>
                    = {rule.formula.replace(/[()]/g, " ").slice(0, 160)}
                  </code>
                )}
                {input && (
                  <p className="walk-note">
                    A fact asked of the household — the raw material of the
                    computation.
                  </p>
                )}
              </div>

              {atEnd ? (
                <div className="walk-end">
                  {isUp ? (
                    <>
                      <strong>🏁 End of the line.</strong>
                      <p>
                        {name} feeds nothing further — it is a final result
                        of this program.
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>⚑ Bedrock.</strong>
                      <p>
                        {name} rests directly on{" "}
                        {depInputs.length > 0
                          ? `${depInputs.length} household ${depInputs.length === 1 ? "question" : "questions"}`
                          : "no further steps"}
                        .
                      </p>
                      {depInputs.length > 0 && (
                        <div className="walk-input-chips">
                          {depInputs.slice(0, 8).map((dep) => (
                            <span key={dep.legalId}>{humanize(dep.name)}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    className="walk-lens"
                    onClick={() => {
                      const target = rule ? currentId : walk.trail[1] ?? currentId;
                      endWalk();
                      openLens(target);
                    }}
                  >
                    ⊙ Open this on the map
                  </button>
                </div>
              ) : (
                <div className="walk-next">
                  <span className="walk-next-label">
                    {isUp
                      ? `Feeds ${nextUp.length} ${nextUp.length === 1 ? "rule" : "rules"} — walk on:`
                      : `Computed from ${depRules.length} ${depRules.length === 1 ? "step" : "steps"} — go deeper:`}
                  </span>
                  <div className="walk-choices">
                    {(isUp ? nextUp : depRules).slice(0, 9).map((next) => (
                      <button
                        key={next.legalId}
                        type="button"
                        onClick={() => walkTo(next.legalId)}
                      >
                        {humanize(next.name)}
                        <span>
                          {isUp
                            ? `feeds ${consumersOf(next.legalId).length || "no"} further`
                            : `${next.ruleDeps.length} steps · ${next.inputDeps.length} inputs`}
                        </span>
                      </button>
                    ))}
                  </div>
                  {!isUp && depInputs.length > 0 && (
                    <div className="walk-input-chips">
                      {depInputs.slice(0, 6).map((dep) => (
                        <span key={dep.legalId}>{humanize(dep.name)}</span>
                      ))}
                      {depInputs.length > 6 && (
                        <span>+{depInputs.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </aside>
          );
        })()}

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
            {"legalId" in inspected &&
            inspected.legalId &&
            inspected.kind !== "input" ? (
              <button
                type="button"
                className="node-inspector-lens"
                onClick={() => openLens(inspected.legalId)}
              >
                ⊙ How does this rule work?
              </button>
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


/** Source bucket of a durable legal id, for the seam dot. */
function sourceBucket(legalId: string): string | null {
  return legalId.split(":")[1]?.split("/")[0] ?? null;
}

const BUCKET_DOT: Record<string, string> = {
  statutes: "#d97706",
  regulations: "#0f766e",
  policies: "#4f46e5",
  guidance: "#b45309",
  compositions: "#78716c",
};

/**
 * One row of the navigator: seam dot · name · fold badge. Clicking
 * the name flies the camera to the node; clicking the badge unfolds
 * it on the canvas and in the tree — the same fold state drives
 * both projections.
 */
function NavigatorBranch({
  node,
  depth,
  folded,
  onToggleFold,
  onFly,
}: {
  node: TraceNode;
  depth: number;
  folded: Set<string>;
  onToggleFold: (legalId: string) => void;
  onFly: (legalId: string) => void;
}) {
  const isRule = node.dtype !== "input" && Boolean(node.formula);
  const children = (node.children ?? []).filter(
    (child) => child.dtype !== "input",
  );
  const isFolded = folded.has(node.legalId);
  const hidden = isFolded
    ? children.length
    : 0;
  const bucket = sourceBucket(node.legalId);
  if (depth > 6) return null;
  return (
    <div className="nav-branch" style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
      <div className="nav-row">
        {bucket && BUCKET_DOT[bucket] && (
          <i
            className="nav-dot"
            style={{ background: BUCKET_DOT[bucket] }}
            aria-hidden
          />
        )}
        <button
          type="button"
          className={`nav-name ${depth === 0 ? "is-root" : ""}`}
          onClick={() => onFly(node.legalId)}
          title="Fly to this rule on the canvas"
        >
          {humanize(node.label ?? node.legalId.split("#").pop() ?? "")}
        </button>
        {isRule && children.length > 0 && (
          <button
            type="button"
            className={`nav-fold ${isFolded ? "" : "is-open"}`}
            onClick={() => onToggleFold(node.legalId)}
            title={isFolded ? "Unfold on the canvas" : "Fold"}
          >
            {isFolded ? `▸ ${hidden}` : "▾"}
          </button>
        )}
      </div>
      {!isFolded &&
        children.map((child, index) => (
          <NavigatorBranch
            key={`${child.legalId}-${index}`}
            node={child}
            depth={depth + 1}
            folded={folded}
            onToggleFold={onToggleFold}
            onFly={onFly}
          />
        ))}
    </div>
  );
}
