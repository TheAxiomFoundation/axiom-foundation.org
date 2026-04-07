"use client";

import Link from "next/link";
import { useState } from "react";
import CodeBlock from "@/components/code-block";
import {
  ArrowRightIcon,
  CheckIcon,
  CodeIcon,
  CpuIcon,
  FileIcon,
  FolderIcon,
  ImportIcon,
  TargetIcon,
  TerminalIcon,
  VersionIcon,
} from "@/components/icons";

type SnippetLanguage = "rac" | "xml" | "python" | "yaml" | "catala" | "plain";

type StackLayer = {
  id: string;
  step: string;
  title: string;
  summary: string;
  details: string[];
  components: string[];
  repos: string[];
  outputs: string[];
  snippetLabel: string;
  snippetLanguage: SnippetLanguage;
  snippet: string;
  icon: React.ReactNode;
};

type RuntimeStage = {
  id: string;
  label: string;
  detail: string;
};

type RepoLane = {
  id: string;
  title: string;
  summary: string;
  repos: string[];
};

const stackLayers: StackLayer[] = [
  {
    id: "scrape",
    step: "01",
    title: "Collect and archive official documents",
    summary:
      "Everything starts with real government material: statutes, regulations, manuals, guidance, PDFs, HTML, and XML snapshots.",
    details: [
      "Scrapers and source importers pull official documents into durable source trees before any encoding happens.",
      "We keep archived snapshots and exact source references so later harness changes can be tied back to stable inputs.",
      "This is the layer that distinguishes source acquisition from later encoding work.",
    ],
    components: [
      "official source fetchers",
      "archive snapshots",
      "source specs and converters",
    ],
    repos: ["atlas", "rac-uk", "rac-us", "rac-us-co"],
    outputs: ["official PDF and HTML snapshots", "source refs", "archived raw text"],
    snippetLabel: "source acquisition shape",
    snippetLanguage: "plain",
    snippet: `sources/
  official/
    uksi/2002/1792/2025-03-31/source.akn
    statute/crs/26-2-703/2026-04-03/source.html
  slices/
    9-CCR-2503-6/3.606.1/I.txt`,
    icon: <FileIcon className="w-5 h-5" />,
  },
  {
    id: "akomize",
    step: "02",
    title: "Normalize structure into Akoma Ntoso",
    summary:
      "Akomize gives the system a structural representation of the law so later tools can target exact sections, paragraphs, and subparagraphs.",
    details: [
      "Documents are normalized into AKN or an equivalent tree with stable eIds and hierarchy.",
      "That structure is what lets us talk about `regulation-13B-1-b` or `section 3ZA(3)` as concrete targets instead of fuzzy spans.",
      "For policy manuals and state materials, this step is what makes non-statute sources feel like first-class inputs.",
    ],
    components: [
      "AKN normalization",
      "eId generation",
      "hierarchy extraction",
    ],
    repos: ["atlas", "rac-us-co"],
    outputs: ["source.akn", "source.xml", "section and paragraph ids"],
    snippetLabel: "AKN slice",
    snippetLanguage: "xml",
    snippet: `<section eId="regulation-13B-1-b">
  <num>(b)</num>
  <content>
    <p>on the day of the week in respect of which the benefit is payable</p>
  </content>
</section>`,
    icon: <ImportIcon className="w-5 h-5" />,
  },
  {
    id: "source-graph",
    step: "03",
    title: "Build source trees and exact slices",
    summary:
      "Once the documents are structured, the stack can expose source trees, exact slices, and cross-document references to both humans and the harness.",
    details: [
      "The source graph feeds Atlas browsing, section-level deep links, and encoder workspaces.",
      "Exact slices are copied into local workspaces as `source.txt` so benchmark runs are reproducible and inspectable.",
      "This is also where canonical upstream homes exist before we decide whether a RAC import should resolve to a real file or a temporary stub.",
    ],
    components: [
      "section selection",
      "slice extraction",
      "cross-reference resolution",
    ],
    repos: ["atlas", "autorac"],
    outputs: ["source.txt", "context-manifest.json", "navigable source tree"],
    snippetLabel: "eval workspace context",
    snippetLanguage: "yaml",
    snippet: `source_ref: /uksi/2002/1792/2025-03-31
section_eid: schedule-VI-paragraph-4-3-a
context_files:
  - source.txt
  - context-manifest.json`,
    icon: <FolderIcon className="w-5 h-5" />,
  },
  {
    id: "rac",
    step: "04",
    title: "Encode law into RAC corpora",
    summary:
      "RAC is the rules language and corpus layer. This is where statutes, regulations, and manuals become tested, versioned rule files.",
    details: [
      "The corpus repos hold `.rac` files, companion tests, imports, wave manifests, and provenance policies.",
      "The point is not just DSL syntax; it is durable, reviewable legal source-to-rule mapping.",
      "This is where manual leaves, statute leaves, and cross-document imports eventually live side by side.",
    ],
    components: [
      ".rac files",
      ".rac.test files",
      "wave manifests",
      "import graph",
    ],
    repos: ["rac", "rac-uk", "rac-us", "rac-us-co"],
    outputs: ["compileable rules", "tests", "provenance manifests"],
    snippetLabel: "RAC leaf",
    snippetLanguage: "rac",
    snippet: `claimant_or_partner_had_award_of_state_pension_credit:
  entity: Family
  period: Day
  dtype: Boolean
  from 2025-03-21:
    claimant_had_award_of_state_pension_credit
      or (
        claimant_has_partner
        and partner_had_award_of_state_pension_credit
      )`,
    icon: <CodeIcon className="w-5 h-5" />,
  },
  {
    id: "autorac",
    step: "05",
    title: "Generate and evaluate with AutoRAC",
    summary:
      "AutoRAC is the harness layer: benchmark manifests, workspace construction, generation policy, deterministic CI, oracles, review, and readiness gates.",
    details: [
      "AutoRAC consumes exact slices and canonical context, then emits candidate `.rac` and `.rac.test` bundles.",
      "This is where numeric grounding, import discipline, semantic review, and suite-level readiness live.",
      "It is also where `autoresearch` can mutate a narrow prompt surface and optimize against frozen benchmark sets.",
    ],
    components: [
      "benchmark manifests",
      "workspace hydration",
      "deterministic CI",
      "generalist review",
      "autoresearch loop",
    ],
    repos: ["autorac"],
    outputs: ["suite-run.json", "summary.json", "trace files", "accepted harness changes"],
    snippetLabel: "suite gate summary",
    snippetLanguage: "plain",
    snippet: `{
  "ready": true,
  "success_rate": 1.0,
  "compile_pass_rate": 1.0,
  "ci_pass_rate": 1.0,
  "generalist_review_pass_rate": 1.0
}`,
    icon: <CpuIcon className="w-5 h-5" />,
  },
  {
    id: "engine",
    step: "06",
    title: "Compile, validate, test, and execute",
    summary:
      "The RAC engine is what turns encodings into something executable: validators, test runners, interpreters, and code generation targets.",
    details: [
      "`rac.validate` and `rac.test_runner` are the first execution surfaces every encoding sees.",
      "The runtime and codegen layers are what make a `.rac` file more than documentation: they let the same encoding drive evaluation and external integrations.",
      "This is where imports, periods, dtypes, formulas, and built-ins become machine behavior.",
    ],
    components: [
      "rac.validate",
      "rac.test_runner",
      "executor",
      "python/js/rust codegen",
    ],
    repos: ["rac"],
    outputs: ["validation results", "test results", "runtime values", "generated code"],
    snippetLabel: "execution commands",
    snippetLanguage: "plain",
    snippet: `uv run python -m rac.validate all /path/to/repo
uv run python -m rac.test_runner /path/to/repo -v`,
    icon: <TerminalIcon className="w-5 h-5" />,
  },
  {
    id: "atlas",
    step: "07",
    title: "Publish and inspect in Atlas",
    summary:
      "Atlas is the public-facing inspection layer where source trees, RAC files, encodings, provenance, and agent logs become explorable.",
    details: [
      "Atlas is downstream of the corpus and harness, not the source of truth.",
      "It exposes source documents, rule trees, encoding records, and agent logs in one place.",
      "This is also where funders, researchers, and engineers can inspect how a specific rule got from text to executable encoding.",
    ],
    components: [
      "rule trees",
      "encoding records",
      "agent logs",
      "source document browser",
    ],
    repos: ["atlas", "axiom-foundation.org"],
    outputs: ["public rule pages", "encoding views", "document browser"],
    snippetLabel: "live surface",
    snippetLanguage: "plain",
    snippet: `Atlas shows:
- official source documents
- RAC encodings
- encoding_runs metadata
- per-encoding agent logs`,
    icon: <TargetIcon className="w-5 h-5" />,
  },
];

