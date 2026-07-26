"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  InputEditContext,
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
  const savedSelection = useRef<{
    outputs: LegalId[];
    folded: Set<string>;
  } | null>(null);
  // A restored view must come back exactly as it was — the dissect
  // effect consumes this instead of re-collapsing the restored graph.
  const restoreFoldedRef = useRef<Set<string> | null>(null);
  const openLens = (legalId: string) => {
    setInspected(null);
    setLensTrail((trail) => {
      if (trail.length === 0)
        savedSelection.current = {
          outputs: selectedOutputs,
          folded: new Set(folded),
        };
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
      // The trace tree is a DAG unrolled — the target can sit on
      // several paths, and the renderer may materialize any of them.
      // Unfold every ancestor on every path (the target itself keeps
      // its own fold state).
      const unfold = (node: TraceNode): boolean => {
        let viaChild = false;
        for (const child of node.children ?? []) {
          if (unfold(child)) viaChild = true;
        }
        if (viaChild) next.delete(node.legalId);
        return viaChild || node.legalId === legalId;
      };
      for (const id of selectedOutputs) {
        const root = structureTraces[id];
        if (root) unfold(root);
      }
      return next;
    });
    flyTo(legalId);
    // An Index click is a card click: open the info sheet, which also
    // pins the path highlight until it closes.
    inspectRule(legalId);
  };
  const inspectRule = (legalId: string) => {
    const rule = walkRuleById.get(legalId);
    if (!rule) return;
    setInspected({
      kind: "ruleRef",
      label: rule.name,
      legalId,
      canExpand: false,
      isParameter: rule.kind === "parameter",
      isOutput: selectedSet.has(legalId),
      verdictCls: "",
      value: "",
      isExpanded: false,
      showValues: false,
      meta: {
        kindLine: `${rule.kind === "parameter" ? "Parameter" : "Step"}${
          rule.dtype ? ` · ${rule.dtype}` : ""
        }`,
        legalId,
      },
    });
  };
  const closeLens = () => {
    setLensTrail([]);
    if (savedSelection.current) {
      setSelectedOutputs(savedSelection.current.outputs);
      restoreFoldedRef.current = savedSelection.current.folded;
      setFolded(savedSelection.current.folded);
    }
    savedSelection.current = null;
    // "Back to the map" should show the map — reframe the restored graph.
    setFlyTarget((current) => ({
      legalId: "*",
      nonce: (current?.nonce ?? 0) + 1,
    }));
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
    /** null at the origin — the first step picks the direction. */
    direction: "up" | "down" | null;
    trail: string[];
    /** Which step of the trail is in focus — stepping back does not
     *  drop the steps ahead. */
    cursor: number;
  } | null>(null);
  const [scenarioGlow, setScenarioGlow] = useState(false);
  const [outputsOpen, setOutputsOpen] = useState(false);
  const [indexSearch, setIndexSearch] = useState("");
  const [indexHover, setIndexHover] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [extraLevers, setExtraLevers] = useState<
    Array<{ name: string; sample: number | boolean }>
  >([]);
  const [leverSearch, setLeverSearch] = useState("");
  const [leverPickerOpen, setLeverPickerOpen] = useState(false);
  const [scenarioStep, setScenarioStep] = useState<
    "inputs" | "outputs" | "run"
  >("inputs");
  const [replay, setReplay] = useState<{
    stages: string[][];
    cursor: number;
  } | null>(null);
  const lastRunRequest = useRef<Record<string, unknown> | null>(null);
  const [copiedRun, setCopiedRun] = useState(false);
  // The law popup: the provision page at the node's level, embedded
  // read-only — the Plane is the only surface that navigates.
  const [lawPopup, setLawPopup] = useState<string | null>(null);
  const graphJustLoaded = useRef(false);
  const surveyPendingRef = useRef(false);
  const pendingOpeningRef = useRef<string | null>(null);
  // While a big selection lays out, the canvas hides behind a paper
  // veil — the map is composed off-stage and revealed once, whole.
  const [veiled, setVeiled] = useState(false);
  const veilTimer = useRef<number | null>(null);
  const veilFor = (ms: number) => {
    setVeiled(true);
    if (veilTimer.current) window.clearTimeout(veilTimer.current);
    veilTimer.current = window.setTimeout(() => setVeiled(false), ms);
  };
  const launcherRef = useRef<"open" | "leaving" | "closed">("open");
  const pendingReplay = useRef(false);
  // The scenario runner belongs to the "Run a scenario" journey only —
  // survey and rule journeys keep a quieter sidebar.
  const [scenarioMode, setScenarioMode] = useState(false);
  const [scenarioSetupOpen, setScenarioSetupOpen] = useState(false);
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
    launcherRef.current = "leaving";
    window.setTimeout(() => {
      setLauncher("closed");
      launcherRef.current = "closed";
      // The opening flight waited for the fade — fire it now unless a
      // journey has claimed the camera in the meantime.
      const pending = pendingOpeningRef.current;
      if (pending) {
        pendingOpeningRef.current = null;
        flyTo(pending);
        inspectRule(pending);
      }
    }, 420);
  };
  const reopenJourney = () => {
    setLauncherStep(effectiveProgram ? "intent" : "program");
    setScenarioSetupOpen(false);
    setIntentSearch("");
    setIntentSearchOpen(false);
    setIntentKind("input");
    setIntentInput(null);
    setLauncher("open");
  };
  const applySurvey = () => {
    pendingOpeningRef.current = null;
    surveyRef.current = true;

    setSelectedOutputs(outputRules.map((rule) => rule.legalId));
    setFolded((current) => (current.size === 0 ? current : new Set()));
    const summit = summitOutput ?? outputRules[0]?.legalId ?? null;
    setFlyTarget((current) => ({
      legalId: summit ?? "*",
      nonce: (current?.nonce ?? 0) + 1,
    }));
    // Arriving at the summit, its story opens with it.
    if (summit) inspectRule(summit);
  };
  const beginSurvey = () => {
    dismissLauncher();
    setScenarioMode(false);
    // The whole law, literally: every result selected, everything
    // unfolded, camera on the summit. If the graph is still loading,
    // the survey applies the moment it lands — one intent, no interim
    // flight. Otherwise the heavy unfold waits for the launcher fade
    // so its one-time layout stall hits a still screen.
    if (outputRules.length === 0) {
      surveyPendingRef.current = true;
      veilFor(2400);
      return;
    }
    veilFor(1500);
    applySurvey();
  };
  const beginScenario = () => {
    dismissLauncher();
    setScenarioMode(true);
    setScenarioStep("inputs");
    setReplay(null);
    setScenarioGlow(true);
    window.setTimeout(() => setScenarioGlow(false), 2600);
  };
  const beginRuleLens = (legalId: string) => {
    dismissLauncher();
    startWalkAt(legalId);
  };
  const walkRuleById = useMemo(
    () => new Map((graph?.rules ?? []).map((rule) => [rule.legalId, rule])),
    [graph],
  );
  const walkInputById = useMemo(
    () => new Map((graph?.inputs ?? []).map((input) => [input.legalId, input])),
    [graph],
  );
  // The summit: the terminal result with the deepest dependency
  // closure — the box the whole law rolls up into (Allotment,
  // Benefit). The easiest handhold for a first look.
  const summitOutput = useMemo(() => {
    if (!graph) return null;
    const byId = new Map(graph.rules.map((rule) => [rule.legalId, rule]));
    let best: string | null = null;
    let bestSize = -1;
    for (const id of graph.terminalOutputs) {
      const seen = new Set<string>();
      const stack = [id];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (seen.has(current)) continue;
        seen.add(current);
        const rule = byId.get(current);
        if (rule) stack.push(...rule.ruleDeps);
      }
      if (seen.size > bestSize) {
        bestSize = seen.size;
        best = id;
      }
    }
    return best;
  }, [graph]);

  const consumersOf = (legalId: string) =>
    (graph?.rules ?? []).filter(
      (rule) =>
        rule.ruleDeps.includes(legalId) || rule.inputDeps.includes(legalId),
    );
  const savedWalkSelection = useRef<{
    outputs: LegalId[];
    folded: Set<string>;
  } | null>(null);
  // Resolve a trail entry to the rule that anchors it on the canvas
  // (inputs stand on their first consumer).
  const walkAnchorOf = (legalId: string): string | null => {
    if (walkRuleById.has(legalId)) return legalId;
    return consumersOf(legalId)[0]?.legalId ?? null;
  };
  const focusWalkTrail = (
    direction: "up" | "down" | null,
    trail: string[],
  ) => {
    const current = trail[trail.length - 1];
    if (direction === "up") {
      // Climbing accumulates: every visited step stays on the canvas,
      // so the graph grows with the journey.
      const anchors = [
        ...new Set(
          trail
            .map((id) => walkAnchorOf(id))
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (anchors.length > 0) setSelectedOutputs(anchors);
    } else {
      // Descending narrows: the canvas is the subtree still ahead.
      const anchor = walkAnchorOf(current);
      if (anchor) setSelectedOutputs([anchor]);
    }
    setFlyTarget((prev) => ({
      legalId: current,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  };
  // "How does this rule work?" — open the walk AT the rule, both
  // directions on offer; the first step decides up or down.
  const startWalkAt = (legalId: string) => {
    pendingOpeningRef.current = null;
    setInspected(null);

    setScenarioMode(false);
    savedWalkSelection.current = {
      outputs: selectedOutputs,
      folded: new Set(folded),
    };
    setWalk({ direction: null, trail: [legalId], cursor: 0 });
    focusWalkTrail(null, [legalId]);
  };
  const startWalk = (direction: "up" | "down", legalId: string) => {
    pendingOpeningRef.current = null;
    dismissLauncher();

    setScenarioMode(false);
    savedWalkSelection.current = {
      outputs: selectedOutputs,
      folded: new Set(folded),
    };
    setWalk({ direction, trail: [legalId], cursor: 0 });
    focusWalkTrail(direction, [legalId]);
  };
  const walkTo = (legalId: string, direction?: "up" | "down") => {
    setWalk((current) => {
      if (!current) return current;
      const nextDirection = current.direction ?? direction ?? "down";
      // Advancing from mid-trail branches off: keep up to the cursor,
      // then append.
      const trail = [...current.trail.slice(0, current.cursor + 1), legalId];
      focusWalkTrail(nextDirection, trail);
      return { ...current, direction: nextDirection, trail, cursor: trail.length - 1 };
    });
  };
  const walkFocus = (index: number) => {
    if (!walk || index === walk.cursor) return;
    // The cursor drives the scope: stepping back re-roots the canvas
    // to that step's view (down-walks widen again, up-walks shrink),
    // and the camera flies with it.
    setWalk({ ...walk, cursor: index });
    focusWalkTrail(walk.direction, walk.trail.slice(0, index + 1));
  };
  const endWalk = () => {
    setWalk(null);
    if (savedWalkSelection.current) {
      setSelectedOutputs(savedWalkSelection.current.outputs);
      restoreFoldedRef.current = savedWalkSelection.current.folded;
      setFolded(savedWalkSelection.current.folded);
      savedWalkSelection.current = null;
    }
  };

  const intentMatches = useMemo(() => {
    // Search AND dropdown: an empty query browses the full list,
    // typing filters it.
    const query = intentSearch.trim().toLowerCase();
    if (!graph) return [];
    if (intentKind === "input") {
      const seen = new Set<string>();
      return graph.inputs
        .filter((input) => {
          if (seen.has(input.name)) return false;
          seen.add(input.name);
          return !query || input.name.toLowerCase().includes(query);
        })
        .map((input) => ({ legalId: input.legalId, name: input.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 60);
    }
    return graph.rules
      .filter(
        (rule) =>
          rule.kind === "derived" &&
          (!query || rule.name.toLowerCase().includes(query)),
      )
      .map((rule) => ({ legalId: rule.legalId, name: rule.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 60);
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

  const allScenarioFields = useMemo(() => {
    const seen = new Set(scenarioFields.map((field) => field.name));
    const extras = extraLevers
      .filter((lever) => !seen.has(lever.name))
      .map((lever) => ({
        name: lever.name,
        label: lever.name,
        sample: lever.sample,
      }));
    return [...scenarioFields, ...extras];
  }, [scenarioFields, extraLevers]);

  useEffect(() => {
    setExtraLevers([]);
    setLeverSearch("");
    setLeverPickerOpen(false);
    setRunResult(null);
    setRunError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProgram?.programId]);

  useEffect(() => {
    // Adding a lever must not wipe values the user already edited.
    setScenario((current) =>
      Object.fromEntries(
        allScenarioFields.map((field) => [
          field.name,
          current[field.name] ?? field.sample,
        ]),
      ),
    );
  }, [allScenarioFields]);

  const runScenario = async (mode: "all" | "steps" = "all") => {
    if (!effectiveProgram || running) return;
    pendingReplay.current = mode === "steps";
    setReplay(null);
    setRunning(true);
    setRunError(null);
    try {
      // Trace the selected outputs plus their reachable rules so the
      // execution lights intermediate nodes, not just the results.
      // Derived rules only — asking the engine to trace a parameter
      // fails the whole run ("unknown derived output").
      const reachable = new Set<string>();
      const byId = new Map((graph?.rules ?? []).map((r) => [r.legalId, r]));
      const visited = new Set<string>();
      const walk = (id: string) => {
        if (visited.has(id) || reachable.size > 160) return;
        visited.add(id);
        const rule = byId.get(id);
        if (!rule) return;
        // Person/member-entity rules cannot be traced against the
        // abstract unit household — one of them fails the whole run.
        // Traverse through them, but never request them as variables.
        const personLevel =
          rule.entity != null && /person|member/i.test(rule.entity);
        if (rule.kind === "derived" && !personLevel) reachable.add(id);
        for (const dep of rule.ruleDeps) walk(dep);
      };
      // A survey selects every ranked result; tracing from that soup
      // includes variables the engine rejects and starves the whole
      // trace. Big selections trace from the true computation — the
      // terminal results — instead.
      const traceRoots =
        selectedOutputs.length > 24
          ? (graph?.terminalOutputs ?? []).filter((id) =>
              walkRuleById.has(id),
            )
          : selectedOutputs;
      for (const id of traceRoots) walk(id);
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
      // One bad or excess trace variable fails the whole run, so walk
      // a ladder — each rung keeps as many intermediates as the
      // engine will accept before giving up on tracing entirely.
      let response: Response | null = null;
      for (const cap of [96, 48, 24, 0]) {
        const variables = [...reachable].slice(0, cap);
        lastRunRequest.current = {
          jurisdiction: effectiveProgram.jurisdiction,
          program_id: effectiveProgram.programId,
          values: scenario,
          variables,
        };
        response = await attempt(variables);
        if (response.ok) break;
      }
      if (!response || !response.ok)
        throw new Error(`run failed (${response?.status ?? "?"})`);
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
        graphJustLoaded.current = true;
        setGraph(nextGraph);
        if (surveyPendingRef.current || !pendingFocusRef.current) {
          // The survey IS the default view: first render shows the
          // whole law (deep links with ?focus keep their scoped view).
          surveyPendingRef.current = false;
          surveyRef.current = true;
          setFolded((current) => (current.size === 0 ? current : new Set()));
          setSelectedOutputs(
            rankOutputRules(nextGraph, { includeLeaves: false }).map(
              (rule) => rule.legalId,
            ),
          );
          return;
        }
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
  const inputEditValues = useMemo(() => {
    const values: Record<string, number | boolean> = {};
    for (const input of graph?.inputs ?? []) {
      const fromScenario = scenario[input.name];
      if (typeof fromScenario === "number" || typeof fromScenario === "boolean") {
        values[input.name] = fromScenario;
      } else if (
        typeof input.sample === "number" ||
        typeof input.sample === "boolean"
      ) {
        values[input.name] = input.sample;
      }
    }
    return values;
  }, [graph, scenario]);
  const inputEditCtx = useMemo(
    () => ({
      values: inputEditValues,
      onChange: (name: string, value: number | boolean) =>
        setScenario((current) => {
          if (typeof value === "number" && Number.isNaN(value)) {
            // Cleared on the card — stop sending it.
            const { [name]: _dropped, ...rest } = current;
            return rest;
          }
          return { ...current, [name]: value };
        }),
    }),
    [inputEditValues],
  );

  const structureTraces = useMemo(
    () => buildStructureTraces(graph, selectedOutputs),
    [graph, selectedOutputs],
  );
  // What the canvas currently shows — search results inside it fly
  // in place; results outside re-scope to their rule.
  const inScopeIds = useMemo(() => {
    const scope = new Set<string>();
    const collect = (node: TraceNode) => {
      scope.add(node.legalId);
      for (const child of node.children ?? []) collect(child);
    };
    for (const id of selectedOutputs) {
      const root = structureTraces[id];
      if (root) collect(root);
    }
    return scope;
  }, [selectedOutputs, structureTraces]);
  const indexMatches = useMemo(() => {
    const query = indexSearch.trim().toLowerCase();
    if (!graph) return [];
    // Empty query browses the whole program; every query word must
    // appear, any order — "monthly income" finds Monthly Household
    // Income.
    const tokens = query ? query.split(/\s+/) : [];
    const hits = (label: string) => {
      if (tokens.length === 0) return true;
      const hay = label.toLowerCase();
      return tokens.every((token) => hay.includes(token));
    };
    // Global: search the whole program, always — rules (results and
    // every intermediate) and the questions that feed them.
    const rules = graph.rules
      .filter((rule) => hits(humanize(rule.name)))
      .map((rule) => ({
        legalId: rule.legalId,
        label: humanize(rule.name),
        kind:
          rule.kind === "parameter"
            ? ("parameter" as const)
            : ("rule" as const),
        inScope: inScopeIds.has(rule.legalId),
      }));
    const seenNames = new Set<string>();
    const inputs = graph.inputs
      .filter((input) => {
        if (seenNames.has(input.name)) return false;
        seenNames.add(input.name);
        return hits(humanize(input.name));
      })
      .map((input) => ({
        legalId: input.legalId,
        label: humanize(input.name),
        kind: "input" as const,
        inScope: inScopeIds.has(input.legalId),
      }));
    return [...rules, ...inputs]
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 100);
  }, [indexSearch, graph, inScopeIds]);
  // Take me there — wherever "there" is: in-scope results fly in
  // place; out-of-scope results leave the walk and re-root on the
  // rule itself.
  const goToSearchResult = (match: {
    legalId: string;
    kind: "rule" | "parameter" | "input";
    inScope: boolean;
  }) => {
    if (match.inScope) {
      flyFromIndex(match.legalId);
      if (match.kind === "input") inspectInput(match.legalId);
      return;
    }
    if (walk) endWalk();
    if (match.kind === "input") {
      // A question can't root the canvas — stand on its first
      // consumer so the question renders, then land on it.
      const consumer = consumersOf(match.legalId)[0];
      if (consumer) setSelectedOutputs([consumer.legalId]);
      flyTo(match.legalId);
      inspectInput(match.legalId);
      return;
    }
    setSelectedOutputs([match.legalId]);
    flyTo(match.legalId);
    inspectRule(match.legalId);
  };
  const inspectInput = (legalId: string) => {
    const input = walkInputById.get(legalId);
    if (!input) return;
    setInspected({
      kind: "input",
      label: input.name,
      legalId,
      source: "default",
      canExpose: false,
      value: "",
      showValues: false,
      meta: { kindLine: "Question", legalId },
    });
  };

  // A fresh graph opens on the summit — the same box every other
  // entry lands on, so no flight ever retargets mid-air.
  useEffect(() => {
    if (!graphJustLoaded.current || selectedOutputs.length === 0) return;
    graphJustLoaded.current = false;
    const summit = summitOutput ?? selectedOutputs[0];
    if (launcherRef.current !== "closed") {
      // Never move the camera behind the launcher — it reads as a
      // random zoom through the backdrop. Fly when the fade ends.
      pendingOpeningRef.current = summit;
      return;
    }
    setFlyTarget((current) => ({
      legalId: summit,
      nonce: (current?.nonce ?? 0) + 1,
    }));
    if (summitOutput) inspectRule(summitOutput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutputs, summitOutput]);

  // Dissect on program/selection/lens change; unfold the executed
  // path when a run lands.
  useEffect(() => {
    const key =
      Object.keys(structureTraces).sort().join("|") +
      "::" +
      (lensTrail.length > 0 || walk ? "always" : "auto");
    if (foldedInitialized.current !== key) {
      foldedInitialized.current = key;
      if (restoreFoldedRef.current) {
        // A lens or walk just closed — bring back the exact fold
        // state the user left, not a fresh dissection.
        setFolded(restoreFoldedRef.current);
        restoreFoldedRef.current = null;
      } else if (surveyRef.current) {
        // A survey just selected everything — keep it unfolded
        // instead of re-dissecting the new selection. Identity-stable:
        // a fresh empty Set would trigger a second full relayout.
        surveyRef.current = false;
        setFolded((current) => (current.size === 0 ? current : new Set()));
      } else if (walk) {
        // Walk scope is the selection itself: the origin shows the
        // rule's whole downstream tree, descending re-roots into a
        // smaller fully-open tree, ascending accumulates a larger
        // one. Nothing folds while walking.
        setFolded((current) => (current.size === 0 ? current : new Set()));
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
  // Topological stages of the executed path — the step-by-step replay
  // steps through these, values and all.
  const buildExecStages = (executed: Set<string>): string[][] => {
    const executedRules = [...executed].filter((id) => walkRuleById.has(id));
    const done = new Set<string>();
    const stages: string[][] = [];
    let remaining = executedRules;
    while (remaining.length > 0) {
      const fireable = remaining.filter((id) => {
        const rule = walkRuleById.get(id);
        if (!rule) return true;
        return rule.ruleDeps.every(
          (dep) => !executed.has(dep) || done.has(dep),
        );
      });
      if (fireable.length === 0) {
        stages.push(remaining);
        break;
      }
      stages.push(fireable);
      for (const id of fireable) done.add(id);
      remaining = remaining.filter((id) => !done.has(id));
    }
    return stages;
  };

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
    if (!runResult || !pendingReplay.current) return;
    pendingReplay.current = false;
    const stages = buildExecStages(liveTraces.executed);
    if (stages.length > 0) setReplay({ stages, cursor: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runResult, liveTraces]);

  // The canvas lights only up to the replay cursor while stepping.
  const effectiveExecuted = useMemo(() => {
    if (!replay) return liveTraces.executed;
    const subset = new Set<string>();
    for (let index = 0; index <= replay.cursor; index++) {
      for (const id of replay.stages[index] ?? []) subset.add(id);
    }
    // Inputs feeding the lit rules stay lit too.
    for (const id of liveTraces.executed) {
      if (!walkRuleById.has(id)) subset.add(id);
    }
    return subset;
  }, [replay, liveTraces, walkRuleById]);


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
    setOutputsOpen(false);
    setCountry(countryOf(next.jurisdiction));
    setProgram(programRefFromSummary(next));
    setGraph(null);
    setSelectedOutputs([]);
  }

  const launchRun = (mode: "all" | "steps") => {
    setScenarioMode(true);
    if (launcher !== "closed") dismissLauncher();
    void runScenario(mode);
  };

  // One scenario flow, two homes: the launcher's middle screen and
  // the sidebar panel render the same staged UI.
  const scenarioFlowUI = (
    <>
            <div className="scenario-steps" role="tablist" aria-label="Scenario stages">
              {(
                [
                  ["inputs", "1 · Inputs"],
                  ["outputs", "2 · Outputs"],
                  ["run", "3 · Run"],
                ] as const
              ).map(([step, label]) => (
                <button
                  key={step}
                  type="button"
                  role="tab"
                  aria-selected={scenarioStep === step}
                  className={`scenario-step-tab ${scenarioStep === step ? "is-active" : ""}`}
                  onClick={() => setScenarioStep(step)}
                >
                  {label}
                </button>
              ))}
            </div>
            {scenarioStep === "inputs" && (
            <>
            <div className="scenario-fields">
              {allScenarioFields.map((field) => (
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
            <div className="lever-picker">
              <button
                type="button"
                className="lever-picker-toggle"
                onClick={() => setLeverPickerOpen((open) => !open)}
                aria-expanded={leverPickerOpen}
              >
                ＋ Add input
              </button>
              {leverPickerOpen && (
                <div className="lever-picker-panel">
                  <input
                    type="search"
                    value={leverSearch}
                    onChange={(event) => setLeverSearch(event.target.value)}
                    placeholder="Search inputs..."
                    aria-label="Search inputs to add"
                  />
                  <div className="lever-row lever-row-head" aria-hidden>
                    <span className="lever-row-name">Input</span>
                    <span className="lever-row-cell">Entity</span>
                    <span className="lever-row-cell">Type</span>
                    <span className="lever-row-cell">Default</span>
                    <span />
                  </div>
                  <div className="lever-picker-list">
                    {(graph?.inputs ?? [])
                      .filter((input, index, list) => {
                        if (
                          list.findIndex((i) => i.name === input.name) !==
                          index
                        )
                          return false;
                        const query = leverSearch.trim().toLowerCase();
                        return (
                          !query ||
                          humanize(input.name)
                            .toLowerCase()
                            .includes(query)
                        );
                      })
                      .slice(0, 30)
                      .map((input) => {
                        const isBase = scenarioFields.some(
                          (field) => field.name === input.name,
                        );
                        const isExtra = extraLevers.some(
                          (lever) => lever.name === input.name,
                        );
                        const selected = isBase || isExtra;
                        return (
                          <button
                            type="button"
                            key={input.legalId}
                            className={`lever-row ${selected ? "is-selected" : ""}`}
                            disabled={isBase}
                            title={
                              isBase
                                ? "Always part of this scenario"
                                : selected
                                  ? "Remove from the scenario"
                                  : "Add to the scenario"
                            }
                            onClick={() => {
                              if (isBase) return;
                              if (isExtra) {
                                setExtraLevers((current) =>
                                  current.filter(
                                    (lever) => lever.name !== input.name,
                                  ),
                                );
                                return;
                              }
                              const sample = input.sample;
                              setExtraLevers((current) => [
                                ...current,
                                {
                                  name: input.name,
                                  sample:
                                    typeof sample === "number" ||
                                    typeof sample === "boolean"
                                      ? sample
                                      : 0,
                                },
                              ]);
                            }}
                          >
                            <span className="lever-row-name">
                              {humanize(input.name)}
                            </span>
                            <span className="lever-row-cell">
                              {input.entity ? humanize(input.entity) : "—"}
                            </span>
                            <span className="lever-row-cell">
                              {typeof input.sample === "boolean"
                                ? "yes / no"
                                : typeof input.sample === "number"
                                  ? "number"
                                  : "—"}
                            </span>
                            <span className="lever-row-cell">
                              {input.sample !== undefined &&
                              input.sample !== null
                                ? String(input.sample)
                                : "—"}
                            </span>
                            <span
                              className={`lever-row-add ${selected ? "is-checked" : ""}`}
                              aria-hidden
                            >
                              {selected ? "✓" : "＋"}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="run-button scenario-next"
              onClick={() => setScenarioStep("outputs")}
            >
              Next · pick outputs →
            </button>
            </>
            )}
            {scenarioStep === "outputs" && (
              <>
                {selectedOutputRules.length > 12 ? (
                  <div className="selected-output-summary">
                    <span>{selectedOutputRules.length} results selected</span>
                    <button type="button" onClick={() => setSelectedOutputs([])}>
                      Clear all
                    </button>
                  </div>
                ) : selectedOutputRules.length > 0 ? (
                  <div className="selected-output-list" aria-label="Selected outputs">
                    {selectedOutputRules.map((output) => (
                      <button
                        type="button"
                        key={output.legalId}
                        onClick={() => toggleOutput(output.legalId)}
                        title="Remove output"
                      >
                        {output.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <label className="output-search">
                  <span>Search outputs</span>
                  <input
                    type="search"
                    value={outputSearch}
                    onChange={(event) => setOutputSearch(event.target.value)}
                    placeholder="Eligibility, allotment, income..."
                  />
                </label>
                <div className="output-row output-row-head" aria-hidden>
                  <span className="output-row-name">Result</span>
                  <span className="output-row-cell">Type</span>
                  <span className="output-row-cell">Entity</span>
                  <span className="output-row-cell">Period</span>
                </div>
                <div className="output-list scenario-output-list">
                  {filteredOutputRules.map((rule) => (
                    <button
                      type="button"
                      key={rule.legalId}
                      className={`output-option output-row ${selectedSet.has(rule.legalId) ? "is-selected" : ""}`}
                      onClick={() => toggleOutput(rule.legalId)}
                    >
                      <span className="output-row-name">
                        {humanize(rule.name)}
                      </span>
                      <span className="output-row-cell">
                        {[rule.dtype, rule.unit].filter(Boolean).join(" · ") ||
                          "—"}
                      </span>
                      <span className="output-row-cell">
                        {rule.entity ? humanize(rule.entity) : "—"}
                      </span>
                      <span className="output-row-cell">
                        {rule.period ?? "—"}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="run-button scenario-next"
                  disabled={selectedOutputs.length === 0}
                  onClick={() => setScenarioStep("run")}
                >
                  Next · run →
                </button>
              </>
            )}
            {scenarioStep === "run" && (
              <>
                <p className="scenario-run-summary">
                  {allScenarioFields.length}{" "}
                  {allScenarioFields.length === 1 ? "input" : "inputs"} ·{" "}
                  {selectedOutputs.length}{" "}
                  {selectedOutputs.length === 1 ? "output" : "outputs"}{" "}
                  selected.
                </p>
                <button
                  type="button"
                  className="run-button"
                  disabled={running || selectedOutputs.length === 0}
                  onClick={() => launchRun("all")}
                >
                  {running ? "Running…" : "▶ Run it all"}
                </button>
                <button
                  type="button"
                  className="run-button run-button-secondary"
                  disabled={running || selectedOutputs.length === 0}
                  onClick={() => launchRun("steps")}
                >
                  ⧉ Run step by step
                </button>
                {runError && <p className="run-error">{runError}</p>}
              </>
            )}
    </>
  );

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
            Pick a program — the whole law opens on the canvas: search it,
            walk any rule, answer questions, and run.
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
                    // The one entry point: pick the law, land on the
                    // whole graph at its summit. Everything else lives
                    // on the canvas.
                    surveyPendingRef.current = true;
                    veilFor(2600);
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
        </div>
      </div>
    )}
    <main className={`app-shell no-sidebar ${walk ? "walk-active" : ""}`}>

      <section className="viewer-panel">
        <div className="top-controls">
            <select
              className="program-select"
              aria-label="Select program"
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
            <div className="top-search">
              <input
                type="search"
                value={indexSearch}
                onChange={(event) => setIndexSearch(event.target.value)}
                onFocus={() => {
                  setSearchOpen(true);
                  // Searching is a navigation intent — the launcher
                  // steps aside so results are reachable.
                  if (launcher !== "closed") dismissLauncher();
                }}
                onBlur={() =>
                  // Delay so a result click lands before the list closes.
                  window.setTimeout(() => setSearchOpen(false), 180)
                }
                placeholder="Search the law..."
                aria-label="Search rules"
              />
              {searchOpen && (
                <div className="top-search-results" aria-label="Search results">
                  {indexMatches.map((match) => (
                    <button
                      type="button"
                      key={match.legalId}
                      onClick={() => {
                        setSearchOpen(false);
                        goToSearchResult(match);
                      }}
                      onMouseEnter={() => setIndexHover(match.legalId)}
                      onMouseLeave={() => setIndexHover(null)}
                      title="Fly to this on the canvas"
                    >
                      <span className="top-search-kind">
                        {match.kind === "input"
                          ? "?"
                          : match.kind === "parameter"
                            ? "π"
                            : "ƒ"}
                      </span>
                      {match.label}
                    </button>
                  ))}
                  {indexMatches.length === 0 && (
                    <div className="output-empty">No rules match this search.</div>
                  )}
                </div>
              )}
            </div>
          <span className="top-meta">
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
          <div
            className={`graph-veil ${veiled ? "is-on" : ""}`}
            aria-hidden={!veiled}
          >
            <span>composing the map…</span>
          </div>
          <button
            type="button"
            className="journey-toggle"
            disabled={running}
            onClick={() => launchRun("all")}
            title="Execute the law with the answers currently on the canvas"
          >
            {running ? "Running…" : "▶ Run"}
          </button>
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
            <InputEditContext.Provider value={inputEditCtx}>
            <InteractiveRuleGraph
              spec={spec}
              traces={liveTraces.traces}
              showValues={Boolean(runResult)}
              executionActive={Boolean(runResult)}
              executedLegalIds={effectiveExecuted}
              dissect={lensFocusId || walk ? "always" : "auto"}
              collapsed={folded}
              onCollapsedChange={setFolded}
              flyTo={flyTarget}
              walkTrail={walk ? walk.trail.slice(0, walk.cursor + 1) : null}
              onInspect={focusNode}
              pinnedLegalId={
                inspected && "legalId" in inspected && inspected.legalId
                  ? inspected.legalId
                  : null
              }
              hoverLegalId={indexHover}
              onPaneClear={() => setInspected(null)}
              onLens={openLens}
              parameterRules={parameterRules}
              selectedOutputIds={selectedSet}
            />
            </InputEditContext.Provider>
          ) : (
            <div className="empty-state">Select at least one output to render its computation graph.</div>
          )}
        </div>

        {walk && (() => {
          const currentId = walk.trail[walk.cursor];
          const rule = walkRuleById.get(currentId);
          const input = walkInputById.get(currentId);
          const isUp = walk.direction === "up";
          const atOrigin = walk.direction === null;
          const nextUp =
            isUp || atOrigin ? consumersOf(currentId) : [];
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
          const atEnd = atOrigin
            ? nextUp.length === 0 && depRules.length === 0
            : isUp
              ? nextUp.length === 0
              : depRules.length === 0;
          const name = humanize(
            (rule?.name ?? input?.name ?? currentId.split("#").pop()) || "",
          );
          const value = valueByLegalId.get(currentId) ?? null;
          return (
            <aside className="walk-panel" aria-label="Guided walk">
              <div className="walk-head">
                <button
                  type="button"
                  className="results-close"
                  onClick={endWalk}
                  aria-label="End the walk"
                >
                  ×
                </button>
              </div>
              <ol className="walk-sequence" aria-label="Walk sequence">
                {walk.trail.map((id, index) => (
                  <li key={`${id}-${index}`}>
                    <button
                      type="button"
                      className={index === walk.cursor ? "is-current" : ""}
                      onClick={() => walkFocus(index)}
                    >
                      {humanize(
                        (walkRuleById.get(id)?.name ??
                          walkInputById.get(id)?.name ??
                          id.split("#").pop()) || "",
                      )}
                    </button>
                  </li>
                ))}
              </ol>

              <div className="walk-card">
                <span className="walk-kind">
                  {input
                    ? "Question"
                    : rule?.kind === "parameter"
                      ? "Parameter · a constant of the law"
                      : "Rule"}
                </span>
                <h2>{name}</h2>
                {rule?.kind === "parameter" && rule.formula ? (
                  <p className="parameter-value">
                    {formatParameterValue(
                      rule.formula.replace(/\s+/g, " ").trim(),
                      rule.unit ?? null,
                    )}
                  </p>
                ) : null}
                {value !== null && <p className="walk-value">{value}</p>}
                {(() => {
                  const cite =
                    rule?.source ??
                    (currentId
                      ? humanizeCitation(fileLegalIdOf(currentId))
                      : null);
                  if (!cite || /composition/i.test(cite)) return null;
                  return (
                    <p className="walk-cite">
                      {rule?.sourceUrl ? (
                        <a
                          href={rule.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {cite} ↗
                        </a>
                      ) : (
                        cite
                      )}
                    </p>
                  );
                })()}
                {input && (
                  <p className="walk-note">
                    A fact asked of the household — the raw material of the
                    computation.
                  </p>
                )}
                <dl className="node-inspector-meta walk-meta">
                  {(rule?.entity ?? input?.entity) ? (
                    <>
                      <dt>Entity</dt>
                      <dd>
                        {humanize((rule?.entity ?? input?.entity) as string)}
                      </dd>
                    </>
                  ) : null}
                  {rule?.period ? (
                    <>
                      <dt>Period</dt>
                      <dd>{rule.period}</dd>
                    </>
                  ) : null}
                  {rule?.unit ? (
                    <>
                      <dt>Unit</dt>
                      <dd>{rule.unit}</dd>
                    </>
                  ) : null}
                  {null}
                  {rule &&
                  (rule.ruleDeps.length > 0 || rule.inputDeps.length > 0) ? (
                    <>
                      <dt>Depends on</dt>
                      <dd>
                        <details className="node-inspector-deps">
                          <summary>
                            {[
                              rule.ruleDeps.length > 0
                                ? `${rule.ruleDeps.length} ${rule.ruleDeps.length === 1 ? "rule" : "rules"}`
                                : null,
                              rule.inputDeps.length > 0
                                ? `${rule.inputDeps.length} ${rule.inputDeps.length === 1 ? "question" : "questions"}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </summary>
                          <div className="node-inspector-consumers">
                            {rule.ruleDeps.map((depId) => (
                              <button
                                type="button"
                                key={depId}
                                onClick={() => flyFromIndex(depId)}
                                title="Fly to this rule on the canvas"
                              >
                                {humanize(
                                  walkRuleById.get(depId)?.name ??
                                    depId.split("#").pop() ??
                                    depId,
                                )}
                              </button>
                            ))}
                            {rule.inputDeps.map((depId) => (
                              <span
                                key={depId}
                                className="node-inspector-dep-q"
                              >
                                {humanize(
                                  walkInputById.get(depId)?.name ??
                                    (depId.split("#").pop() ?? depId)
                                      .split(".")
                                      .pop() ??
                                    depId,
                                )}
                              </span>
                            ))}
                          </div>
                        </details>
                      </dd>
                    </>
                  ) : null}
                  {currentId ? (
                    <>
                      <dt>Legal ID</dt>
                      <dd className="node-inspector-mono" title={currentId}>
                        {currentId}
                      </dd>
                    </>
                  ) : null}
                  {input && input.sample !== undefined && input.sample !== null ? (
                    <>
                      <dt>Default</dt>
                      <dd className="node-inspector-mono">
                        {typeof input.sample === "object"
                          ? JSON.stringify(input.sample)
                          : String(input.sample)}
                      </dd>
                    </>
                  ) : null}
                </dl>
                {rule?.formula && rule.kind !== "parameter" && (
                  <details className="node-inspector-code walk-code">
                    <summary>Formula</summary>
                    <div className="node-inspector-code-body">
                      <FormulaPretty source={rule.formula} />
                    </div>
                  </details>
                )}
              </div>

              <div className="walk-arrows" aria-label="Walk navigation">
                <button
                  type="button"
                  disabled={walk.cursor === 0}
                  onClick={() => walkFocus(walk.cursor - 1)}
                  aria-label="Previous step"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={walk.cursor >= walk.trail.length - 1 && atEnd}
                  onClick={() => {
                    if (walk.cursor < walk.trail.length - 1) {
                      walkFocus(walk.cursor + 1);
                    } else if (atOrigin) {
                      if (depRules.length > 0) walkTo(depRules[0].legalId, "down");
                      else if (nextUp.length > 0) walkTo(nextUp[0].legalId, "up");
                    } else if (isUp && nextUp.length > 0) {
                      walkTo(nextUp[0].legalId);
                    } else if (!isUp && depRules.length > 0) {
                      walkTo(depRules[0].legalId);
                    }
                  }}
                  aria-label="Next step"
                >
                  →
                </button>
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
                        {rule?.kind === "parameter"
                          ? `${name} is a constant fixed by the law — nothing further to unfold.`
                          : depInputs.length > 0
                            ? `${name} rests directly on ${depInputs.length} household ${depInputs.length === 1 ? "question" : "questions"}.`
                            : `${name} rests on no further rules.`}
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
              ) : atOrigin ? (
                <div className="walk-next">
                  {depRules.length > 0 && (
                    <>
                      <span className="walk-next-label">
                        Built from {depRules.length}{" "}
                        {depRules.length === 1 ? "rule" : "rules"} — walk down:
                      </span>
                      <div className="walk-choices">
                        {depRules.slice(0, 6).map((next) => (
                          <button
                            key={next.legalId}
                            type="button"
                            onClick={() => walkTo(next.legalId, "down")}
                          >
                            {humanize(next.name)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {nextUp.length > 0 && (
                    <>
                      <span className="walk-next-label">
                        Feeds {nextUp.length}{" "}
                        {nextUp.length === 1 ? "rule" : "rules"} — walk up:
                      </span>
                      <div className="walk-choices">
                        {nextUp.slice(0, 6).map((next) => (
                          <button
                            key={next.legalId}
                            type="button"
                            onClick={() => walkTo(next.legalId, "up")}
                          >
                            {humanize(next.name)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {depInputs.length > 0 && (
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
              ) : (
                <div className="walk-next">
                  <span className="walk-next-label">
                    {isUp
                      ? `Feeds ${nextUp.length} ${nextUp.length === 1 ? "rule" : "rules"} — walk on:`
                      : `Computed from ${depRules.length} ${depRules.length === 1 ? "rule" : "rules"}:`}
                  </span>
                  <div className="walk-choices">
                    {(isUp ? nextUp : depRules).slice(0, 9).map((next) => (
                      <button
                        key={next.legalId}
                        type="button"
                        onClick={() => walkTo(next.legalId)}
                      >
                        {humanize(next.name)}
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

        {inspected &&
          (() => {
            const legalId =
              "legalId" in inspected && inspected.legalId
                ? inspected.legalId
                : null;
            const rule = legalId ? (walkRuleById.get(legalId) ?? null) : null;
            const input = legalId ? (walkInputById.get(legalId) ?? null) : null;
            const consumers = legalId ? consumersOf(legalId) : [];
            const meta = "meta" in inspected ? inspected.meta : undefined;
            const formula = meta?.formula ?? rule?.formula ?? null;
            const citation =
              meta?.citation ??
              rule?.source ??
              (legalId ? humanizeCitation(fileLegalIdOf(legalId)) : null);
            const parameterValue =
              meta?.parameterValue ??
              (rule?.kind === "parameter" && rule.formula
                ? rule.formula.replace(/\s+/g, " ").trim().slice(0, 140)
                : null);
            return (
          <aside className="node-inspector" aria-label="Node details">
            <div className="node-inspector-head">
              <span className="node-inspector-kind">
                {meta?.kindLine ||
                  (rule
                    ? `${rule.kind ?? "rule"}${rule.dtype ? ` · ${rule.dtype}` : ""}`
                    : inspected.kind)}
              </span>
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
              {humanize("label" in inspected ? (inspected.label ?? "") : "")}
            </h2>
            {parameterValue ? (
              <p className="parameter-value">
                {formatParameterValue(parameterValue, rule?.unit ?? null)}
              </p>
            ) : null}
            {"value" in inspected &&
            inspected.value &&
            "showValues" in inspected &&
            inspected.showValues ? (
              <p className="node-inspector-value">{inspected.value}</p>
            ) : null}
            <dl className="node-inspector-meta">
              {citation ? (
                <>
                  <dt>Source</dt>
                  <dd>
                    {(meta?.sourceUrl ?? rule?.sourceUrl) ? (
                      <a
                        href={(meta?.sourceUrl ?? rule?.sourceUrl) as string}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {citation} ↗
                      </a>
                    ) : (
                      citation
                    )}
                  </dd>
                </>
              ) : null}
              {(rule?.entity ?? input?.entity) ? (
                <>
                  <dt>Entity</dt>
                  <dd>{humanize((rule?.entity ?? input?.entity) as string)}</dd>
                </>
              ) : null}
              {rule?.period ? (
                <>
                  <dt>Period</dt>
                  <dd>{rule.period}</dd>
                </>
              ) : null}
              {rule?.unit ? (
                <>
                  <dt>Unit</dt>
                  <dd>{rule.unit}</dd>
                </>
              ) : null}
              {rule && (rule.ruleDeps.length > 0 || rule.inputDeps.length > 0) ? (
                <>
                  <dt>Depends on</dt>
                  <dd>
                    <details className="node-inspector-deps">
                      <summary>
                        {[
                          rule.ruleDeps.length > 0
                            ? `${rule.ruleDeps.length} ${rule.ruleDeps.length === 1 ? "rule" : "rules"}`
                            : null,
                          rule.inputDeps.length > 0
                            ? `${rule.inputDeps.length} ${rule.inputDeps.length === 1 ? "question" : "questions"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </summary>
                      <div className="node-inspector-consumers">
                        {rule.ruleDeps.map((depId) => (
                          <button
                            type="button"
                            key={depId}
                            onClick={() => flyFromIndex(depId)}
                            title="Fly to this rule on the canvas"
                          >
                            {humanize(
                              walkRuleById.get(depId)?.name ??
                                depId.split("#").pop() ??
                                depId,
                            )}
                          </button>
                        ))}
                        {rule.inputDeps.map((depId) => (
                          <span key={depId} className="node-inspector-dep-q">
                            {humanize(
                              walkInputById.get(depId)?.name ??
                                (depId.split("#").pop() ?? depId)
                                  .split(".")
                                  .pop() ??
                                depId,
                            )}
                          </span>
                        ))}
                      </div>
                    </details>
                  </dd>
                </>
              ) : null}
              {consumers.length > 0 ? (
                <>
                  <dt>Used by</dt>
                  <dd className="node-inspector-consumers">
                    {consumers.slice(0, 4).map((consumer) => (
                      <button
                        type="button"
                        key={consumer.legalId}
                        onClick={() => flyFromIndex(consumer.legalId)}
                        title="Fly to this rule on the canvas"
                      >
                        {humanize(consumer.name)}
                      </button>
                    ))}
                    {consumers.length > 4 && (
                      <span>+{consumers.length - 4} more</span>
                    )}
                  </dd>
                </>
              ) : null}
              {"kind" in inspected && inspected.kind === "input" ? (
                <>
                  <dt>Answered</dt>
                  <dd>
                    {inspected.source === "user"
                      ? "by your scenario"
                      : "by its default"}
                  </dd>
                </>
              ) : null}
              {input && input.sample !== undefined && input.sample !== null ? (
                <>
                  <dt>Default</dt>
                  <dd className="node-inspector-mono">
                    {typeof input.sample === "object"
                      ? JSON.stringify(input.sample)
                      : String(input.sample)}
                  </dd>
                </>
              ) : null}
              {input ? (
                <>
                  <dt>Your answer</dt>
                  <dd>
                    {typeof (scenario[input.name] ?? input.sample) ===
                    "boolean" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(scenario[input.name] ?? input.sample)}
                        onChange={(event) =>
                          setScenario((current) => ({
                            ...current,
                            [input.name]: event.target.checked,
                          }))
                        }
                      />
                    ) : (
                      <input
                        className="node-inspector-answer"
                        type="number"
                        value={String(
                          scenario[input.name] ??
                            (typeof input.sample === "number"
                              ? input.sample
                              : 0),
                        )}
                        onChange={(event) =>
                          setScenario((current) => ({
                            ...current,
                            [input.name]: Number(event.target.value),
                          }))
                        }
                      />
                    )}
                  </dd>
                </>
              ) : null}
              {null}
              {"hiddenCount" in inspected && inspected.hiddenCount ? (
                <>
                  <dt>Contains</dt>
                  <dd>{inspected.hiddenCount} rules</dd>
                </>
              ) : null}
              {"legalId" in inspected && inspected.legalId ? (
                <>
                  <dt>Legal ID</dt>
                  <dd
                    className="node-inspector-mono"
                    title={inspected.legalId}
                  >
                    {inspected.legalId}
                  </dd>
                </>
              ) : null}
            </dl>
            {formula && rule?.kind !== "parameter" ? (
              <details className="node-inspector-code">
                <summary>Formula</summary>
                <div className="node-inspector-code-body">
                  <FormulaPretty source={formula} />
                </div>
              </details>
            ) : null}
            {"legalId" in inspected &&
            inspected.legalId &&
            inspected.kind !== "input" ? (
              <button
                type="button"
                className="node-inspector-lens"
                onClick={() => startWalkAt(inspected.legalId)}
              >
                ⊙ How does this rule work?
              </button>
            ) : null}
            {"kind" in inspected && inspected.kind === "input" ? (
              <button
                type="button"
                className="node-inspector-lens"
                disabled={running}
                onClick={() => void runScenario("steps")}
              >
                {running ? "Running…" : "▶ Run with these values · guided tour"}
              </button>
            ) : null}
            {"legalId" in inspected &&
            inspected.legalId &&
            /:(statutes|regulations)\//.test(
              fileLegalIdOf(inspected.legalId),
            ) &&
            axiomAppUrl(fileLegalIdOf(inspected.legalId)) ? (
              <button
                type="button"
                className="node-inspector-link"
                onClick={() =>
                  setLawPopup(
                    `${axiomAppUrl(fileLegalIdOf(inspected.legalId)) ?? ""}?embed=1`,
                  )
                }
              >
                § Read the law →
              </button>
            ) : null}
          </aside>
            );
          })()}

        {replay && runResult && (() => {
          const stage = replay.stages[replay.cursor] ?? [];
          const atLast = replay.cursor >= replay.stages.length - 1;
          return (
            <aside className="replay-bar" role="status" aria-label="Step-by-step execution">
              <div className="replay-head">
                <strong>
                  Stage {replay.cursor + 1} of {replay.stages.length}
                </strong>
                <div className="replay-nav">
                  <button
                    type="button"
                    disabled={replay.cursor === 0}
                    onClick={() =>
                      setReplay((current) =>
                        current
                          ? { ...current, cursor: Math.max(0, current.cursor - 1) }
                          : current,
                      )
                    }
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    disabled={atLast}
                    onClick={() =>
                      setReplay((current) =>
                        current
                          ? {
                              ...current,
                              cursor: Math.min(
                                current.stages.length - 1,
                                current.cursor + 1,
                              ),
                            }
                          : current,
                      )
                    }
                  >
                    ▶
                  </button>
                  <button type="button" onClick={() => setReplay(null)}>
                    Show everything
                  </button>
                </div>
              </div>
              <div className="replay-stage">
                {stage.slice(0, 4).map((id) => {
                  const value = valueByLegalId.get(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      className="replay-item"
                      onClick={() => flyTo(id)}
                      title="Fly to this step"
                    >
                      <span>{humanize(walkRuleById.get(id)?.name ?? id)}</span>
                      {value !== undefined && value !== null && (
                        <strong>{String(value)}</strong>
                      )}
                    </button>
                  );
                })}
                {stage.length > 4 && (
                  <span className="replay-more">+{stage.length - 4} more</span>
                )}
              </div>
            </aside>
          );
        })()}

        {!replay && runResult && (
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
            <button
              type="button"
              className="results-copy"
              onClick={() => {
                const request = lastRunRequest.current;
                if (!request) return;
                const body = JSON.stringify(request, null, 2);
                void navigator.clipboard.writeText(
                  `curl -X POST '${window.location.origin}/api/axiom/runtime/calculate' \\\n  -H 'content-type: application/json' \\\n  -d '${body.replace(/'/g, "'\\''")}'`,
                );
                setCopiedRun(true);
                window.setTimeout(() => setCopiedRun(false), 2000);
              }}
            >
              {copiedRun ? "✓ Copied" : "⧉ Copy run as code"}
            </button>
          </aside>
        )}
      </section>
    </main>
    {lawPopup && (
      <div
        className="law-popup-backdrop"
        role="dialog"
        aria-label="The law at this node"
        onClick={() => setLawPopup(null)}
      >
        <div className="law-popup" onClick={(event) => event.stopPropagation()}>
          <div className="law-popup-head">
            <span>§ The law at this node</span>
            <button
              type="button"
              className="results-close"
              onClick={() => setLawPopup(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <iframe src={lawPopup} title="Provision text" />
        </div>
      </div>
    )}
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
/**
 * Formula, readable: identifiers become their humanized names,
 * keywords / numbers / operators get their own weight so the
 * expression reads as a sentence about rules, not engine code.
 */
const FORMULA_TOKEN_RE =
  /[A-Za-z_][A-Za-z0-9_.]*|\d+(?:\.\d+)?|"[^"]*"|'[^']*'|\s+|./g;
const FORMULA_KEYWORDS = new Set([
  "if",
  "then",
  "else",
  "and",
  "or",
  "not",
  "in",
  "true",
  "false",
  "null",
  "min",
  "max",
  "abs",
  "floor",
  "ceil",
  "round",
  "sum",
  "any",
  "all",
  "count",
  "count_where",
  "where",
]);
/** A parameter's constant, dressed as the headline it is: plain
 *  numbers pick up their unit ($218, 30 hours); expressions and
 *  tables show as-is. */
function formatParameterValue(raw: string, unit: string | null): string {
  const trimmed = raw.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    const pretty = numeric.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
    if (unit === "USD") return `$${pretty}`;
    return unit ? `${pretty} ${unit.toLowerCase()}` : pretty;
  }
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}

function FormulaPretty({ source }: { source: string }) {
  const tokens = source.match(FORMULA_TOKEN_RE) ?? [source];
  return (
    <code className="formula-pretty">
      {tokens.map((token, index) => {
        if (/^\s+$/.test(token)) return token;
        if (/^[A-Za-z_]/.test(token)) {
          if (FORMULA_KEYWORDS.has(token.toLowerCase())) {
            return (
              <span key={index} className="fp-kw">
                {token}
              </span>
            );
          }
          return (
            <span key={index} className="fp-id" title={token}>
              {humanize(token.split(".").pop() ?? token)}
            </span>
          );
        }
        if (/^[\d"']/.test(token)) {
          return (
            <span key={index} className="fp-num">
              {token}
            </span>
          );
        }
        return (
          <span key={index} className="fp-op">
            {token}
          </span>
        );
      })}
    </code>
  );
}

