"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  InputEditContext,
  InteractiveRuleGraph,
  initialCollapse,
  type IrgNodeData,
} from "./InteractiveRuleGraph";

import {
  axiomAppUrlForCitation,
  fileLegalIdOf,
  humanizeCitation,
  humanizeRuleName,
  humanizeSource,
} from "./citations";
import { InspectorMiniGraph } from "./inspector-mini-graph";
import {
  PlaneTour,
  TOUR_EXAMPLE_TARGET,
} from "@/components/axiom/tour/plane-tour";
import "./styles.css";
import "./graph-styles.css";
import "./plane.css";
import {
  countriesFromPrograms,
  PREFERRED_DEFAULT_PROGRAM_KEY,
  countryOf,
  defaultOutputsForProgram,
  fetchAllPrograms,
  fetchComposedGraph,
  fetchRootInputs,
  fetchInputMeta,
  fetchProgramGraph,
  programKey,
  programRefFromSummary,
} from "./api";
import type { Country, DashboardSpec, LegalId, ParameterRule, ProgramGraph, ProgramRef, ProgramSummary, RuleNode, TraceNode } from "./types";
import { SubtreeDoors, SubtreeSearch } from "./subtree-picker";
import {
  ALL_STATES,
  JURISDICTION_SCOPES,
  statesInModules,
  type JurisdictionScope,
} from "./list-entries";
import {
  composeRootOutput,
  filterStandaloneRules,
} from "./compose-filter";
import { buildRunRequestBody, scenarioKey } from "./run-request";
import { trackAxiomEvent } from "@/lib/analytics";
import {
  readLauncherMode,
  storeLauncherMode,
  type LauncherMode,
} from "./launcher-mode";
import { CorpusField } from "@/components/axiom/corpus-field";
import { loadCorpusModules } from "@/lib/axiom/corpus-live";
import type { CorpusModule } from "@/lib/axiom/corpus-field";