const runtimeStages: RuntimeStage[] = [
  {
    id: "input",
    label: "Input",
    detail:
      "A source tree and exact slice are selected from ingested official documents.",
  },
  {
    id: "encode",
    label: "Encode",
    detail:
      "AutoRAC generates `.rac` and `.rac.test` against explicit harness rules and hydrated context.",
  },
  {
    id: "check",
    label: "Check",
    detail:
      "Deterministic CI, tests, and semantic review decide whether the candidate is promotion-safe.",
  },
  {
    id: "run",
    label: "Run",
    detail:
      "The RAC engine validates, tests, and executes the accepted encoding.",
  },
  {
    id: "publish",
    label: "Publish",
    detail:
      "Wave manifests and Atlas sync expose the result as a durable, inspectable rule artifact.",
  },
];

const repoLanes: RepoLane[] = [
  {
    id: "source",
    title: "Source and structure",
    summary:
      "Document acquisition, converters, and AKN structure live here before any rules encoding starts.",
    repos: ["atlas", "rac-uk sources", "rac-us sources", "rac-us-co sources"],
  },
  {
    id: "corpus",
    title: "Rule corpora",
    summary:
      "Jurisdiction-specific `.rac` files, tests, imports, and provenance manifests.",
    repos: ["rac-uk", "rac-us", "rac-us-co"],
  },
  {
    id: "tooling",
    title: "Language and harness",
    summary:
      "The RAC engine executes rules, while AutoRAC builds, benchmarks, and repairs encodings.",
    repos: ["rac", "autorac"],
  },
  {
    id: "presentation",
    title: "Presentation and inspection",
    summary:
      "Atlas and the site expose source, encodings, provenance, and logs to users.",
    repos: ["atlas", "axiom-foundation.org"],
  },
];