export function GraphViewerApp({
  onBackToOverview,
}: {
  /** The landing field mounts the viewer in place over the zoomed
   *  field — its Back-to-overview replays the host's own history
   *  journey instead of navigating. Omitted on standalone routes. */
  onBackToOverview?: () => void;
} = {}) {
  const [allPrograms, setAllPrograms] = useState<ProgramSummary[]>([]);
  // The launcher's corpus: every subtree the mirror serves (live,
  // with the committed snapshot as ballast) — the picker searches
  // this; there is no program registry on that screen.
  const [corpusModules, setCorpusModules] = useState<CorpusModule[] | null>(
    null,
  );
  // The launcher tour's closing step presents one real subtree: the
  // field camera glides to it (spotlight), the CTA opens it.
  const [tourSpotlight, setTourSpotlight] = useState<string | null>(null);
  const tourExampleReady =
    corpusModules?.some((m) => m.target === TOUR_EXAMPLE_TARGET) ?? false;
  // Field ⇄ List: the launcher opens on the open-world field by
  // default; the list picker is the alternate mode. Persisted.
  const [launcherMode, setLauncherMode] = useState<LauncherMode>(() =>
    readLauncherMode(),
  );
  const pickLauncherMode = (mode: LauncherMode) => {
    setLauncherMode(mode);
    storeLauncherMode(mode);
  };
  // One query, two surfaces: the top-right search's dropdown AND the
  // list mode's full corpus list filter live on the same string.
  const [launcherQuery, setLauncherQuery] = useState("");
  // List mode's jurisdiction scope: All · Nationwide (us) · States
  // (us-XX). Composes with the text search.
  const [listScope, setListScope] = useState<JurisdictionScope>("all");
  // Under States, one state may be picked (ALL_STATES = every state);
  // leaving the States scope forgets the pick.
  const [listState, setListState] = useState<string>(ALL_STATES);
  const pickListScope = (scope: JurisdictionScope) => {
    setListScope(scope);
    if (scope !== "states") setListState(ALL_STATES);
  };
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
  // Additional household members (person_2, …) for Person-entity
  // answers. The flat scenario IS person_1 — the inspector, samples,
  // and canvas flows keep writing it untouched; each extra member
  // carries its own Person-level answers and rides the compose
  // request as `people`.
  const [extraMembers, setExtraMembers] = useState<string[]>([]);
  const [memberScenario, setMemberScenario] = useState<
    Record<string, Record<string, number | boolean>>
  >({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  // Post-run edits mark the sheet stale until the NEXT explicit run
  // (edits never fire the engine by themselves).
  const [resultsStale, setResultsStale] = useState(false);
  const ranScenarioKey = useRef<string | null>(null);
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
    immediate?: boolean;
  } | null>(null);
  // immediate: the canvas layout is at rest (a plain card click) — no
  // relayout is coming, so the flight starts without the settle hold.
  // soft: a relayout IS coming, but it's a small unfold — glide
  // through its commit instead of hard-cutting.
  const flyTo = (legalId: string, immediate = false, soft = false) =>
    setFlyTarget((current) => ({
      legalId,
      nonce: (current?.nonce ?? 0) + 1,
      immediate,
      soft,
    }));
  const savedSelection = useRef<{
    outputs: LegalId[];
    folded: Set<string>;
  } | null>(null);
  // A restored view must come back exactly as it was — the dissect
  // effect consumes this instead of re-collapsing the restored graph.
  const restoreFoldedRef = useRef<Set<string> | null>(null);
  const openLens = (legalId: string) => {
    // Isolation keeps the right sidebar: the inspector shows the
    // isolated rule (and carries the trail + Used-by navigation).
    inspectRule(legalId);
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
    // Side effects OUTSIDE the updater — React may invoke updaters
    // twice (StrictMode), and nested setState there inverts ordering.
    const next = lensTrail.slice(0, index + 1);
    const target = next[next.length - 1];
    setLensTrail(next);
    setSelectedOutputs([target]);
    inspectRule(target);
  };
  // Clicking an Index entry must land on the canvas even when the
  // target sits inside a folded branch: unfold its ancestry first,
  // then fly — the camera chases the relayout to where it settles.
  const flyFromIndex = (legalId: string) => {
    // The trace tree is a DAG unrolled — the target can sit on
    // several paths, and the renderer may materialize any of them.
    // Unfold every ancestor on every path (the target itself keeps
    // its own fold state). Worked out up front: when every ancestor
    // is already open there is no fold update, no relayout — and the
    // flight goes immediately instead of waiting out the relayout
    // grace period.
    const toUnfold = new Set<string>();
    const unfold = (node: TraceNode): boolean => {
      let viaChild = false;
      for (const child of node.children ?? []) {
        if (unfold(child)) viaChild = true;
      }
      if (viaChild && folded.has(node.legalId)) toUnfold.add(node.legalId);
      return viaChild || node.legalId === legalId;
    };
    for (const id of selectedOutputs) {
      const root = structureTraces[id];
      if (root) unfold(root);
    }
    if (toUnfold.size > 0) {
      setFolded((current) => {
        const next = new Set(current);
        for (const id of toUnfold) next.delete(id);
        return next;
      });
    }
    flyTo(legalId, toUnfold.size === 0, toUnfold.size > 0);
    // An Index click is a card click: open the info sheet, which also
    // pins the path highlight until it closes.
    inspectRule(legalId);
  };
  const inspectRule = (legalId: string) => {
    const rule = walkRuleById.get(legalId);
    if (!rule) return;
    trackNodeOpened("ruleRef");
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
  // double-click lens).
  const focusNode = (data: IrgNodeData) => {
    setInspected(data);
    trackNodeOpened(data.kind);
    const legalId = "legalId" in data && data.legalId ? data.legalId : null;
    if (!legalId) return;
    if (data.kind !== "output" && data.kind !== "ruleRef") return;
    flyTo(legalId, true);
  };
  const lensFocusId = lensTrail[lensTrail.length - 1] ?? null;
  // The sidebar is isolation's home — a pane click may clear the
  // card, but while isolated it comes straight back on the focus.
  useEffect(() => {
    if (lensFocusId && !inspected) inspectRule(lensFocusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lensFocusId, inspected]);
  const [runResult, setRunResult] = useState<{
    outputs: Record<string, number | string | boolean | null>;
    trace: Array<{
      variable: string;
      value: unknown;
      instances?: Array<{ entity_id: string; value: unknown }>;
    }>;
    // Certified-serving provenance — the ledger and vintage the
    // numbers were computed under, when the engine reports them.
    provenance?: {
      ledger_id: string;
      vintage: { engine_release: string };
    } | null;
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
  const [scenarioGlow, setScenarioGlow] = useState(false);
  const [outputsOpen, setOutputsOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [runBrowseSearch, setRunBrowseSearch] = useState("");
  // True for a beat after a run lands — drives the one-shot edge
  // flow sweep, after which the execution layer holds still.
  const [planeFresh, setPlaneFresh] = useState(false);
  const [selectedLevers, setSelectedLevers] = useState<string[] | null>(null);
  // The runtime's input registry: every settable input, its dtype
  // and default — the single source of truth for answer controls.
  // `options` holds closed numeric domains (table keys, equality-
  // literal sets like filing_status ∈ {0,1,2}) rendered as selects.
  const [inputMeta, setInputMeta] = useState<{
    dtypes: Record<string, string>;
    defaults: Record<string, unknown>;
    options?: Record<string, number[]>;
  }>({ dtypes: {}, defaults: {} });
  // Bumped by Retry buttons — re-fires the program load effect after
  // a transient graph/registry failure.
  const [reloadNonce, setReloadNonce] = useState(0);

  const lastRunRequest = useRef<Record<string, unknown> | null>(null);
  // The results sheet's quick-adjust strip pages through answered
  // inputs — a dozen answers must not balloon the sheet.
  const [adjustPage, setAdjustPage] = useState(0);
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
  // MUST mirror the state's initial value: a ?program= deep link
  // starts with the launcher closed, and the summit flight checks
  // this ref — a stale "open" here parks the opening flight behind a
  // launcher that will never dismiss.
  const launcherRef = useRef<"open" | "leaving" | "closed">(launcher);
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
    launcherRef.current = "open";
  };
  const applySurvey = () => {
    pendingOpeningRef.current = null;
    surveyRef.current = true;

    setSelectedOutputs(
      outputRules
        .filter((rule) => !mainlandIds || mainlandIds.has(rule.legalId))
        .map((rule) => rule.legalId),
    );
    setFolded((current) => (current.size === 0 ? current : new Set()));
    const summit = summitOutput ?? relevantOutputRules[0]?.legalId ?? null;
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
    setScenarioGlow(true);
    window.setTimeout(() => setScenarioGlow(false), 2600);
  };
  const beginRuleLens = (legalId: string) => {
    dismissLauncher();
    isolateAt(legalId);
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
  // The inspector re-renders often; scanning 1,700 rules for consumers
  // on every paint is real money — memoize per inspected node.
  const inspectedLegalId =
    inspected && "legalId" in inspected && inspected.legalId
      ? inspected.legalId
      : null;
  const inspectedConsumers = useMemo(
    () => (inspectedLegalId ? consumersOf(inspectedLegalId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspectedLegalId, graph],
  );
  // "Isolate" — the lens IS isolation: the canvas scopes to the rule,
  // dissected to its immediate structure; expand pills grow it down.
  const isolateAt = (legalId: string) => {
    pendingOpeningRef.current = null;
    setScenarioMode(false);
    openLens(legalId);
    flyTo(legalId);
  };
  // Selecting a node further upstream while isolated EXPANDS the
  // canvas: the new root's tree contains the current view, branches
  // already open stay open, and only the new territory arrives
  // folded. Navigation is selection — no modes, no arrows.
  const expandLensTo = (legalId: string) => {
    if (!graph) return;
    const nextTraces = buildStructureTraces(graph, [legalId]);
    const folds = new Set<string>();
    for (const id of initialCollapse(nextTraces, "always")) {
      if (!inScopeIds.has(id)) folds.add(id);
    }
    for (const id of folded) folds.add(id);
    restoreFoldedRef.current = folds;
    setLensTrail((trail) => {
      if (trail.length === 0)
        savedSelection.current = {
          outputs: selectedOutputs,
          folded: new Set(folded),
        };
      return [...trail, legalId];
    });
    setSelectedOutputs([legalId]);
    flyTo(legalId);
    inspectRule(legalId);
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
  // Standalone definitions hidden from the composed canvas (the
  // isolated-node filter) — reported honestly in top-meta.
  const [composedHiddenCount, setComposedHiddenCount] = useState(0);
  // Run-by-root, feature-detected: the API is gaining POST /calculate
  // with `{ root, facts }`. Until the probe confirms the deployment
  // answers that shape, compose mode shows no run affordance at all —
  // the graph is fully browsable either way. null = probing.
  const [composeRunReady, setComposeRunReady] = useState<boolean | null>(
    null,
  );
  // 422 refusal for the composed root (compile_failed /
  // closure_incomplete): the API's own message, surfaced as a styled
  // state in the run panel — never a silent failure.
  const [runBlocked, setRunBlocked] = useState<string | null>(null);

  // Load the full program registry once; countries and the per-country program
  // list are derived from it, so a newly compiled program appears here with no
  // code change.
  useEffect(() => {
    let cancelled = false;
    setProgramsLoading(true);
    fetchAllPrograms()
      .then((programs) => {
        if (!cancelled)
          setAllPrograms(
            programs.filter(
              (item) =>
                !HIDDEN_COUNTRIES.has(countryOf(item.jurisdiction)) &&
                !HIDDEN_PROGRAMS.has(programKey(item)),
            ),
          );
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

  // The picker's corpus loads only when the launcher is actually up —
  // a ?program= / ?compose= deep link never pays for it.
  useEffect(() => {
    if (launcher === "closed" || corpusModules) return;
    let cancelled = false;
    loadCorpusModules().then(({ modules }) => {
      if (!cancelled) setCorpusModules(modules);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launcher]);

  // The launcher's single verb: pick a node → its subgraph opens.
  // Compose mode for exactly that root, the URL rewritten to the
  // canonical ?compose= deep link (replaceState — the viewer never
  // grows its own history entries).
  const enterComposeMode = (target: string) => {
    // A backdrop program may have parked an opening flight while the
    // launcher was up — that summit belongs to the OLD graph.
    pendingOpeningRef.current = null;
    setProgram(null);
    setGraph(null);
    setSelectedOutputs([]);
    setComposedFiles([]);
    setComposedTruncated(false);
    setComposedHiddenCount(0);
    setComposeFocus(target);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("compose", target);
      url.searchParams.delete("program");
      url.searchParams.delete("focus");
      window.history.replaceState({}, "", url.toString());
    }
    veilFor(1800);
    dismissLauncher();
  };

  // ── Back to the overview ──
  // /app IS the launcher's own route: "back to the overview" reopens
  // the field launcher in place, deep-link params stripped so reload
  // lands on the launcher too. (The graph state resets; the backdrop
  // program re-defaults exactly like a cold arrival.)
  const exitToLauncher = () => {
    pendingOpeningRef.current = null;
    setProgram(null);
    setGraph(null);
    setSelectedOutputs([]);
    setComposeFocus(null);
    setComposedFiles([]);
    setComposedTruncated(false);
    setComposedHiddenCount(0);
    setComposeRunReady(null);
    setRunBlocked(null);
    setRunResult(null);
    setRunError(null);
    setRunPanelOpen(false);
    setRequestedProgramKey(null);
    setLensTrail([]);
    setInspected(null);
    setError(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("compose");
      url.searchParams.delete("program");
      url.searchParams.delete("focus");
      window.history.replaceState({}, "", url.toString());
    }
    // "Overview" IS the field — land there even if the visitor's
    // persisted launcher preference is the list (their stored
    // preference is untouched; the next cold arrival honors it).
    setLauncherMode("field");
    setLauncher("open");
    launcherRef.current = "open";
  };

  // One control, two behaviors: the landing's in-place overlay pops
  // its own history entry (the host passed the handler); everywhere
  // else — /app and standalone /axiom/graph — the overview is the
  // graph's own field launcher, reopened in place. The /axiom corpus
  // landing is deliberately not a destination from the graph app.
  const backToOverview = () => {
    if (onBackToOverview) {
      onBackToOverview();
      return;
    }
    exitToLauncher();
  };

  const composedProgram = useMemo<ProgramRef | null>(() => {
    if (!composeFocus) return null;
    return {
      jurisdiction: composeFocus.split(":")[0] ?? "us",
      programId: "composed",
      displayName: composeFocus.split("#")[0] ?? composeFocus,
    };
  }, [composeFocus]);
  const effectiveProgram = program ?? composedProgram;
  const trackNodeOpened = (kind: string) =>
    trackAxiomEvent("axiom_graph_node_opened", {
      node_kind: kind,
      program_id: effectiveProgram?.programId ?? null,
    });
  const trackRun = (outcome: "ok" | "error" | "refused") =>
    trackAxiomEvent("axiom_run_executed", {
      program_id: effectiveProgram?.programId ?? "composed",
      jurisdiction: effectiveProgram?.jurisdiction ?? "unknown",
      outcome,
      surface: "graph",
    });

  // Placeholder samples for a few common inputs; anything else uses
  // the registry default. Samples are placeholders, never answers.
  const CURATED_SAMPLES: Record<string, number> = {
    household_size: 2,
    member_age: 40,
    employee_wages_received: 1200,
    snap_gross_monthly_earned_income: 1200,
    household_shelter_costs_incurred: 900,
  };
  // Every input the runtime can ingest, with its control type — the
  // registry is the truth; the graph supplies canvas identity.
  const inputCatalog = useMemo(() => {
    const seen = new Set<string>();
    const catalog: Array<{
      name: string;
      legalId: string;
      fileLegalId: string;
      entity: string | null;
      isBool: boolean;
      sample: number | boolean;
    }> = [];
    for (const input of graph?.inputs ?? []) {
      if (seen.has(input.name)) continue;
      if (!(input.name in inputMeta.dtypes)) continue;
      seen.add(input.name);
      const isBool = inputMeta.dtypes[input.name] === "bool";
      catalog.push({
        name: input.name,
        legalId: input.legalId,
        fileLegalId: input.fileLegalId,
        entity: input.entity ?? null,
        isBool,
        sample: isBool
          ? Boolean(inputMeta.defaults[input.name])
          : (CURATED_SAMPLES[input.name] ??
            (typeof inputMeta.defaults[input.name] === "number"
              ? (inputMeta.defaults[input.name] as number)
              : 0)),
      });
    }
    return catalog;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, inputMeta]);
  // The picker's computation outline: the law's own dependency tree —
  // rules as branches, answerable questions as leaves. The graph is a
  // DAG, so a shared input appears under EVERY branch that consumes
  // it; the structure carries the fan-out that any flat partition
  // hides. Linear pass-through rules collapse so chains read as one
  // hop.
  const inputOutline = useMemo<OutlineNode[]>(() => {
    if (!graph) return [];
    const ruleById = new Map(graph.rules.map((rule) => [rule.legalId, rule]));
    const catalogByName = new Map(inputCatalog.map((row) => [row.name, row]));
    const leafById = new Map(
      graph.inputs
        .filter((input) => !ruleById.has(input.legalId))
        .map((input) => [input.legalId, input]),
    );
    // Cross-module seams bridge by NAME: a rule consumes the input
    // `earned_income` while the rule computing it lives in another
    // module under its own id. Bridged chains nest where they're
    // consumed instead of floating as extra roots; the seam input
    // stays answerable at the top of the bridged branch (a direct
    // answer short-circuits its sub-questions).
    const ruleIdByName = new Map(
      graph.rules.map((rule) => [rule.name, rule.legalId]),
    );
    const built = new Map<string, OutlineNode | null>();
    const build = (id: string, path: Set<string>): OutlineNode | null => {
      if (path.has(id)) return null;
      const cached = built.get(id);
      if (cached !== undefined) return cached;
      const rule = ruleById.get(id);
      if (!rule) return null;
      const nextPath = new Set(path).add(id);
      const inputs: OutlineInputRow[] = [];
      const seenInputs = new Set<string>();
      let children: OutlineNode[] = [];
      for (const dep of [...rule.ruleDeps, ...rule.inputDeps]) {
        if (ruleById.has(dep)) {
          const child = build(dep, nextPath);
          if (child) children.push(child);
        } else {
          const leaf = leafById.get(dep);
          if (!leaf) continue;
          // Bridge whether or not the seam is answerable — the chain
          // belongs under its consumer either way.
          const row = catalogByName.get(leaf.name);
          if (row && seenInputs.has(row.name)) continue;
          const bridged = ruleIdByName.get(leaf.name);
          if (bridged && bridged !== id && !nextPath.has(bridged)) {
            const child = build(bridged, nextPath);
            if (child) {
              if (row) {
                seenInputs.add(row.name);
                if (!child.inputs.some((r) => r.name === row.name)) {
                  children.push({
                    ...child,
                    inputs: [row, ...child.inputs],
                    count: child.count + 1,
                  });
                  continue;
                }
              }
              children.push(child);
              continue;
            }
          }
          if (row) {
            seenInputs.add(row.name);
            inputs.push(row);
          }
        }
      }
      inputs.sort((a, b) => humanize(a.name).localeCompare(humanize(b.name)));
      // A corridor — one child, no questions of its own — collapses:
      // the outer (closer-to-result) name stays, the contents hoist.
      if (inputs.length === 0 && children.length === 1) {
        const inner = children[0]!;
        inputs.push(...inner.inputs);
        children = inner.children;
      }
      const names = new Set<string>();
      const collect = (n: { inputs: OutlineInputRow[]; children: OutlineNode[] }) => {
        n.inputs.forEach((row) => names.add(row.name));
        n.children.forEach(collect);
      };
      collect({ inputs, children });
      const node: OutlineNode | null =
        names.size > 0
          ? { id, label: humanize(rule.name), inputs, children, count: names.size }
          : null;
      built.set(id, node);
      return node;
    };
    const consumed = new Set<string>();
    for (const rule of graph.rules)
      for (const dep of [...rule.ruleDeps, ...rule.inputDeps]) {
        consumed.add(dep);
        // A name-bridged chain is consumed too — it nests under its
        // consumer rather than surfacing as a root.
        const leaf = leafById.get(dep);
        const bridged = leaf ? ruleIdByName.get(leaf.name) : undefined;
        if (bridged) consumed.add(bridged);
      }
    return graph.rules
      .filter((rule) => !consumed.has(rule.legalId))
      .map((rule) => build(rule.legalId, new Set()))
      .filter((node): node is OutlineNode => !!node)
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, inputCatalog]);
  // Explicit expand/collapse choices; anything unset falls back to
  // "roots open, branches closed" (search opens everything).
  const [outlineOpen, setOutlineOpen] = useState<Map<string, boolean>>(
    new Map(),
  );
  const scenarioFields = useMemo(
    () =>
      inputCatalog.map((input) => ({
        name: input.name,
        label: input.name,
        sample: input.sample,
        entity: input.entity,
      })),
    [inputCatalog],
  );

  const allScenarioFields = scenarioFields;

  useEffect(() => {
    // A program switch is a clean slate: every piece of state that
    // names rules or inputs of the OLD program must go — a lingering
    // replay steps through a foreign graph, lens crumbs point at dead
    // rules, and "Edit inputs" would show another program's fields.
    setRunResult(null);
    setRunError(null);
    setRunBlocked(null);
    setRunPanelOpen(false);
    setSelectedLevers(null);
    setScenario({});
    setExtraMembers([]);
    setMemberScenario({});
    setResultsStale(false);
    ranScenarioKey.current = null;
    setInputMeta({ dtypes: {}, defaults: {} });
    setLensTrail([]);
    savedSelection.current = null;
    restoreFoldedRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProgram?.programId]);

  useEffect(() => {
    // No presets: only values the user actually typed survive a
    // field-list change; samples are placeholders, never answers.
    setScenario((current) =>
      Object.fromEntries(
        allScenarioFields
          .map((field) => [field.name, current[field.name]] as const)
          .filter(([, value]) => value !== undefined),
      ),
    );
  }, [allScenarioFields]);

  const runScenario = async () => {
    if (!effectiveProgram || running) return;
    // Compose mode runs only through the feature-detected root shape.
    if (composeFocus && composeRunReady !== true) return;
    setRunning(true);
    setRunError(null);
    // An explicit run consumes the pending edits: the stale flag
    // clears and the edit tracker syncs to what this run computes.
    setResultsStale(false);
    ranScenarioKey.current = scenarioKey({
      ...scenario,
      ...flattenMemberAnswers(extraMembers, memberScenario),
    });
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
        if (rule.kind === "derived") reachable.add(id);
        for (const dep of rule.ruleDeps) walk(dep);
      };
      // Every run computes the outermost layer and everything in
      // between: trace from the terminal results regardless of what
      // the canvas currently selects.
      const traceRoots = (graph?.terminalOutputs ?? []).filter((id) =>
        walkRuleById.has(id),
      );
      for (const id of traceRoots) walk(id);
      // Compose mode speaks the run-by-root shape (`{ root, facts }`);
      // package programs keep their coordinates. Same envelope back.
      // Extra household members ride as `people` — empty records
      // still travel: an added person with no answers is a person.
      const people = Object.fromEntries(
        extraMembers.map((member) => [member, memberScenario[member] ?? {}]),
      );
      const requestBody = (variables: string[]): Record<string, unknown> =>
        buildRunRequestBody(
          composeFocus,
          effectiveProgram,
          scenario,
          variables,
          composeFocus ? people : undefined,
        );
      const attempt = async (variables: string[]) => {
        const response = await fetch("/api/axiom/runtime/calculate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody(variables)),
          // A hung request must never strand the Run buttons disabled.
          signal: AbortSignal.timeout(30_000),
        });
        // The root endpoint vanished mid-session (deploy rollback):
        // fold the affordance back away instead of error-looping.
        // With extra members aboard, a 404 more likely means the
        // upstream predates the `people` shape — keep the affordance
        // and say what to change.
        if (composeFocus && response.status === 404) {
          if (extraMembers.length > 0) {
            throw new Error(
              "This deployment doesn't accept per-member answers yet — remove the added household members to run.",
            );
          }
          setComposeRunReady(false);
          throw new Error(
            "Running composed views isn't available on this deployment yet.",
          );
        }
        // Rate limited: more requests only dig deeper — stop the whole
        // run (including chunk probing) with an honest message.
        if (response.status === 429) {
          throw new Error(
            "Too many runs in the last minute — wait a moment and run again.",
          );
        }
        if (response.status === 422) {
          if (composeFocus) {
            // The engine declined this composed root (compile_failed /
            // closure_incomplete). Chunk probing can't help; surface
            // the API's own message as the run-blocked state.
            let payload: { error?: string; message?: string | null } = {};
            try {
              payload = await response.clone().json();
            } catch {
              // Anonymous refusal — the styled state still shows.
            }
            // EXCEPT runtime_error: usually one poisoned trace name
            // ("unknown derived output: …"), which chunk recovery can
            // shed — return non-ok instead of blocking the whole run.
            // If even the bare run refuses, the caller styles the
            // blocked state from this same payload.
            if (payload.error !== "runtime_error") {
              const blocked = new Error(
                payload.message ??
                  "the engine declined this computation without a message.",
              );
              blocked.name = "RunBlockedError";
              throw blocked;
            }
            return response;
          }
          // Certified serving refused the run (422 uncertified_node).
          // Probing chunks can't help — the ledger, not a bad name, is
          // the gate. Name what WE asked for; the API never names ids.
          throw new Error(
            `Some requested rules aren't certified for serving yet: ${
              variables.length > 0
                ? variables.join(", ")
                : "the program's default outputs"
            }`,
          );
        }
        return response;
      };
      // The runtime resolves variables by bare rule name (legalId
      // forms fail on some packages), so trace requests speak names.
      // Household-unit rules first: if the 96-variable cap bites, the
      // money chain wins over member-level detail. Entity-scoped rules
      // (Person, Asset) trace per instance on engines that support it;
      // older engines fail them and the chunk recovery sheds them.
      const isUnitScoped = (id: string) => {
        const entity = byId.get(id)?.entity;
        return entity == null || /household|unit/i.test(entity);
      };
      const ordered = [...reachable].sort(
        (a, b) => Number(isUnitScoped(b)) - Number(isUnitScoped(a)),
      );
      const bareNames = [
        ...new Set(ordered.map((id) => id.split("#").pop() ?? id)),
      ].slice(0, 96);
      const tryVariables = async (variables: string[]) => {
        lastRunRequest.current = requestBody(variables);
        const result = await attempt(variables);
        return result.ok ? result : null;
      };
      // One bad name fails the WHOLE trace. Try everything; on
      // failure, probe chunks under a bounded request budget and keep
      // the good ones — so the middle of the graph still lights up
      // instead of collapsing to outputs-only.
      let response = await tryVariables(bareNames);
      if (!response && bareNames.length > 0) {
        const good: string[] = [];
        let probes = 0;
        const probe = async (chunk: string[], depth: number) => {
          if (chunk.length === 0 || probes >= 9) return;
          probes += 1;
          const result = await attempt(chunk);
          if (result.ok) {
            good.push(...chunk);
            return;
          }
          // One halving pass, then drop the poisoned few.
          if (depth >= 1 || chunk.length === 1) return;
          const mid = Math.ceil(chunk.length / 2);
          await probe(chunk.slice(0, mid), depth + 1);
          await probe(chunk.slice(mid), depth + 1);
        };
        const size = Math.ceil(bareNames.length / 4);
        for (let i = 0; i < bareNames.length; i += size) {
          await probe(bareNames.slice(i, i + size), 0);
        }
        response = await tryVariables(good);
      }
      if (!response) {
        // Even outputs-only failed: the package itself can't run.
        lastRunRequest.current = requestBody([]);
        const bare = await attempt([]);
        if (!bare.ok) {
          if (bare.status === 422) {
            // A runtime_error refusal that survived even the bare run:
            // subtree-level after all — style it as the blocked state.
            let payload: { message?: string | null } = {};
            try {
              payload = await bare.json();
            } catch {
              // Anonymous refusal.
            }
            const blocked = new Error(
              payload.message ??
                "the engine declined this computation without a message.",
            );
            blocked.name = "RunBlockedError";
            throw blocked;
          }
          throw new Error(
            bare.status === 502
              ? "The engine can't run this program right now — its compiled package is unavailable upstream."
              : `run failed (${bare.status})`,
          );
        }
        response = bare;
      }
      const data = (await response.json()) as {
        outputs: Record<string, number | string | boolean | null>;
        trace: Array<{
      variable: string;
      value: unknown;
      instances?: Array<{ entity_id: string; value: unknown }>;
    }>;
        provenance?: {
          ledger_id: string;
          vintage: { engine_release: string };
        } | null;
      };
      setRunResult(data);
      trackRun("ok");
    } catch (err) {
      if (err instanceof Error && err.name === "RunBlockedError") {
        // A refusal, not a failure: the styled run-blocked state
        // carries the API's message; no generic error on top.
        setRunBlocked(err.message);
        setRunError(null);
        trackRun("refused");
      } else {
        const timedOut =
          err instanceof DOMException &&
          (err.name === "TimeoutError" || err.name === "AbortError");
        setRunError(
          timedOut
            ? "The run timed out — the engine didn't answer. Try again."
            : err instanceof Error
              ? err.message
              : "run failed",
        );
        trackRun("error");
      }
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

  // Escape closes the topmost surface — keyboard users must never be
  // trapped in a dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (lawPopup) setLawPopup(null);
      else if (runPanelOpen) setRunPanelOpen(false);
      else if (inspected) setInspected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawPopup, runPanelOpen, inspected]);


  // Deep links: the address bar always reproduces the current view —
  // ?program= is the selected law, ?focus= the lens-focused rule.
  // Copying the URL is sharing; no share button needed. An inbound
  // ?focus= (which scopes the outputs on load) is left in place until
  // the user opens and closes a lens — the scoped view it created
  // outlives the load, so the link should too.
  const lensSyncedToUrl = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (program && launcherRef.current === "closed") {
      // Only a CHOSEN program earns the URL — the backdrop default
      // behind the launcher must not become a deep link.
      url.searchParams.set("program", programKey(program));
    } else if (!program && !composeFocus && !requestedProgramKey) {
      // Never strip a deep link's ?program= before it resolves.
      url.searchParams.delete("program");
    }
    if (lensFocusId) {
      url.searchParams.set("focus", lensFocusId);
      lensSyncedToUrl.current = true;
    } else if (lensSyncedToUrl.current) {
      url.searchParams.delete("focus");
      lensSyncedToUrl.current = false;
    }
    if (url.toString() !== window.location.href) {
      window.history.replaceState({}, "", url.toString());
    }
  }, [program, lensFocusId, composeFocus, requestedProgramKey, launcher]);

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
    void fetchInputMeta(program).then((meta) => {
      if (!cancelled) setInputMeta(meta);
    });
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
          const consumed = new Set<string>();
          for (const rule of nextGraph.rules) {
            for (const dep of rule.ruleDeps) consumed.add(dep);
          }
          const mainland = connectedToOwnOutputs(nextGraph);
          setSelectedOutputs(
            rankOutputRules(nextGraph, { includeLeaves: false })
              .filter(
                (rule) =>
                  rule.kind !== "parameter" || consumed.has(rule.legalId),
              )
              .filter((rule) => !mainland || mainland.has(rule.legalId))
              .map((rule) => rule.legalId),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, reloadNonce]);

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
        // Standalone-definition filter: rules nothing feeds and
        // nothing consumes are wallpaper on a composed canvas — hide
        // them, count them honestly (top-meta reports the count).
        const { graph: filteredGraph, hiddenCount } = filterStandaloneRules(
          composed.graph,
        );
        setGraph(filteredGraph);
        setComposedHiddenCount(hiddenCount);
        setComposedFiles(composed.files);
        setComposedTruncated(composed.truncated);
        // No package registry backs a composed view; the graph's own
        // input census (name + sample) is the best available registry
        // for the run panel's controls.
        const dtypes: Record<string, string> = {};
        const defaults: Record<string, unknown> = {};
        for (const input of filteredGraph.inputs) {
          if (input.name in dtypes) continue;
          // The mirror carries no dtypes; a boolean sample or a
          // predicate-shaped name gets a checkbox, the rest numbers.
          dtypes[input.name] =
            typeof input.sample === "boolean" ||
            /^(?:is|has|have|was|are|does|do|meets|qualifies|entitled|eligible|receives|received|treated)_/.test(
              input.name,
            )
              ? "bool"
              : "number";
          defaults[input.name] = input.sample;
        }
        setInputMeta({ dtypes, defaults });
        // The runtime's input catalog carries the REAL dtypes, inferred
        // from the compiled artifact — a mid-name predicate like
        // taxpayer_married_at_close_of_taxable_year is a checkbox, not
        // a 0/1 number box. It lands async and overrides the heuristics
        // above; a subtree that doesn't compile just keeps them.
        fetchRootInputs(fileLegalIdOf(composeFocus))
          .then((slots) => {
            if (cancelled || slots.length === 0) return;
            setInputMeta((current) => {
              const merged = {
                dtypes: { ...current.dtypes },
                defaults: { ...current.defaults },
                options: { ...current.options },
              };
              for (const slot of slots) {
                if (slot.dtype === "bool") {
                  merged.dtypes[slot.name] = "bool";
                  merged.defaults[slot.name] = Boolean(slot.default);
                } else if (slot.dtype === "integer" || slot.dtype === "decimal") {
                  merged.dtypes[slot.name] =
                    slot.dtype === "integer" ? "integer" : "number";
                  merged.defaults[slot.name] = Number(slot.default) || 0;
                  // A closed numeric domain becomes a select — table
                  // keys, or the literal set the statute distinguishes
                  // (filing_status ∈ {0,1,2}).
                  const numeric = (slot.values ?? []).filter(
                    (value): value is number => typeof value === "number",
                  );
                  if (numeric.length > 0 && numeric.length === slot.values?.length) {
                    merged.options[slot.name] = numeric;
                  }
                }
                // text/date slots can't travel the run wire (facts are
                // number|boolean) — leave their heuristic controls be.
              }
              return merged;
            });
          })
          .catch(() => {
            // Catalog unavailable — heuristics carry the panel.
          });
        const rulesById = new Map(
          filteredGraph.rules.map((rule) => [rule.legalId, rule]),
        );
        // Prefer outputs with a real computation to draw; fall back to
        // everything the focus file declares (a parameter-only section
        // still renders its nodes).
        const own = filteredGraph.ownOutputs.filter((id) => rulesById.has(id));
        const derived = own.filter((id) => {
          const rule = rulesById.get(id);
          return rule?.kind === "derived" && rule.formula?.trim();
        });
        // Root-first: the terminal root with the largest closure
        // (computed here, never trusted from array order) leads the
        // selection, and the opening flight lands on it.
        const root = composeRootOutput(filteredGraph);
        const picked = (derived.length > 0 ? derived : own).slice(0, 24);
        const ordered = root
          ? [root, ...picked.filter((id) => id !== root)]
          : picked;
        graphJustLoaded.current = true;
        setSelectedOutputs(ordered);
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

  // Feature-detect run-by-root once per composed view: one probe run
  // with default facts. 200/422/429 mean the deployment understands
  // the `{ root }` shape (even if this subtree is refused); 400/404
  // mean the endpoint isn't there yet — keep the affordance hidden.
  useEffect(() => {
    setComposeRunReady(null);
    setRunBlocked(null);
    if (!composeFocus) return;
    let cancelled = false;
    const root = fileLegalIdOf(composeFocus);
    fetch("/api/axiom/runtime/calculate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ root, facts: {}, variables: [] }),
      signal: AbortSignal.timeout(30_000),
    })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 422) {
          // The endpoint exists but declines this subtree — show the
          // affordance AND the honest blocked state up front.
          let payload: { message?: string | null } = {};
          try {
            payload = await response.json();
          } catch {
            // Anonymous refusal.
          }
          if (!cancelled) {
            setRunBlocked(
              payload.message ??
                "the engine declined this computation without a message.",
            );
            setComposeRunReady(true);
          }
          return;
        }
        setComposeRunReady(response.ok || response.status === 429);
      })
      .catch(() => {
        if (!cancelled) setComposeRunReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [composeFocus]);
  // The run affordance exists in compose mode only once the probe
  // confirms the API can execute a composed root.
  const runAffordanceReady = !composeFocus || composeRunReady === true;

  const outputRules = useMemo(
    () => rankOutputRules(graph, { includeLeaves: composeFocus != null }),
    [graph, composeFocus],
  );
  // Standalone pieces stay off the whole-law survey (see
  // connectedToOwnOutputs); null means "no filter".
  const mainlandIds = useMemo(
    () => (graph ? connectedToOwnOutputs(graph) : null),
    [graph],
  );
  // A parameter nobody in this package consumes is table noise from
  // a bundled federal file (Alaska maximums inside New York) — it
  // earns no card of its own.
  const relevantOutputRules = useMemo(() => {
    const consumed = new Set<string>();
    for (const rule of graph?.rules ?? []) {
      for (const dep of rule.ruleDeps) consumed.add(dep);
    }
    return outputRules.filter(
      (rule) => rule.kind !== "parameter" || consumed.has(rule.legalId),
    );
  }, [outputRules, graph]);
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
  const runModeActive = runPanelOpen || Boolean(runResult);
  const inputEditValues = useMemo(() => {
    // Every registry input is genuinely settable (grafted onto its
    // owning entity server-side) — so every one gets a live field.
    // Only in run mode: while browsing the law, cards stay read-only.
    const values: Record<string, number | boolean> = {};
    if (!runModeActive) return values;
    for (const input of inputCatalog) {
      const fromScenario = scenario[input.name];
      if (
        typeof fromScenario === "number" ||
        typeof fromScenario === "boolean"
      ) {
        values[input.name] = fromScenario;
      } else if (input.isBool) {
        values[input.name] = Boolean(scenario[input.name] ?? false);
      } else {
        values[input.name] = Number.NaN;
      }
    }
    return values;
  }, [inputCatalog, scenario, runModeActive]);
  const inputEditCtx = useMemo(
    () => ({
      answered: new Set(Object.keys(scenario)),
      values: inputEditValues,
      // Registry defaults, so an unanswered card can say WHICH value
      // held for the run — the default applies whether or not the
      // question was asked.
      defaults: Object.fromEntries(
        Object.entries(inputMeta.defaults).filter(
          (entry): entry is [string, number | boolean] =>
            typeof entry[1] === "number" || typeof entry[1] === "boolean",
        ),
      ),
      // Person-level cards show every member's answer (read-only
      // beyond Person 1 — the inspector and run panel edit members).
      memberValues:
        extraMembers.length > 0
          ? Object.fromEntries(
              inputCatalog
                .filter((input) => input.entity === "Person")
                .map((input) => [
                  input.name,
                  [
                    { label: "P1", value: scenario[input.name] ?? null },
                    ...extraMembers.map((member) => ({
                      label: `P${member.split("_")[1] ?? "?"}`,
                      value: memberScenario[member]?.[input.name] ?? null,
                    })),
                  ],
                ]),
            )
          : undefined,
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
    [inputEditValues, scenario, inputMeta, inputCatalog, extraMembers, memberScenario],
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
  // Take me there — wherever "there" is: in-scope results fly in
  // place; out-of-scope results leave the lens and re-root on the
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
    // Out of the current scope (a lens narrowed the canvas, or a
    // deep link scoped it): restore the whole tree, then land on the
    // match with its path pinned alight.
    setLensTrail([]);
    savedSelection.current = null;
    surveyRef.current = true;
    // A match on a standalone piece brings its whole island on stage —
    // the user asked for it by name.
    const stage =
      mainlandIds && graph && !mainlandIds.has(match.legalId)
        ? new Set([
            ...mainlandIds,
            ...(connectedComponent(graph, [match.legalId]) ?? []),
          ])
        : mainlandIds;
    setSelectedOutputs(
      outputRules
        .filter((rule) => !stage || stage.has(rule.legalId))
        .map((rule) => rule.legalId),
    );
    setFolded((current) => (current.size === 0 ? current : new Set()));
    flyTo(match.legalId);
    if (match.kind === "input") inspectInput(match.legalId);
    else inspectRule(match.legalId);
  };
  const inspectInput = (legalId: string) => {
    const input = walkInputById.get(legalId);
    if (!input) return;
    trackNodeOpened("input");
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
    if (launcherRef.current === "open") {
      // Never move the camera behind the launcher — it reads as a
      // random zoom through the backdrop. Fly when the fade ends.
      // (While it is LEAVING the pick already happened: fly now, with
      // fresh state — the dismiss timer's closure would be stale.)
      pendingOpeningRef.current = summit;
      return;
    }
    setFlyTarget((current) => ({
      legalId: summit,
      nonce: (current?.nonce ?? 0) + 1,
    }));
    // The opening card: whatever the flight lands on — the summit
    // when the graph names one, else the root-first selection.
    inspectRule(summit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutputs, summitOutput]);

  // Dissect on program/selection/lens change; unfold the executed
  // path when a run lands.
  useEffect(() => {
    const key =
      Object.keys(structureTraces).sort().join("|") +
      "::" +
      (lensTrail.length > 0 ? "always" : "auto");
    if (foldedInitialized.current !== key) {
      foldedInitialized.current = key;
      if (restoreFoldedRef.current) {
        // A lens just closed — bring back the exact fold
        // state the user left, not a fresh dissection.
        setFolded(restoreFoldedRef.current);
        restoreFoldedRef.current = null;
      } else if (surveyRef.current) {
        // A survey just selected everything — keep it unfolded
        // instead of re-dissecting the new selection. Identity-stable:
        // a fresh empty Set would trigger a second full relayout.
        surveyRef.current = false;
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
  }, [structureTraces, lensTrail.length]);

  // Scenario edits coalesce for 700ms before anything heavy
  // rebuilds — typing collects into one update after a pause.
  const [debouncedScenario, setDebouncedScenario] = useState(scenario);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedScenario(scenario), 700);
    return () => window.clearTimeout(timer);
  }, [scenario]);

  // Explicit runs ONLY: editing answers never fires the engine. The
  // tracker follows edits silently; once a result is on screen, any
  // change to the values marks it STALE ("values changed — Run
  // again") until the next explicit Run consumes the edits.
  useEffect(() => {
    const key = scenarioKey({
      ...debouncedScenario,
      ...flattenMemberAnswers(extraMembers, memberScenario),
    });
    if (ranScenarioKey.current === null) return; // nothing ran yet
    setResultsStale(runResult !== null && key !== ranScenarioKey.current);
  }, [debouncedScenario, extraMembers, memberScenario, runResult]);

  // Execution overlay: clone the structural traces and light them
  // with the run's computed values (rules by durable id or bare
  // fragment) and the scenario's input values.
  const liveTraces = useMemo(() => {
    if (!runResult)
      return {
        traces: structureTraces,
        executed: new Set<string>(),
        valueOf: () => undefined as unknown,
      };
    const valueByFragment = new Map<string, unknown>();
    const valueByLegalId = new Map<string, unknown>();
    const record = (variable: string, value: unknown) => {
      if (variable.includes("#")) valueByLegalId.set(variable, value);
      else valueByFragment.set(variable, value);
    };
    for (const entry of runResult.trace) {
      // Entity-scoped rules arrive per instance: one member shows its
      // exact value; several show each member's, joined.
      const instanceValues = (entry.instances ?? []).map(
        (item) => item.value,
      );
      const value =
        entry.value ??
        (instanceValues.length === 1
          ? instanceValues[0]
          : instanceValues.length > 1
            ? instanceValues
                .map((item) =>
                  typeof item === "boolean"
                    ? item
                      ? "✓"
                      : "✗"
                    : String(item ?? "—"),
                )
                .join(" · ")
            : entry.value);
      record(entry.variable, value);
    }
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
          ? debouncedScenario[fragment.replace(/^input\./, "")]
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
    // Point lookup for anything that isn't a canvas card — the
    // inspector's mini graph asks by legal id and gets the same value
    // the canvas box would show, scenario answers included.
    const valueOf = (legalId: string): unknown => {
      const fragment = legalId.split("#").pop() ?? "";
      const ran =
        valueByLegalId.get(legalId) ?? valueByFragment.get(fragment);
      if (ran !== undefined) return ran;
      if (fragment.startsWith("input.")) {
        return debouncedScenario[fragment.replace(/^input\./, "")];
      }
      return undefined;
    };
    return {
      traces: Object.fromEntries(
        Object.entries(structureTraces).map(([key, node]) => [
          key,
          light(node),
        ]),
      ),
      executed,
      valueOf,
    };
  }, [structureTraces, runResult, debouncedScenario]);

  useEffect(() => {
    if (!runResult) return;
    setPlaneFresh(true);
    // Land the way the graph opens: on the top computed node. The
    // value chips resize every card, so a relayout is coming — the
    // camera cuts inside its commit and the crossfade (plane-fresh
    // scene rule) folds teleport + cut into one perceived change.
    // But when a card is already open in the inspector the user is
    // mid-thought there — answering a question from the graph must
    // not yank the camera back to the summit.
    if (summitOutput && !inspected) {
      setFlyTarget((current) => ({
        legalId: summitOutput,
        nonce: (current?.nonce ?? 0) + 1,
      }));
      inspectRule(summitOutput);
    }
    const timer = window.setTimeout(() => setPlaneFresh(false), 2600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runResult]);

  const effectiveExecuted = liveTraces.executed;


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



  function toggleOutput(legalId: LegalId) {
    setSelectedOutputs((current) =>
      current.includes(legalId)
        ? current.filter((id) => id !== legalId)
        : [...current, legalId],
    );
  }

  const launchRun = () => {
    // Always closes the panel — even when the answer-edit auto-run is
    // already in flight (the first press used to be swallowed by a
    // disabled button while that run finished behind the panel).
    setRunPanelOpen(false);
    setScenarioMode(true);
    if (launcher !== "closed") dismissLauncher();
    if (!running) void runScenario();
  };

  // One scenario flow, two homes: the launcher's middle screen and
  // the sidebar panel render the same staged UI.
  const scenarioFlowUI = (() => {
    // Start empty: pick levers on the left, they pop up on the right
    // ready for values; unpicked ones fall to the law's defaults.
    const active = selectedLevers ?? [];
    const query = runBrowseSearch.trim().toLowerCase();
    const activeFields = allScenarioFields.filter((field) =>
      active.includes(field.name),
    );
    return (
      <>
        <div className="run-columns">
          <div className="run-col">
            <p className="run-section-label">Inputs</p>
            <input
              type="search"
              className="run-overview-search"
              value={runBrowseSearch}
              onChange={(event) => setRunBrowseSearch(event.target.value)}
              placeholder={`Search ${inputCatalog.length} inputs...`}
            />
            <div className="run-picker-list">
              {(() => {
                // Prune the outline to what's addable and matching,
                // recounting distinct questions per branch.
                const prune = (node: OutlineNode): OutlineNode | null => {
                  const inputs = node.inputs.filter(
                    (row) =>
                      !active.includes(row.name) &&
                      (!query ||
                        humanize(row.name).toLowerCase().includes(query)),
                  );
                  const children = node.children
                    .map(prune)
                    .filter((child): child is OutlineNode => !!child);
                  if (inputs.length === 0 && children.length === 0)
                    return null;
                  const names = new Set<string>();
                  const collect = (n: OutlineNode) => {
                    n.inputs.forEach((row) => names.add(row.name));
                    n.children.forEach(collect);
                  };
                  collect({ ...node, inputs, children });
                  return { ...node, inputs, children, count: names.size };
                };
                const pruned = inputOutline
                  .map(prune)
                  .filter((node): node is OutlineNode => !!node);
                if (pruned.length === 0) return null;
                // One primary tree — the law that was opened — fully
                // expanded; renamed-seam satellite chains and
                // unrelated co-modules tuck under a single collapsed
                // entry instead of crowding the top level.
                const focusPrefix = composeFocus ? `${composeFocus}#` : null;
                const primaryIndex = focusPrefix
                  ? Math.max(
                      0,
                      pruned.findIndex((node) =>
                        node.id.startsWith(focusPrefix),
                      ),
                    )
                  : 0;
                const rest = pruned.filter(
                  (_, index) => index !== primaryIndex,
                );
                const nodes: OutlineNode[] = [
                  pruned[primaryIndex]!,
                  ...(rest.length
                    ? [
                        {
                          id: "__outline-other__",
                          label: "Other definitions in this module",
                          inputs: [],
                          children: rest,
                          count: rest.reduce((sum, n) => sum + n.count, 0),
                        },
                      ]
                    : []),
                ];
                return nodes.map((root, index) => (
                    <InputOutlineBranch
                      key={root.id}
                      node={root}
                      depth={0}
                      pathKey={root.id}
                      defaultOpen={index === 0}
                      searching={!!query}
                      openOverrides={outlineOpen}
                      onToggle={(key, fallback) =>
                        setOutlineOpen((current) => {
                          const next = new Map(current);
                          next.set(key, !(current.get(key) ?? fallback));
                          return next;
                        })
                      }
                      // One input, many doorways: a shared input is
                      // still ONE answer — adding from any branch
                      // adds it once, and every occurrence leaves
                      // the picker together.
                      onAdd={(name) =>
                        setSelectedLevers(
                          active.includes(name) ? active : [...active, name],
                        )
                      }
                    />
                  ));
              })()}
              {inputCatalog.length === 0 &&
                (graph?.inputs.length ?? 0) > 0 && (
                  <div className="output-empty">
                    The input registry didn't load.{" "}
                    <button
                      type="button"
                      className="status-retry"
                      onClick={() => setReloadNonce((n) => n + 1)}
                    >
                      Retry
                    </button>
                  </div>
                )}
              {inputCatalog.length === 0 &&
                (graph?.inputs.length ?? 0) === 0 && (
                  <div className="output-empty">
                    This program asks no questions — it runs on defaults.
                  </div>
                )}
              {inputCatalog.length > 0 &&
                inputCatalog.filter(
                  (input) =>
                    !active.includes(input.name) &&
                    (!query ||
                      humanize(input.name).toLowerCase().includes(query)),
                ).length === 0 && (
                  <div className="output-empty">No inputs match.</div>
                )}
            </div>
          </div>
          <div className="run-col">
            <p className="run-section-label">Your answers</p>
            {(extraMembers.length > 0 ||
              activeFields.some((field) => field.entity === "Person")) && (
              <div className="scenario-members">
                <span className="scenario-members-label">Household</span>
                <span className="scenario-member-chip">Person 1</span>
                {extraMembers.map((member) => (
                  <span key={member} className="scenario-member-chip">
                    {memberLabel(member)}
                    <button
                      type="button"
                      aria-label={`Remove ${memberLabel(member)}`}
                      onClick={() => {
                        setExtraMembers((current) =>
                          current.filter((id) => id !== member),
                        );
                        setMemberScenario((current) => {
                          const { [member]: _gone, ...rest } = current;
                          return rest;
                        });
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className="scenario-member-add"
                  onClick={() =>
                    setExtraMembers((current) => {
                      const next =
                        Math.max(
                          1,
                          ...current.map(
                            (id) => Number(id.split("_")[1]) || 1,
                          ),
                        ) + 1;
                      return [...current, `person_${next}`];
                    })
                  }
                >
                  ＋ Add person
                </button>
              </div>
            )}
            <div className="scenario-fields">
              {activeFields.map((field) => {
                const removeField = () => {
                  setSelectedLevers(
                    active.filter((name) => name !== field.name),
                  );
                  setScenario((current) => {
                    const { [field.name]: _gone, ...rest } = current;
                    return rest;
                  });
                  setMemberScenario((current) =>
                    Object.fromEntries(
                      Object.entries(current).map(([id, answers]) => {
                        const { [field.name]: _gone, ...rest } = answers;
                        return [id, rest];
                      }),
                    ),
                  );
                };
                // A Person-level question with members present becomes
                // a uniform stack: title row, then one identical
                // label-beside-box row per member (Person 1 included).
                if (field.entity === "Person" && extraMembers.length > 0) {
                  return (
                    <div key={field.name} className="scenario-field">
                      <span className="scenario-field-title">
                        {humanize(field.label)}
                        <button
                          type="button"
                          className="scenario-field-remove"
                          aria-label={`Remove ${humanize(field.label)}`}
                          onClick={removeField}
                        >
                          ×
                        </button>
                      </span>
                      <div className="scenario-member-rows">
                        {[null, ...extraMembers].map((member) => (
                          <label
                            key={member ?? "person_1"}
                            className="scenario-member-row"
                          >
                            <span className="scenario-field-member">
                              {member ? memberLabel(member) : "Person 1"}
                            </span>
                            <AnswerControl
                              name={field.name}
                              value={
                                member
                                  ? memberScenario[member]?.[field.name]
                                  : scenario[field.name]
                              }
                              meta={inputMeta}
                              selectClassName="scenario-field-select"
                              placeholder={`e.g. ${field.sample}`}
                              onChange={(next) =>
                                member
                                  ? setMemberScenario((current) => {
                                      const answers = {
                                        ...(current[member] ?? {}),
                                      };
                                      if (next === undefined) {
                                        delete answers[field.name];
                                      } else {
                                        answers[field.name] = next;
                                      }
                                      return { ...current, [member]: answers };
                                    })
                                  : setScenario((current) => {
                                      if (next === undefined) {
                                        const {
                                          [field.name]: _gone,
                                          ...rest
                                        } = current;
                                        return rest;
                                      }
                                      return {
                                        ...current,
                                        [field.name]: next,
                                      };
                                    })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <label key={field.name} className="scenario-field">
                    <span>{humanize(field.label)}</span>
                    <span className="scenario-field-controls">
                      <AnswerControl
                        name={field.name}
                        value={scenario[field.name]}
                        meta={inputMeta}
                        selectClassName="scenario-field-select"
                        placeholder={`e.g. ${field.sample}`}
                        onChange={(next) =>
                          setScenario((current) => {
                            if (next === undefined) {
                              const { [field.name]: _gone, ...rest } = current;
                              return rest;
                            }
                            return { ...current, [field.name]: next };
                          })
                        }
                      />
                      <button
                        type="button"
                        className="scenario-field-remove"
                        aria-label={`Remove ${humanize(field.label)}`}
                        onClick={removeField}
                      >
                        ×
                      </button>
                    </span>
                  </label>
                );
              })}
              {activeFields.length === 0 && (
                <>
                  {inputCatalog.some(
                    (input) => input.name in CURATED_SAMPLES,
                  ) && (
                    <button
                      type="button"
                      className="run-sample"
                      onClick={() => {
                        // One click to a runnable household: the curated
                        // starter values this package understands.
                        const starters = inputCatalog.filter(
                          (input) => input.name in CURATED_SAMPLES,
                        );
                        setSelectedLevers(starters.map((input) => input.name));
                        // Merge under any answers already typed on the
                        // canvas — a sample never overwrites the user.
                        setScenario((current) => ({
                          ...Object.fromEntries(
                            starters.map((input) => [
                              input.name,
                              CURATED_SAMPLES[input.name]!,
                            ]),
                          ),
                          ...current,
                        }));
                      }}
                    >
                      Start from a sample household
                    </button>
                  )}
                  <p className="run-hint">
                    Or pick inputs on the left — unanswered ones use this
                    program's default values.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="run-actions">
          <button
            type="button"
            className="run-button"
            onClick={() => launchRun()}
          >
            {running ? "Running — show the graph" : "Run it all"}
          </button>
        </div>
        {runError && <p className="run-error">{runError}</p>}
      </>
    );
  })();

  return (
    <div className="graph-viewer-root">
    <PlaneTour
      stage={launcher === "closed" ? "subgraph" : "launcher"}
      onOpenExample={
        tourExampleReady ? () => enterComposeMode(TOUR_EXAMPLE_TARGET) : undefined
      }
      onSpotlightExample={
        tourExampleReady
          ? (on) => setTourSpotlight(on ? TOUR_EXAMPLE_TARGET : null)
          : undefined
      }
    />
    {/* Desktop-only for now — a phone gets an honest notice instead
        of a broken layout. */}
    <div className="small-screen-notice" role="note">
      <strong>The Plane needs a bigger screen.</strong>
      <p>
        This is a full law-graph workbench — open it on a laptop or
        desktop for now.
      </p>
    </div>
    {launcher !== "closed" && (
      <div
        className={`plane-launcher ${launcher === "leaving" ? "is-leaving" : ""} ${
          launcherMode === "field" ? "is-field" : ""
        }`}
        role="dialog"
        aria-label="Pick a provision to open"
      >
        {corpusModules ? (
          <>
            {launcherMode === "field" ? (
              /* The first view IS the field: the same open world the
                 landing mounts, full-bleed — pan, zoom, motifs,
                 doors; picking calls straight into compose mode. */
              <div className="launcher-field-stage" data-testid="launcher-field">
                <CorpusField
                  onPick={enterComposeMode}
                  frame={false}
                  spotlight={tourSpotlight}
                />
              </div>
            ) : (
              <div className="plane-launcher-inner has-picker launcher-list">
                <SubtreeDoors
                  modules={corpusModules}
                  onPick={enterComposeMode}
                  query={launcherQuery}
                  scope={listScope}
                  state={listState}
                />
              </div>
            )}
            {/* Compact control cluster, top right: search + mode. */}
            <div className="launcher-controls" data-testid="launcher-controls">
              <SubtreeSearch
                modules={corpusModules}
                onPick={enterComposeMode}
                compact
                query={launcherQuery}
                onQueryChange={setLauncherQuery}
              />
              {/* Nationwide / State scope, list mode only — composes
                  with the text search over the same list. */}
              {launcherMode === "list" && (
                <div
                  className="picker-mode-toggle picker-scope-toggle"
                  role="tablist"
                  aria-label="Which corpora to list"
                >
                  {JURISDICTION_SCOPES.map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      role="tab"
                      data-testid={`list-scope-${scope.id}`}
                      aria-selected={listScope === scope.id}
                      className={listScope === scope.id ? "is-active" : ""}
                      onClick={() => pickListScope(scope.id)}
                    >
                      {scope.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Under States, narrow to ONE state — real names from
                  the citations map, only states the corpus carries. */}
              {launcherMode === "list" && listScope === "states" && (
                <select
                  className="list-state-select"
                  data-testid="list-state-select"
                  value={listState}
                  onChange={(event) => setListState(event.target.value)}
                  aria-label="Narrow to one state"
                >
                  <option value={ALL_STATES}>All states</option>
                  {statesInModules(corpusModules).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              <div
                className="picker-mode-toggle"
                role="tablist"
                aria-label="How to browse the corpus"
              >
                <button
                  type="button"
                  role="tab"
                  data-testid="launcher-mode-field"
                  aria-selected={launcherMode === "field"}
                  className={launcherMode === "field" ? "is-active" : ""}
                  onClick={() => pickLauncherMode("field")}
                >
                  Field
                </button>
                <button
                  type="button"
                  role="tab"
                  data-testid="launcher-mode-list"
                  aria-selected={launcherMode === "list"}
                  className={launcherMode === "list" ? "is-active" : ""}
                  onClick={() => pickLauncherMode("list")}
                >
                  List
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="plane-launcher-loading">Loading the corpus…</p>
        )}
      </div>
    )}
    <main className="app-shell no-sidebar">

      <section className="viewer-panel">
        {/* The picker and the field are the ways IN; inside a
            subgraph the canvas itself is the navigation — no program
            dropdown, no in-subtree search box. */}
        <div className="top-controls">
          {/* The way back to the field overview: the frame's own slim
              row ABOVE the plane, flush with the plane's left edge —
              compose AND program views, every host (/axiom overlay,
              standalone /axiom/graph, /app). */}
          {launcher === "closed" && (
            <button
              type="button"
              className="back-to-overview"
              data-testid="back-to-overview"
              onClick={backToOverview}
              title="Back to the corpus overview"
            >
              ← Overview
            </button>
          )}
          {/* Composed views carry no header line at all — the graph
              is its own label. Program views keep their coordinates. */}
          {!composeFocus && (
            <span className="top-meta">
              {programsLoading
                ? "Loading programs"
                : graph
                  ? `${(effectiveProgram?.jurisdiction ?? "").toUpperCase()} · ${graph.rules.length} rules`
                  : "Loading graph"}
            </span>
          )}
        </div>
        <div
          className={`graph-stage ${runResult ? "plane-live" : ""} ${
            planeFresh ? "plane-fresh" : ""
          }`}
        >
          {running && (
            <div className="run-spinner" role="status" aria-label="Computing">
              <span className="run-spinner-ring" />
              <span className="run-spinner-text">computing…</span>
            </div>
          )}
          {/* A failed run must be visible even with the panel closed —
              otherwise silence reads as success. */}
          {runError && !runPanelOpen && !running && (
            <div
              className="run-error run-error-floating"
              role="alert"
              onClick={() => setRunError(null)}
              title="Dismiss"
            >
              {runError}
            </div>
          )}
          {/* A refused subtree announces itself even with the panel
              closed — silence would read as "runnable". */}
          {runBlocked && !runPanelOpen && !running && (
            <div className="run-blocked run-blocked-floating" role="status">
              <strong>This subtree can&rsquo;t execute yet</strong>
              <span>{runBlocked}</span>
            </div>
          )}
          {composeFocus && composedHiddenCount > 0 && (
            // The isolated-node filter's honesty note: tiny, muted,
            // out of the way — never a header.
            <span className="standalone-note" data-testid="standalone-note">
              +{composedHiddenCount} standalone definitions hidden
            </span>
          )}
          <div
            className={`graph-veil ${veiled ? "is-on" : ""}`}
            aria-hidden={!veiled}
          >
            <span>Laying out the graph…</span>
          </div>
          {runResult && !running ? (
            // A live run owns the top-right slot — the pill replaces
            // the Run button until the execution layer is dismissed.
            <div className="exec-pill" role="status">
              <span className="exec-pill-dot" aria-hidden />
              Execution layer · live
              <button type="button" onClick={() => setRunResult(null)}>
                exit
              </button>
            </div>
          ) : runAffordanceReady ? (
            <button
              type="button"
              className={`run-toggle ${resultsStale ? "is-stale" : ""}`}
              disabled={running}
              onClick={() => setRunPanelOpen((open) => !open)}
              aria-expanded={runPanelOpen}
              title="Answer the household's questions and execute the law"
            >
              {running ? "Running…" : "Run a scenario"}
            </button>
          ) : null}
          {runPanelOpen && (
            <div
              className="run-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Run this law"
              onClick={() => setRunPanelOpen(false)}
            >
              <div onClick={(event) => event.stopPropagation()}>
                <div className="run-panel-head">
                  <h2>Run {effectiveProgram?.displayName ?? "this law"}</h2>
                  <button
                    type="button"
                    className="results-close"
                    onClick={() => setRunPanelOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                {scenarioFlowUI}
                {runBlocked && (
                  <div className="run-blocked" role="status">
                    <strong>This subtree can&rsquo;t execute yet</strong>
                    <span>{runBlocked}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="status error">
              {error}
              <button
                type="button"
                className="status-retry"
                onClick={() => {
                  setError(null);
                  setReloadNonce((n) => n + 1);
                }}
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state" role="status" aria-live="polite">
              <span className="loading-spinner" aria-hidden="true" />
              <span>Loading graph...</span>
            </div>
          ) : graph && graph.rules.length === 0 && !composeFocus ? (
            // The certified-serving API answers 200 with no rules when
            // a program's artifact exists but nothing in it is
            // certified yet — a real state, not a failure. Say so
            // instead of asking for an output selection that can't
            // exist.
            (() => {
              const summary = program
                ? allPrograms.find(
                    (item) => programKey(item) === programKey(program),
                  )
                : null;
              const awaiting = summary?.outputCount ?? summary?.inputCount;
              return (
                <div className="empty-state" role="status">
                  Nothing certified yet for this program
                  {awaiting != null && (
                    <>
                      <br />— {awaiting} nodes await the certification sweep
                    </>
                  )}
                </div>
              );
            })()
          ) : spec && Object.keys(structureTraces).length > 0 ? (
            <InputEditContext.Provider value={inputEditCtx}>
            <InteractiveRuleGraph
              spec={spec}
              traces={liveTraces.traces}
              showValues={Boolean(runResult)}
              executionActive={Boolean(runResult)}
              executedLegalIds={effectiveExecuted}
              dissect={lensFocusId ? "always" : "auto"}
              collapsed={folded}
              onCollapsedChange={setFolded}
              flyTo={flyTarget}
              onInspect={focusNode}
              pinnedLegalId={
                inspected && "legalId" in inspected && inspected.legalId
                  ? inspected.legalId
                  : null
              }
              hoverLegalId={null}
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

        {inspected &&
          (() => {
            const legalId =
              "legalId" in inspected && inspected.legalId
                ? inspected.legalId
                : null;
            const rule = legalId ? (walkRuleById.get(legalId) ?? null) : null;
            const input = legalId ? (walkInputById.get(legalId) ?? null) : null;
            const consumers = inspectedConsumers;
            const meta = "meta" in inspected ? inspected.meta : undefined;
            const formula = meta?.formula ?? rule?.formula ?? null;
            const rawCitation =
              meta?.citation ??
              rule?.source ??
              (legalId ? fileLegalIdOf(legalId) : null);
            // A synthetic package home is not a source — a question
            // with no citation shows no Source row rather than the
            // raw "axiom:us-ny-snap-fy-2026" id.
            const citation =
              rawCitation && !rawCitation.startsWith("axiom:")
                ? humanizeSource(rawCitation)
                : null;
            const parameterValue =
              meta?.parameterValue ??
              (rule?.kind === "parameter" && rule.formula
                ? rule.formula.replace(/\s+/g, " ").trim().slice(0, 140)
                : null);
            // The card's computed value from the live run — the same
            // number the canvas box shows, whichever door opened this
            // inspector (canvas click or flow-panel row).
            const liveFragment = legalId ? (legalId.split("#").pop() ?? "") : "";
            const liveRaw = runResult
              ? (runResult.trace.find(
                  (entry) => entry.variable === liveFragment,
                )?.value ?? runResult.outputs[liveFragment])
              : undefined;
            const liveValue =
              liveRaw === undefined || liveRaw === null
                ? null
                : typeof liveRaw === "boolean"
                  ? liveRaw
                    ? "Yes"
                    : "No"
                  : typeof liveRaw === "number"
                    ? liveRaw.toLocaleString("en-US")
                    : String(liveRaw);
            // The provision to read: a rule's own home file. A question
            // has no home in the law (it lives in the synthetic package
            // file), so read the provision that asks it — the first
            // consumer rule housed in a statutes/regulations file.
            const lawFileLegalId = (() => {
              if (!legalId) return null;
              const own = fileLegalIdOf(legalId);
              if (/:(statutes|regulations|manual)\//.test(own)) return own;
              // Synthesized package rules cite their statute in
              // `source` as a raw legal id — that IS the law to read.
              const source = rule?.source;
              if (
                source &&
                /^[a-z]{2}(?:-[a-z]{2})?:(statutes|regulations|manual)\//.test(
                  source,
                )
              ) {
                return source.split("#")[0] ?? null;
              }
              // Only questions borrow a consumer's provision — they
              // have no home in the law, so the section that asks them
              // is the honest read. A RULE with an unreadable home (a
              // policy file the corpus text doesn't carry) must never
              // point at a consumer's law: that provision does not
              // contain it.
              if (!rule) {
                for (const consumer of consumers) {
                  const file = fileLegalIdOf(consumer.legalId);
                  if (/:(statutes|regulations|manual)\//.test(file)) {
                    return file;
                  }
                }
              }
              return null;
            })();
            // The read link carries the cited subsection — the reader
            // focuses it and clamps the rest of the section.
            const lawHref = lawFileLegalId
              ? axiomAppUrlForCitation(
                  lawFileLegalId,
                  citation ? rawCitation : null,
                )
              : null;
            return (
          <aside className="node-inspector" aria-label="Node details">
            <div className="node-inspector-head">
              <button
                type="button"
                className="results-close"
                onClick={() => {
                  // In isolation the sidebar IS the mode — closing it
                  // ends the isolation and restores the map.
                  if (lensTrail.length > 0) closeLens();
                  setInspected(null);
                }}
                aria-label="Close inspector"
              >
                ×
              </button>
            </div>
            {lensTrail.length > 1 && (
              <nav
                className="lens-bar lens-bar-docked"
                aria-label="Isolation trail"
              >
                {lensTrail.map((id, index) => (
                  <button
                    type="button"
                    key={`${id}-${index}`}
                    className={`lens-crumb ${index === lensTrail.length - 1 ? "is-current" : ""}`}
                    onClick={() => jumpLens(index)}
                  >
                    {humanize(id.split("#").pop() ?? id)}
                  </button>
                ))}
              </nav>
            )}
            <h2 className="node-inspector-title">
              {humanize("label" in inspected ? (inspected.label ?? "") : "")}
            </h2>
            {parameterValue ? (
              <p className="parameter-value">
                {formatParameterValue(parameterValue, rule?.unit ?? null)}
              </p>
            ) : null}
            {(() => {
              const cardValue =
                "value" in inspected &&
                inspected.value &&
                "showValues" in inspected &&
                inspected.showValues
                  ? inspected.value
                  : null;
              const shown = cardValue ?? liveValue;
              if (shown === null) return null;
              // Member-level rules can't be traced against the
              // household query yet — the dash is a capability gap,
              // not a computed nothing. Say so.
              const memberLevel =
                shown === "—" &&
                rule?.entity != null &&
                /person|member/i.test(rule.entity);
              return (
                <p className="node-inspector-value">
                  {shown}
                  {memberLevel && (
                    <span className="node-inspector-value-note">
                      member-level — not traced per member yet
                    </span>
                  )}
                </p>
              );
            })()}
            {/* Answer rows stay in the open for question nodes; the
                rest of the metadata lives in the Details disclosure
                further down. */}
            {("kind" in inspected && inspected.kind === "input") || input ? (
            <dl className="node-inspector-meta">
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
              {input && input.name in inputEditValues ? (
                <>
                  <dt>Your answer</dt>
                  <dd>
                    {input.entity === "Person" && extraMembers.length > 0 ? (
                      // One row per member, Person 1 included — the
                      // same uniform stack the run panel uses.
                      <div className="scenario-member-rows">
                        {[null, ...extraMembers].map((member) => (
                          <label
                            key={member ?? "person_1"}
                            className="scenario-member-row"
                          >
                            <span className="scenario-field-member">
                              {member ? memberLabel(member) : "Person 1"}
                            </span>
                            <AnswerControl
                              name={input.name}
                              value={
                                member
                                  ? memberScenario[member]?.[input.name]
                                  : scenario[input.name]
                              }
                              meta={inputMeta}
                              selectClassName="node-inspector-answer"
                              inputClassName="node-inspector-answer"
                              placeholder="answer…"
                              onChange={(next) =>
                                member
                                  ? setMemberScenario((current) => {
                                      const answers = {
                                        ...(current[member] ?? {}),
                                      };
                                      if (next === undefined) {
                                        delete answers[input.name];
                                      } else {
                                        answers[input.name] = next;
                                      }
                                      return {
                                        ...current,
                                        [member]: answers,
                                      };
                                    })
                                  : setScenario((current) => {
                                      if (next === undefined) {
                                        const cleaned = { ...current };
                                        delete cleaned[input.name];
                                        return cleaned;
                                      }
                                      return {
                                        ...current,
                                        [input.name]: next,
                                      };
                                    })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    ) : (
                      <AnswerControl
                        name={input.name}
                        value={scenario[input.name]}
                        meta={inputMeta}
                        selectClassName="node-inspector-answer"
                        inputClassName="node-inspector-answer"
                        placeholder="answer…"
                        onChange={(next) =>
                          setScenario((current) => {
                            if (next === undefined) {
                              const cleaned = { ...current };
                              delete cleaned[input.name];
                              return cleaned;
                            }
                            return { ...current, [input.name]: next };
                          })
                        }
                      />
                    )}
                  </dd>
                </>
              ) : null}
                          </dl>
            ) : null}
            {/* The local lens: this rule as a one-hop graph — built
                from on the left, used by on the right, wires converging
                into the center. Same left-to-right flow as the canvas,
                without the canvas's crowd. When a run is live every
                card carries its value. */}
            {(rule &&
              (rule.ruleDeps.length > 0 || rule.inputDeps.length > 0)) ||
            consumers.length > 0 ? (
              (() => {
                const miniValue = (id: string): string | null => {
                  const raw = liveTraces.valueOf(id);
                  if (raw === undefined || raw === null) return null;
                  if (typeof raw === "boolean")
                    return raw ? "✓ true" : "✗ false";
                  if (typeof raw === "number")
                    return raw.toLocaleString("en-US");
                  return String(raw);
                };
                const deps = [
                  ...(rule?.ruleDeps ?? []).map((depId) => ({
                    id: depId,
                    label: humanize(
                      walkRuleById.get(depId)?.name ??
                        depId.split("#").pop() ??
                        depId,
                    ),
                    kind: "rule" as const,
                    value: miniValue(depId),
                    hint: "Descend to this rule on the canvas",
                    onClick: () => flyFromIndex(depId),
                  })),
                  ...(rule?.inputDeps ?? []).map((depId) => {
                    const bareName =
                      walkInputById.get(depId)?.name ??
                      (depId.split("#").pop() ?? depId).split(".").pop() ??
                      depId;
                    // The engine doesn't trace inputs, so the trace
                    // never carries a value here — the scenario is the
                    // truth for answered ones; unanswered ones ran on
                    // their registry default, and the run says so.
                    const fromScenario =
                      bareName in scenario ? scenario[bareName] : undefined;
                    const format = (raw: number | boolean) =>
                      typeof raw === "boolean"
                        ? raw
                          ? "✓ true"
                          : "✗ false"
                        : raw.toLocaleString("en-US");
                    const fallback = inputMeta.defaults[bareName];
                    const answered =
                      miniValue(depId) ??
                      (fromScenario !== undefined
                        ? format(fromScenario)
                        : null);
                    return {
                    id: depId,
                    label: humanize(bareName),
                    kind: "question" as const,
                    value:
                      answered ??
                      (runResult
                        ? typeof fallback === "number" ||
                          typeof fallback === "boolean"
                          ? `default — ${String(fallback)}`
                          : "default"
                        : null),
                    valueTone:
                      answered === null && runResult
                        ? ("muted" as const)
                        : undefined,
                    hint: "Fly to this question on the canvas",
                    onClick: () => {
                      flyFromIndex(depId);
                      inspectInput(depId);
                    },
                  };
                  }),
                ];
                const uses = consumers.map((consumer) => ({
                  id: consumer.legalId,
                  label: humanize(consumer.name),
                  kind: "rule" as const,
                  value: miniValue(consumer.legalId),
                  hint: inScopeIds.has(consumer.legalId)
                    ? "Climb to this rule on the canvas"
                    : "Expand the canvas up to this rule",
                  onClick: () =>
                    inScopeIds.has(consumer.legalId)
                      ? flyFromIndex(consumer.legalId)
                      : expandLensTo(consumer.legalId),
                }));
                return (
                  <InspectorMiniGraph
                    center={{
                      label: humanize(
                        "label" in inspected ? (inspected.label ?? "") : "",
                      ),
                      value: legalId ? miniValue(legalId) : null,
                    }}
                    deps={deps}
                    consumers={uses}
                  />
                );
              })()
            ) : null}
            {/* Provenance and typing, tucked behind a disclosure —
                the mini graph and the actions are the working surface;
                Source/Status/Entity/Period/Unit are reference. */}
            {citation ||
            rule?.certificationStatus ||
            rule?.certificateId ||
            (rule?.entity ?? input?.entity) ||
            rule?.period ||
            rule?.unit ||
            ("hiddenCount" in inspected && inspected.hiddenCount) ? (
              <details className="node-inspector-code">
                <summary>Details</summary>
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
                  {rule?.certificationStatus ? (
                    <>
                      {/* The four-status launch taxonomy: certification is a
                          status, not a gate — the queue is public on every
                          node. */}
                      <dt>Status</dt>
                      <dd>
                        {rule.certificationStatus === "certified"
                          ? "Certified"
                          : rule.certificationStatus === "validated"
                            ? "Validated, not certified"
                            : rule.certificationStatus === "pending"
                              ? "Pending — not yet encoded"
                              : rule.incompleteByDeclaration
                                ? "Encoded, incomplete by declaration"
                                : "Encoded"}
                      </dd>
                    </>
                  ) : null}
                  {rule?.certificateId ? (
                    <>
                      {/* The verifier certificate is why this node is
                          visible at all — show it, truncated, full id on
                          hover. */}
                      <dt>Certificate</dt>
                      <dd
                        className="node-inspector-mono"
                        title={rule.certificateId}
                      >
                        {rule.certificateId.length > 28
                          ? `${rule.certificateId.slice(0, 28)}…`
                          : rule.certificateId}
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
                  {"hiddenCount" in inspected && inspected.hiddenCount ? (
                    <>
                      <dt>Contains</dt>
                      <dd>{inspected.hiddenCount} rules</dd>
                    </>
                  ) : null}
                </dl>
              </details>
            ) : null}
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
                className="node-inspector-link"
                onClick={() => isolateAt(inspected.legalId)}
              >
                Isolate this rule
              </button>
            ) : null}
            {"kind" in inspected &&
            inspected.kind === "input" &&
            input &&
            input.name in inputEditValues ? (
              <button
                type="button"
                className="node-inspector-lens"
                disabled={running}
                onClick={() => void runScenario()}
              >
                {running ? "Running…" : "Run with these values"}
              </button>
            ) : null}
            {lawHref ? (
              <button
                type="button"
                className="node-inspector-link"
                data-testid="read-the-law"
                onClick={() => {
                  // Encodings can be one level deeper than the corpus
                  // provisions (…/2014/e/6/A vs …/e/6) — resolve to the
                  // nearest existing page instead of opening a 404. But
                  // when the resolved row is just an ancestor of the
                  // cited path, keep the deep path: the reader resolves
                  // it itself and focuses the cited subsection.
                  void fetch(`/api/axiom/resolve${lawHref}`)
                    .then((response) =>
                      response.ok ? response.json() : null,
                    )
                    .then((resolved: { href?: string | null } | null) => {
                      const href = resolved?.href ?? null;
                      const target =
                        href && !lawHref.startsWith(href) ? href : lawHref;
                      setLawPopup(`${target}?embed=1`);
                    })
                    .catch(() => setLawPopup(`${lawHref}?embed=1`));
                }}
              >
                Read the law →
              </button>
            ) : null}
          </aside>
            );
          })()}

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
              {(() => {
                // Headline: the program's own outputs, then the direct
                // ingredients of the first one (the money chain — for
                // SNAP that surfaces the monthly allotment). Every cell
                // is a door to its node on the canvas.
                const names: string[] = [];
                const push = (fragment: string | undefined) => {
                  if (!fragment) return;
                  if (!(fragment in runResult.outputs)) return;
                  if (!names.includes(fragment)) names.push(fragment);
                };
                for (const id of graph?.ownOutputs ?? []) {
                  push(id.split("#").pop());
                }
                const first = (graph?.ownOutputs ?? [])[0];
                const firstRule = first ? walkRuleById.get(first) : null;
                for (const dep of firstRule?.ruleDeps ?? []) {
                  push(dep.split("#").pop());
                }
                if (names.length === 0) {
                  for (const name of Object.keys(runResult.outputs)) {
                    if (!name.includes(":")) push(name);
                  }
                }
                return names.slice(0, 8).map((name) => {
                  const value = runResult.outputs[name];
                  const rule = (graph?.rules ?? []).find(
                    (item) => item.name === name,
                  );
                  return (
                    <button
                      type="button"
                      key={name}
                      className="results-cell"
                      disabled={!rule}
                      title={rule ? "See this on the canvas" : undefined}
                      onClick={() => {
                        if (!rule) return;
                        if (inScopeIds.has(rule.legalId))
                          flyFromIndex(rule.legalId);
                        else expandLensTo(rule.legalId);
                      }}
                    >
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
                    </button>
                  );
                });
              })()}
            </div>
            <div className="results-adjust" aria-label="Adjust and run again">
              {(() => {
                // Every SELECTED input, editable in place: typed values
                // show as themselves, untouched picks show their
                // registry default in the control itself — one list,
                // not an echo plus a second editor.
                const names = [...(selectedLevers ?? [])];
                for (const name of Object.keys(scenario)) {
                  if (!names.includes(name)) names.push(name);
                }
                const answered = names.map(
                  (name) =>
                    allScenarioFields.find((field) => field.name === name) ?? {
                      name,
                      label: name,
                      sample: inputMeta.defaults[name] ?? 0,
                    },
                );
                const perPage = 6;
                const pageCount = Math.max(
                  1,
                  Math.ceil(answered.length / perPage),
                );
                const page = Math.min(adjustPage, pageCount - 1);
                const fields = answered.slice(
                  page * perPage,
                  page * perPage + perPage,
                );
                return (
                  <>
              {fields.map((field) => (
                <label key={field.name} className="results-adjust-field">
                  <span>
                    {(() => {
                      // Link ONLY when the graph has a question of this
                      // exact name. An abstract knob (Monthly Earnings
                      // Per Adult) is not a node in the law graph, and
                      // it must never link to a rule that merely shares
                      // an alias name.
                      const input = (graph?.inputs ?? []).find(
                        (candidate) => candidate.name === field.label,
                      );
                      if (!input) return humanize(field.label);
                      return (
                        <button
                          type="button"
                          className="results-adjust-jump"
                          title="Find this question on the canvas"
                          onClick={() =>
                            goToSearchResult({
                              legalId: input.legalId,
                              kind: "input",
                              inScope: inScopeIds.has(input.legalId),
                            })
                          }
                        >
                          {humanize(field.label)}
                        </button>
                      );
                    })()}
                  </span>
                  <AnswerControl
                    name={field.name}
                    value={scenario[field.name]}
                    meta={inputMeta}
                    selectClassName="results-adjust-select"
                    placeholder={`e.g. ${field.sample}`}
                    onChange={(next) =>
                      setScenario((current) => {
                        if (next === undefined) {
                          const { [field.name]: _gone, ...rest } = current;
                          return rest;
                        }
                        return { ...current, [field.name]: next };
                      })
                    }
                  />
                </label>
              ))}
              {pageCount > 1 && (
                <div
                  className="results-adjust-pager"
                  aria-label="More answered inputs"
                >
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setAdjustPage(page - 1)}
                    aria-label="Previous inputs"
                  >
                    ‹
                  </button>
                  <span>
                    {page + 1}/{pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={page === pageCount - 1}
                    onClick={() => setAdjustPage(page + 1)}
                    aria-label="More inputs"
                  >
                    ›
                  </button>
                </div>
              )}
                  </>
                );
              })()}
              {resultsStale && (
                <p className="results-stale" data-testid="results-stale">
                  values changed — Run again
                </p>
              )}
              <button
                type="button"
                className={`results-rerun ${resultsStale ? "is-stale" : ""}`}
                disabled={running}
                onClick={() => void runScenario()}
              >
                {running ? "Running…" : "Run again"}
              </button>
              <button
                type="button"
                className="results-edit-inputs"
                disabled={running}
                onClick={() => setRunPanelOpen(true)}
                title="Reopen the full input list to add or change answers"
              >
                Edit inputs
              </button>
            </div>
            <p className="results-note">
              Computed by the Axiom engine from your scenario — the graph
              above shows every intermediate value. You answered{" "}
              {Object.keys(scenario).length} of {inputCatalog.length}{" "}
              questions; the rest used this program's default values, so
              a "No" can mean "not asked", not "disqualified".
            </p>
          </aside>
        )}
      </section>
    </main>
    {lawPopup && (
      <div
        className="law-popup-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="The law at this node"
        onClick={() => setLawPopup(null)}
      >
        <div className="law-popup" onClick={(event) => event.stopPropagation()}>
          <div className="law-popup-head">
            <span>The law at this node</span>
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
  return humanizeRuleName(
    value
      .replace(/^snap_/, "")
      .replace(/^universal_credit_/, "UC "),
  );
}

/** Member answers folded into a flat record for scenario-identity
 *  keys. Membership itself dirties the key — an added person with no
 *  answers still changes the household. */
function flattenMemberAnswers(
  members: string[],
  memberScenario: Record<string, Record<string, number | boolean>>,
): Record<string, number | boolean> {
  const flat: Record<string, number | boolean> = {};
  for (const member of members) {
    flat[`${member}:__present`] = true;
    for (const [name, value] of Object.entries(memberScenario[member] ?? {})) {
      flat[`${member}:${name}`] = value;
    }
  }
  return flat;
}

/** "person_3" → "Person 3" — ids are stable across removals, so the
 *  label follows the id, not the position. */
function memberLabel(id: string): string {
  return humanize(id);
}

// ── Input picker computation outline ──
// The run panel's input list rendered as the law's own dependency
// tree. Shared inputs appear under every branch that consumes them —
// the point of the structure.

interface OutlineInputRow {
  name: string;
  legalId: string;
  fileLegalId: string;
  entity: string | null;
  isBool: boolean;
  sample: number | boolean;
}

interface OutlineNode {
  id: string;
  label: string;
  inputs: OutlineInputRow[];
  children: OutlineNode[];
  /** Distinct answerable questions in this subtree. */
  count: number;
}

function InputOutlineBranch({
  node,
  depth,
  pathKey,
  defaultOpen,
  searching,
  openOverrides,
  onToggle,
  onAdd,
}: {
  node: OutlineNode;
  depth: number;
  /** Slash-joined ancestor ids — a DAG node recurs under several
   *  parents, so expansion state keys on the occurrence, not the id. */
  pathKey: string;
  defaultOpen?: boolean;
  searching: boolean;
  openOverrides: Map<string, boolean>;
  onToggle: (key: string, fallback: boolean) => void;
  onAdd: (name: string) => void;
}) {
  // Branches are open unless the visitor (or the synthetic "other
  // definitions" wrapper) says otherwise — the outline shows itself.
  const fallbackOpen = defaultOpen ?? true;
  // A live search overrides stored collapses — hidden matches would
  // read as "no results".
  const isOpen = searching
    ? true
    : (openOverrides.get(pathKey) ?? fallbackOpen);
  return (
    <div
      className="run-outline-branch"
      style={{ "--outline-depth": depth } as React.CSSProperties}
    >
      <button
        type="button"
        className="run-outline-head"
        aria-expanded={isOpen}
        onClick={() => onToggle(pathKey, fallbackOpen)}
      >
        <span className="run-outline-caret" aria-hidden>
          {isOpen ? "▾" : "▸"}
        </span>
        <span className="run-outline-name">{node.label}</span>
      </button>
      {isOpen && (
        <div className="run-outline-body">
          {node.inputs.map((row) => (
            <button
              type="button"
              key={row.legalId}
              className="run-picker-row is-lever"
              title="Add to your answers"
              onClick={() => onAdd(row.name)}
            >
              <span className="run-picker-icon">＋</span>
              <span className="run-picker-name">{humanize(row.name)}</span>
            </button>
          ))}
          {node.children.map((child) => (
            <InputOutlineBranch
              key={`${pathKey}/${child.id}`}
              node={child}
              depth={depth + 1}
              pathKey={`${pathKey}/${child.id}`}
              searching={searching}
              openOverrides={openOverrides}
              onToggle={onToggle}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Labels for encoding conventions whose raw values would read as
// magic numbers. filing_status is the rulespec-us convention: 1 joint,
// 2 married filing separately, everything else not a married filing.
const FILING_STATUS_LABELS: Record<number, string> = {
  0: "0 — not a married filing",
  1: "1 — joint return",
  2: "2 — married filing separately",
};

function enumOptionLabel(inputName: string, option: number): string {
  if (/(^|_)filing_status$/.test(inputName)) {
    return FILING_STATUS_LABELS[option] ?? String(option);
  }
  return String(option);
}

/**
 * The one control for answering a scenario input, typed by the input
 * registry: bools are a three-way select (default — X / true / false)
 * so the registry default stays visible and an explicit false is
 * distinguishable from "unanswered"; closed domains are selects over
 * the statute's own values; everything else is a number field.
 * `undefined` from onChange means "back to the default" — the caller
 * removes the entry from the scenario.
 */
function AnswerControl({
  name,
  value,
  meta,
  onChange,
  selectClassName,
  inputClassName,
  placeholder,
}: {
  name: string;
  value: number | boolean | undefined;
  meta: {
    dtypes: Record<string, string>;
    defaults: Record<string, unknown>;
    options?: Record<string, number[]>;
  };
  onChange: (value: number | boolean | undefined) => void;
  selectClassName?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const dtype = meta.dtypes[name];
  const fallback = meta.defaults[name];
  if (dtype === "bool") {
    // Two options only: the default (named) and its opposite — a
    // separate "false" when the default IS false would be the same
    // answer twice. Explicitly picking the default value collapses
    // into "default".
    const presumed = Boolean(fallback);
    return (
      <select
        className={selectClassName}
        value={value === undefined || value === presumed ? "" : String(value)}
        onChange={(event) =>
          onChange(
            event.target.value === ""
              ? undefined
              : event.target.value === "true",
          )
        }
      >
        <option value="">default — {String(presumed)}</option>
        <option value={String(!presumed)}>{String(!presumed)}</option>
      </select>
    );
  }
  const domain = meta.options?.[name];
  if (domain) {
    // Same rule for closed domains: the default's own entry folds into
    // the "default" option instead of appearing twice.
    const presumed = Number(fallback) || 0;
    return (
      <select
        className={selectClassName}
        value={
          value === undefined || value === presumed ? "" : String(value)
        }
        onChange={(event) =>
          onChange(
            event.target.value === ""
              ? undefined
              : Number(event.target.value),
          )
        }
      >
        <option value="">default — {enumOptionLabel(name, presumed)}</option>
        {domain
          .filter((option) => option !== presumed)
          .map((option) => (
            <option key={option} value={String(option)}>
              {enumOptionLabel(name, option)}
            </option>
          ))}
      </select>
    );
  }
  return (
    <input
      type="number"
      className={inputClassName}
      step={dtype === "integer" ? 1 : "any"}
      placeholder={placeholder}
      value={typeof value === "number" ? String(value) : ""}
      onChange={(event) =>
        onChange(
          event.target.value === ""
            ? undefined
            : Number(event.target.value),
        )
      }
    />
  );
}

/**
 * Rules weakly connected to the law's own outputs. Everything else is
 * a standalone piece — other-territory tables bundled by a shared
 * federal file, or chains not yet wired into the law — and stays off
 * the whole-law survey. The outputs list still offers every rule, so
 * an island can be brought on stage deliberately.
 */
function connectedToOwnOutputs(graph: ProgramGraph): Set<string> | null {
  return connectedComponent(graph, defaultOutputsForProgram(graph));
}

/** Every node weakly connected to any of the seeds. */
function connectedComponent(
  graph: ProgramGraph,
  seeds: string[],
): Set<string> | null {
  if (seeds.length === 0) return null;
  const adjacency = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    const forward = adjacency.get(a);
    if (forward) forward.push(b);
    else adjacency.set(a, [b]);
    const backward = adjacency.get(b);
    if (backward) backward.push(a);
    else adjacency.set(b, [a]);
  };
  for (const rule of graph.rules) {
    for (const dep of rule.ruleDeps) link(rule.legalId, dep);
    for (const dep of rule.inputDeps) link(rule.legalId, dep);
    for (const dep of rule.relationDeps) link(rule.legalId, dep);
  }
  const connected = new Set<string>(seeds);
  const stack = [...seeds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const next of adjacency.get(id) ?? []) {
      if (!connected.has(next)) {
        connected.add(next);
        stack.push(next);
      }
    }
  }
  return connected;
}

/** Jurisdictions hidden from the viewer for now (registry still
 *  serves them; this is presentation only). */
const HIDDEN_COUNTRIES = new Set<Country>(["uk"]);
/** Individual programs hidden for now — us-ny/tanf executes into a
 *  known parameter-table gap until rulespec-us#1131's artifact lands. */
const HIDDEN_PROGRAMS = new Set<string>(["us-ny/tanf"]);

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

type FormulaNode =
  | { type: "atom"; kind: "id" | "num" | "str"; text: string }
  | { type: "call"; name: string; args: FormulaNode[] }
  | { type: "chain"; items: FormulaNode[]; ops: string[] };

type FormulaSpan = { cls: string; text: string; title?: string };
type FormulaLine = { indent: number; spans: FormulaSpan[] };

const FORMULA_WIDTH = 42;

/** Parse the engine's expression grammar just enough to re-print it
 *  as code: calls, operator chains, atoms. Throws on anything odd —
 *  the caller falls back to the flat rendering. */
function parseFormula(source: string): FormulaNode {
  const tokens = (source.match(FORMULA_TOKEN_RE) ?? []).filter(
    (token) => !/^\s+$/.test(token),
  );
  let at = 0;
  const peek = () => tokens[at];
  const next = () => tokens[at++];
  const parsePrimary = (): FormulaNode => {
    const token = next();
    if (token === undefined) throw new Error("eof");
    if (token === "(") {
      const inner = parseExpr();
      if (next() !== ")") throw new Error("paren");
      return inner;
    }
    if (/^[A-Za-z_]/.test(token)) {
      if (token.toLowerCase() === "not") {
        return { type: "call", name: "not", args: [parsePrimary()] };
      }
      if (peek() === "(") {
        next();
        const args: FormulaNode[] = [];
        if (peek() !== ")") {
          args.push(parseExpr());
          while (peek() === ",") {
            next();
            args.push(parseExpr());
          }
        }
        if (next() !== ")") throw new Error("call");
        return { type: "call", name: token, args };
      }
      return { type: "atom", kind: "id", text: token };
    }
    if (/^[\d"']/.test(token) || /^-?\d/.test(token)) {
      return { type: "atom", kind: /^\d|^-/.test(token) ? "num" : "str", text: token };
    }
    if (token === "-" && tokens[at] && /^\d/.test(tokens[at])) {
      const value = next();
      return { type: "atom", kind: "num", text: `-${value}` };
    }
    throw new Error(`unexpected ${token}`);
  };
  const isOp = (token: string | undefined) =>
    token !== undefined &&
    (/^[-+*/<>=%]|<=|>=|==|!=$/.test(token) ||
      ["and", "or", "in"].includes(token.toLowerCase()));
  const parseExpr = (): FormulaNode => {
    let left = parsePrimary();
    const items = [left];
    const ops: string[] = [];
    while (isOp(peek())) {
      let op = next()!;
      if ((op === "<" || op === ">" || op === "=" || op === "!") && peek() === "=") {
        op += next();
      }
      ops.push(op);
      items.push(parsePrimary());
    }
    if (items.length === 1) return left;
    return { type: "chain", items, ops };
  };
  const result = parseExpr();
  if (at !== tokens.length) throw new Error("trailing");
  return flattenFormula(result);
}

/** ((((a - b) - c) - d) reads as noise — merge left-nested chains of
 *  the same precedence class into one flat chain (safe: it mirrors
 *  left associativity exactly). */
function formulaOpClass(op: string): string {
  if (op === "+" || op === "-") return "add";
  if (op === "*" || op === "/") return "mul";
  return op.toLowerCase();
}
function flattenFormula(node: FormulaNode): FormulaNode {
  if (node.type === "call") {
    return { ...node, args: node.args.map(flattenFormula) };
  }
  if (node.type !== "chain") return node;
  const items = node.items.map(flattenFormula);
  const ops = [...node.ops];
  const parentClass = formulaOpClass(ops[0]);
  const uniform = ops.every((op) => formulaOpClass(op) === parentClass);
  const head = items[0];
  if (
    uniform &&
    head.type === "chain" &&
    head.ops.every((op) => formulaOpClass(op) === parentClass)
  ) {
    return {
      type: "chain",
      items: [...head.items, ...items.slice(1)],
      ops: [...head.ops, ...ops],
    };
  }
  return { type: "chain", items, ops };
}

function formulaAtomSpan(node: Extract<FormulaNode, { type: "atom" }>): FormulaSpan {
  if (node.kind === "id") {
    return FORMULA_KEYWORDS.has(node.text.toLowerCase())
      ? { cls: "fp-kw", text: node.text }
      : {
          cls: "fp-id",
          text: humanize(node.text.split(".").pop() ?? node.text),
          title: node.text,
        };
  }
  return { cls: "fp-num", text: node.text };
}

/** Single-line spans for a node (used when it fits). `wrap` adds
 *  parens around mixed-operator children so meaning stays exact. */
function formulaInline(node: FormulaNode, wrap = false): FormulaSpan[] {
  if (node.type === "atom") return [formulaAtomSpan(node)];
  if (node.type === "call") {
    if (node.name === "not" && node.args.length === 1) {
      const arg = node.args[0];
      return [
        { cls: "fp-kw", text: "not " },
        ...formulaInline(arg, arg.type === "chain"),
      ];
    }
    const spans: FormulaSpan[] = [
      { cls: FORMULA_KEYWORDS.has(node.name.toLowerCase()) ? "fp-kw" : "fp-id", text: node.name },
      { cls: "fp-op", text: "(" },
    ];
    node.args.forEach((arg, index) => {
      if (index > 0) spans.push({ cls: "fp-op", text: ", " });
      spans.push(...formulaInline(arg));
    });
    spans.push({ cls: "fp-op", text: ")" });
    return spans;
  }
  const spans: FormulaSpan[] = [];
  if (wrap) spans.push({ cls: "fp-op", text: "(" });
  node.items.forEach((item, index) => {
    if (index > 0) spans.push({ cls: "fp-op", text: ` ${node.ops[index - 1]} ` });
    spans.push(...formulaInline(item, item.type === "chain"));
  });
  if (wrap) spans.push({ cls: "fp-op", text: ")" });
  return spans;
}

const spanLength = (spans: FormulaSpan[]) =>
  spans.reduce((sum, span) => sum + span.text.length, 0);

/** Lay a node out as code lines within FORMULA_WIDTH. */
function formulaLayout(
  node: FormulaNode,
  indent: number,
  out: FormulaLine[],
  prefix: FormulaSpan[] = [],
  suffix: FormulaSpan[] = [],
): void {
  const inline = [...prefix, ...formulaInline(node), ...suffix];
  if (indent * 2 + spanLength(inline) <= FORMULA_WIDTH) {
    out.push({ indent, spans: inline });
    return;
  }
  if (node.type === "call") {
    if (node.name === "not" && node.args.length === 1) {
      const arg = node.args[0];
      formulaLayout(
        arg,
        indent,
        out,
        [...prefix, { cls: "fp-kw", text: "not " }, { cls: "fp-op", text: "(" }],
        [{ cls: "fp-op", text: ")" }, ...suffix],
      );
      return;
    }
    out.push({
      indent,
      spans: [
        ...prefix,
        { cls: FORMULA_KEYWORDS.has(node.name.toLowerCase()) ? "fp-kw" : "fp-id", text: node.name },
        { cls: "fp-op", text: "(" },
      ],
    });
    node.args.forEach((arg, index) => {
      formulaLayout(
        arg,
        indent + 1,
        out,
        [],
        index < node.args.length - 1 ? [{ cls: "fp-op", text: "," }] : [],
      );
    });
    out.push({ indent, spans: [{ cls: "fp-op", text: ")" }, ...suffix] });
    return;
  }
  if (node.type === "chain") {
    node.items.forEach((item, index) => {
      const opPrefix: FormulaSpan[] =
        index === 0
          ? [...prefix]
          : [{ cls: "fp-op", text: `${node.ops[index - 1]} ` }];
      const itemSuffix = index === node.items.length - 1 ? suffix : [];
      const childIndent = index === 0 ? indent : indent + 1;
      if (item.type === "chain") {
        formulaLayout(item, childIndent, out,
          [...opPrefix, { cls: "fp-op", text: "(" }],
          [{ cls: "fp-op", text: ")" }, ...itemSuffix]);
      } else {
        formulaLayout(item, childIndent, out, opPrefix, itemSuffix);
      }
    });
    return;
  }
  out.push({ indent, spans: inline });
}

function FormulaPretty({ source }: { source: string }) {
  const lines = useMemo<FormulaLine[] | null>(() => {
    try {
      const ast = parseFormula(source);
      const out: FormulaLine[] = [];
      formulaLayout(ast, 0, out);
      return out;
    } catch {
      return null;
    }
  }, [source]);
  if (!lines) {
    // Unparseable — flat token coloring, never nothing.
    const tokens = source.match(FORMULA_TOKEN_RE) ?? [source];
    return (
      <code className="formula-pretty">
        {tokens.map((token, index) => {
          if (/^\s+$/.test(token)) return token;
          if (/^[A-Za-z_]/.test(token)) {
            return FORMULA_KEYWORDS.has(token.toLowerCase()) ? (
              <span key={index} className="fp-kw">{token}</span>
            ) : (
              <span key={index} className="fp-id" title={token}>
                {humanize(token.split(".").pop() ?? token)}
              </span>
            );
          }
          if (/^[\d"']/.test(token)) {
            return <span key={index} className="fp-num">{token}</span>;
          }
          return <span key={index} className="fp-op">{token}</span>;
        })}
      </code>
    );
  }
  return (
    <code className="formula-pretty formula-block">
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="fp-line">
          {"  ".repeat(line.indent)}
          {line.spans.map((span, spanIndex) => (
            <span key={spanIndex} className={span.cls} title={span.title}>
              {span.text}
            </span>
          ))}
        </span>
      ))}
    </code>
  );
}