const stackStats = [
  { label: "7 layers", value: "7" },
  { label: "5 runtime stages", value: "5" },
  { label: "8 core repos", value: "8" },
  { label: "1 public inspection surface", value: "1" },
];

export function StackSystemPage() {
  const [selectedLayerId, setSelectedLayerId] = useState(stackLayers[0].id);
  const selectedLayer =
    stackLayers.find((layer) => layer.id === selectedLayerId) ?? stackLayers[0];

  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[1280px] mx-auto">
        <header className="mb-20">
          <div className="mb-10 max-w-[900px]">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] mb-4">
              Axiom technical stack
            </p>
            <h1 className="heading-page mb-6">
              From scraped documents to executable rules
            </h1>
            <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed max-w-[820px]">
              This is the broader architecture around AutoRAC: source scraping,
              Akoma Ntoso normalization, source trees, RAC corpora, the
              harness, the execution engine, and the Atlas inspection layer.
            </p>
          </div>

          <div className="rounded-md border border-[var(--color-rule)] bg-[linear-gradient(135deg,rgba(192,80,0,0.08),rgba(12,12,12,0.02))] p-8 mb-10">
            <div className="flex flex-wrap items-start justify-between gap-8">
              <div className="max-w-[720px]">
                <p className="font-body text-[1rem] text-[var(--color-ink)] leading-relaxed mb-4">
                  AutoRAC is one layer in a longer chain. The important split is
                  that source ingestion, structural normalization, encoded
                  corpora, harness evaluation, and execution are separate
                  systems on purpose, so each layer can be audited and improved
                  without pretending the others are the same problem.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/autorac" className="btn-outline">
                    Open AutoRAC system map
                  </Link>
                  <Link href="/atlas" className="btn-primary">
                    Explore Atlas
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 min-w-[320px] flex-1">
                {stackStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-5"
                  >
                    <div className="font-mono text-2xl text-[var(--color-ink)] mb-1">
                      {stat.value}
                    </div>
                    <div className="font-body text-sm text-[var(--color-ink-secondary)]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {runtimeStages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex items-center gap-3 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-4 py-2"
              >
                <span className="font-mono text-xs text-[var(--color-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-body text-sm text-[var(--color-ink)]">
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </header>

        <section className="mb-24">
          <div className="mb-8">
            <h2 className="heading-section mb-3">
              Layer explorer
            </h2>
            <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] max-w-[760px] leading-relaxed">
              The stack is separated into layers so document acquisition,
              structural normalization, rule encoding, execution, and public
              inspection can each be evaluated on their own terms.
            </p>
          </div>

          <div className="grid grid-cols-[minmax(260px,0.9fr)_minmax(0,1.3fr)] gap-8 max-lg:grid-cols-1">
            <div className="flex flex-col gap-3">
              {stackLayers.map((layer) => {
                const active = layer.id === selectedLayer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`text-left rounded-md border px-4 py-4 transition-all duration-150 ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                        : "border-[var(--color-rule)] bg-[var(--color-paper-elevated)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-paper)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                        {layer.icon}
                      </div>
                      <div>
                        <div className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-accent)] mb-1">
                          Layer {layer.step}
                        </div>
                        <div className="font-body text-[1rem] text-[var(--color-ink)] mb-2 leading-tight">
                          {layer.title}
                        </div>
                        <div className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                          {layer.summary}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center">
                    {selectedLayer.icon}
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">
                      Layer {selectedLayer.step}
                    </p>
                    <h3 className="font-body text-2xl text-[var(--color-ink)]">
                      {selectedLayer.title}
                    </h3>
                  </div>
                </div>

                <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-6">
                  {selectedLayer.summary}
                </p>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <h4 className="font-body text-lg text-[var(--color-ink)] mb-3">
                      What this layer does
                    </h4>
                    <div className="flex flex-col gap-3">
                      {selectedLayer.details.map((detail) => (
                        <div
                          key={detail}
                          className="flex items-start gap-3 font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed"
                        >
                          <CheckIcon className="w-4 h-4 text-[var(--color-success)] mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
                      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-3">
                        components
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedLayer.components.map((component) => (
                          <span
                            key={component}
                            className="rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-3 py-1 font-mono text-xs text-[var(--color-code-text)]"
                          >
                            {component}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
                      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-3">
                        repos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedLayer.repos.map((repo) => (
                          <span
                            key={repo}
                            className="rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-3 py-1 font-mono text-xs text-[var(--color-code-text)]"
                          >
                            {repo}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
                      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-3">
                        outputs
                      </p>
                      <div className="flex flex-col gap-2">
                        {selectedLayer.outputs.map((output) => (
                          <div
                            key={output}
                            className="flex items-start gap-2 font-body text-sm text-[var(--color-ink-secondary)]"
                          >
                            <TerminalIcon className="w-4 h-4 text-[var(--color-accent)] mt-0.5 shrink-0" />
                            <span>{output}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-code-bg)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2826]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
                  <span className="font-mono text-xs text-[var(--color-code-text)]">
                    {selectedLayer.snippetLabel}
                  </span>
                </div>
                <CodeBlock
                  code={selectedLayer.snippet}
                  language={selectedLayer.snippetLanguage}
                  className="m-0 p-6 font-mono text-[0.82rem] leading-7 whitespace-pre-wrap text-[var(--color-code-text)] overflow-x-auto"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-24">
          <div className="flex items-end justify-between gap-6 mb-8 max-md:flex-col max-md:items-start">
            <div>
              <h2 className="heading-section mb-3">
                Runtime path
              </h2>
              <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] max-w-[760px] leading-relaxed">
                A `.rac` file is not the end state. The stack exists so a
                source-backed rule can be validated, tested, executed, and then
                inspected in public.
              </p>
            </div>
            <Link href="/autorac" className="btn-outline">
              See the harness-only view
            </Link>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {runtimeStages.map((stage, index) => (
              <div
                key={stage.id}
                className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-5"
              >
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-accent)] mb-3">
                  Stage {String(index + 1).padStart(2, "0")}
                </div>
                <div className="font-body text-lg text-[var(--color-ink)] mb-2">
                  {stage.label}
                </div>
                <div className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  {stage.detail}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <div className="mb-8">
            <h2 className="heading-section mb-3">
              Repository map
            </h2>
            <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] max-w-[760px] leading-relaxed">
              The stack is split across repositories because source
              acquisition, rule corpora, execution tooling, and public
              presentation change at different speeds.
            </p>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
            {repoLanes.map((lane) => (
              <div
                key={lane.id}
                className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-6"
              >
                <h3 className="font-body text-lg text-[var(--color-ink)] mb-3">
                  {lane.title}
                </h3>
                <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed mb-4">
                  {lane.summary}
                </p>
                <div className="flex flex-col gap-2">
                  {lane.repos.map((repo) => (
                    <div
                      key={repo}
                      className="flex items-start gap-2 font-mono text-xs text-[var(--color-code-text)] rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2"
                    >
                      <VersionIcon className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                      <span>{repo}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8">
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)] gap-8 max-lg:grid-cols-1">
              <div>
                <h2 className="heading-section mb-4">
                  Why the split matters
                </h2>
                <div className="flex flex-col gap-4">
                  {[
                    "If source ingestion is sloppy, every later layer inherits bad authority.",
                    "If AKN structure is weak, you cannot target exact slices or build reliable imports.",
                    "If the corpus layer is weak, the harness has nothing durable to promote into.",
                    "If the harness is weak, you get compileable but semantically unsafe encodings.",
                    "If the execution layer is weak, the rules are not actually usable.",
                    "If Atlas is weak, nobody can inspect or trust the output.",
                  ].map((line) => (
                    <div
                      key={line}
                      className="flex items-start gap-3 font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed"
                    >
                      <CheckIcon className="w-4 h-4 text-[var(--color-success)] mt-0.5 shrink-0" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-6">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] mb-4">
                  Cross-links
                </p>
                <div className="flex flex-col gap-3">
                  <Link href="/autorac" className="btn-outline">
                    AutoRAC system map
                  </Link>
                  <Link href="/atlas" className="btn-outline">
                    Atlas encoding views
                  </Link>
                  <Link href="/about" className="btn-outline">
                    About the project
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
