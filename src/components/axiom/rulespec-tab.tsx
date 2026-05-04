"use client";

import { useEffect, useMemo, useState } from "react";
import { isGitHubEncoding } from "@/lib/axiom-utils";
import type { EncodingRunScores, RuleEncodingData } from "@/lib/supabase";
import { getRuleSpecRepoForJurisdiction } from "@/lib/axiom/repo-map";
import {
  parseRuleSpec,
  parseRuleSpecTests,
  tokenizeFormula,
  type RuleSpecDoc,
  type RuleSpecRule,
  type RuleSpecTestCase,
  type RuleSpecVersion,
} from "@/lib/axiom/rulespec/doc";
import { ExpandableCode } from "./expandable-code";

/**
 * Rich RuleSpec encoding view. Replaces the older "raw YAML in a
 * Prism block" treatment: parses the document into rules/versions/
 * tests and renders each as its own card with badges, an effective-
 * dated formula list, and (when available) a sibling test file
 * fetched from the repo.
 *
 * Identifier highlighting is best-effort and intentionally local:
 * tokens in a formula that match another rule's ``name`` in the same
 * file resolve to in-page anchors. Cross-file resolution belongs in a
 * future global identifier index, not here.
 */
export function RuleSpecTab({
  encoding,
  loading,
  jurisdiction,
}: {
  encoding: RuleEncodingData | null;
  loading: boolean;
  jurisdiction: string;
}) {
  const tests = useRuleSpecTests(encoding, jurisdiction);
  const doc = useMemo(
    () => (encoding?.rulespec_content ? parseRuleSpec(encoding.rulespec_content) : null),
    [encoding?.rulespec_content]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--color-ink-muted)]">
        Loading encoding data...
      </div>
    );
  }

  if (!encoding) {
    return (
      <div className="py-10 text-center">
        <div
          className="text-base text-[var(--color-ink-secondary)] mb-2"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          Not yet encoded
        </div>
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          This rule has not been encoded into RuleSpec format yet.
        </p>
      </div>
    );
  }

  const isGitHub = isGitHubEncoding(encoding);
  const repo = getRuleSpecRepoForJurisdiction(jurisdiction);
  const gitHubUrl = repo
    ? `https://github.com/TheAxiomFoundation/${repo}/blob/main/${encoding.file_path}`
    : null;
  const sourceDescription = isGitHub
    ? "Displaying the canonical repository encoding."
    : "Displaying the latest stored encoding run. It may differ from the repository file.";
  const scores = encoding.final_scores;

  const localNames = new Set(doc?.rules.map((r) => r.name) ?? []);
  const testsByRule = groupTestsByRule(tests, localNames);
  const orphanTests = tests.filter((t) => !ownerRuleFor(t, localNames));

  const docHasContent =
    !!doc && (doc.rules.length > 0 || !!doc.module.summary);

  return (
    <div className="space-y-8">
      <SourceHeader
        filePath={encoding.file_path}
        description={sourceDescription}
        gitHubUrl={gitHubUrl}
        isGitHub={isGitHub}
      />

      {scores && !isGitHub && <ScoresBlock scores={scores} />}

      {docHasContent ? (
        <>
          {doc!.module.summary && (
            <Summary text={doc!.module.summary} />
          )}
          {doc!.rules.length > 0 && (
            <div className="space-y-6">
              <div className="eyebrow">Rules</div>
              {doc!.rules.map((rule) => (
                <RuleCard
                  key={rule.name}
                  rule={rule}
                  localNames={localNames}
                  tests={testsByRule.get(rule.name) ?? []}
                />
              ))}
            </div>
          )}
          {orphanTests.length > 0 && (
            <OrphanTestsBlock tests={orphanTests} />
          )}
          {doc!.parseErrors.length > 0 && (
            <ParseErrorsBlock errors={doc!.parseErrors} />
          )}
        </>
      ) : (
        // Couldn't parse it as RuleSpec — show the raw YAML so a
        // reviewer can still inspect what's in the repo.
        encoding.rulespec_content && (
          <div>
            <div className="eyebrow mb-3">RuleSpec encoding</div>
            <ExpandableCode
              code={encoding.rulespec_content}
              language="rulespec"
              label={encoding.file_path}
            />
            {doc?.parseErrors.length ? (
              <ParseErrorsBlock errors={doc.parseErrors} />
            ) : null}
          </div>
        )
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function SourceHeader({
  filePath,
  description,
  gitHubUrl,
  isGitHub,
}: {
  filePath: string;
  description: string;
  gitHubUrl: string | null;
  isGitHub: boolean;
}) {
  return (
    <div>
      <div className="eyebrow mb-3">Shown source</div>
      <code className="block font-mono text-xs text-[var(--color-accent)] break-all">
        {filePath}
      </code>
      <p className="mt-2 text-xs text-[var(--color-ink-muted)] leading-relaxed">
        {description}
      </p>
      {gitHubUrl && (
        <a
          href={gitHubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-accent)] no-underline hover:underline focus-visible:underline"
        >
          <GitHubMark />
          {isGitHub ? "View on GitHub" : "View canonical repo file"}
        </a>
      )}
    </div>
  );
}

function ScoresBlock({ scores }: { scores: EncodingRunScores }) {
  return (
    <div>
      <div className="eyebrow mb-3">Scores</div>
      <ul className="space-y-2">
        {(Object.entries(scores) as [string, number][]).map(([key, value]) => (
          <li key={key} className="flex items-center gap-3 text-xs">
            <span className="w-20 shrink-0 font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
              {key}
            </span>
            <span
              role="progressbar"
              aria-label={`${key} score`}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
              className="flex-1 h-1.5 bg-[var(--color-rule-subtle)] rounded overflow-hidden"
            >
              <span
                className="block h-full bg-[var(--color-accent)]"
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
              />
            </span>
            <span className="w-8 text-right font-mono tabular-nums text-[var(--color-ink)]">
              {value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary({ text }: { text: string }) {
  return (
    <section>
      <div className="eyebrow mb-3">Summary</div>
      <p
        className="text-sm leading-relaxed text-[var(--color-ink-secondary)] whitespace-pre-line"
        style={{ fontFamily: "var(--f-serif)" }}
      >
        {text}
      </p>
    </section>
  );
}

function RuleCard({
  rule,
  localNames,
  tests,
}: {
  rule: RuleSpecRule;
  localNames: Set<string>;
  tests: RuleSpecTestCase[];
}) {
  const anchor = `rule-${rule.name}`;
  return (
    <article
      id={anchor}
      className="border border-[var(--color-rule)] rounded-md bg-[var(--color-paper-elevated)] p-4 scroll-mt-8"
    >
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="m-0 font-mono text-sm font-semibold text-[var(--color-ink)] break-all">
          {rule.name}
        </h3>
        {rule.source && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            {rule.source_url ? (
              <a
                href={rule.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] no-underline hover:underline"
              >
                {rule.source}
              </a>
            ) : (
              rule.source
            )}
          </span>
        )}
      </header>
      <BadgeRow rule={rule} />
      {rule.versions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {rule.versions.map((v, i) => (
            <VersionBlock
              key={`${v.effective_from ?? "no-date"}-${i}`}
              version={v}
              localNames={localNames}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-[var(--color-ink-muted)] italic">
          No versions declared.
        </p>
      )}
      {tests.length > 0 && <TestsBlock tests={tests} />}
    </article>
  );
}

function BadgeRow({ rule }: { rule: RuleSpecRule }) {
  const fields: Array<[string, string | null]> = [
    ["kind", rule.kind],
    ["entity", rule.entity],
    ["dtype", rule.dtype],
    ["period", rule.period],
    ["unit", rule.unit],
  ];
  const present = fields.filter(([, v]) => !!v) as [string, string][];
  if (present.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {present.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-[10px]"
        >
          <span className="uppercase tracking-wider text-[var(--color-ink-muted)]">
            {k}
          </span>
          <span className="text-[var(--color-ink)]">{v}</span>
        </span>
      ))}
    </div>
  );
}

function VersionBlock({
  version,
  localNames,
}: {
  version: RuleSpecVersion;
  localNames: Set<string>;
}) {
  return (
    <div className="border-l-2 border-[var(--color-rule)] pl-3">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[var(--color-ink-muted)]">
        <span className="font-mono uppercase tracking-wider">effective</span>
        <span className="font-mono tabular-nums text-[var(--color-ink)]">
          {version.effective_from ?? "—"}
        </span>
        {version.effective_to && (
          <>
            <span aria-hidden="true">→</span>
            <span className="font-mono tabular-nums text-[var(--color-ink)]">
              {version.effective_to}
            </span>
          </>
        )}
      </div>
      {version.formula ? (
        <pre className="m-0 p-3 bg-[var(--color-code-bg)] border border-[var(--color-rule)] rounded text-xs font-mono whitespace-pre-wrap break-words text-[var(--color-code-text)]">
          <FormulaRenderer formula={version.formula} localNames={localNames} />
        </pre>
      ) : (
        <p className="text-xs text-[var(--color-ink-muted)] italic">
          No formula.
        </p>
      )}
    </div>
  );
}

function FormulaRenderer({
  formula,
  localNames,
}: {
  formula: string;
  localNames: Set<string>;
}) {
  const segments = useMemo(() => tokenizeFormula(formula), [formula]);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.isIdentifier && localNames.has(seg.text)) {
          return (
            <a
              key={i}
              href={`#rule-${seg.text}`}
              className="text-[var(--color-accent)] no-underline hover:underline focus-visible:underline"
            >
              {seg.text}
            </a>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}

function TestsBlock({ tests }: { tests: RuleSpecTestCase[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--color-ink-muted)] cursor-pointer bg-transparent p-0 border-0 hover:text-[var(--color-accent)]"
        aria-expanded={open}
      >
        <span aria-hidden="true">{open ? "▼" : "▶"}</span>
        Tests
        <span className="text-[var(--color-ink-muted)] normal-case tracking-normal">
          ({tests.length})
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-3">
          {tests.map((t) => (
            <TestCase key={t.name} test={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TestCase({ test }: { test: RuleSpecTestCase }) {
  return (
    <li className="border border-[var(--color-rule)] rounded p-3 bg-[var(--color-paper)]">
      <div className="font-mono text-xs text-[var(--color-ink)] mb-2">
        {test.name}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <KeyValueTable label="input" data={test.input} />
        <KeyValueTable label="output" data={test.output} />
      </div>
    </li>
  );
}

function KeyValueTable({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div>
        <div className="eyebrow mb-1.5">{label}</div>
        <p className="text-[var(--color-ink-muted)] italic">∅</p>
      </div>
    );
  }
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <dl className="space-y-1 m-0">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 font-mono">
            <dt className="text-[var(--color-ink-muted)]">{k}</dt>
            <dd className="m-0 text-[var(--color-ink)] break-all">
              {formatScalar(v)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OrphanTestsBlock({ tests }: { tests: RuleSpecTestCase[] }) {
  return (
    <section>
      <div className="eyebrow mb-3">
        Tests not bound to a rule ({tests.length})
      </div>
      <ul className="space-y-3">
        {tests.map((t) => (
          <TestCase key={t.name} test={t} />
        ))}
      </ul>
    </section>
  );
}

function ParseErrorsBlock({ errors }: { errors: string[] }) {
  return (
    <section
      role="alert"
      className="border border-[var(--color-rule)] rounded p-3 bg-[var(--color-paper-elevated)]"
    >
      <div className="eyebrow mb-2">Parse warnings</div>
      <ul className="m-0 pl-5 list-disc text-xs text-[var(--color-ink-secondary)] space-y-1">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </section>
  );
}

function GitHubMark() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export function ownerRuleFor(
  test: RuleSpecTestCase,
  localNames: Set<string>
): string | null {
  for (const key of Object.keys(test.output)) {
    if (localNames.has(key)) return key;
  }
  return null;
}

export function groupTestsByRule(
  tests: RuleSpecTestCase[],
  localNames: Set<string>
): Map<string, RuleSpecTestCase[]> {
  const out = new Map<string, RuleSpecTestCase[]>();
  for (const t of tests) {
    const owner = ownerRuleFor(t, localNames);
    if (!owner) continue;
    const list = out.get(owner) ?? [];
    list.push(t);
    out.set(owner, list);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Test fetching
// ----------------------------------------------------------------------------

/**
 * Fetch the sibling ``*.test.yaml`` from the same path in the
 * jurisdiction's ``rules-*`` repo. We only attempt this when the
 * encoding came from GitHub (canonical repo state); for stored
 * Encoder-run encodings the file path may not correspond to anything
 * checked in yet, so we'd be probing for something that isn't there.
 */
function useRuleSpecTests(
  encoding: RuleEncodingData | null,
  jurisdiction: string
): RuleSpecTestCase[] {
  const [tests, setTests] = useState<RuleSpecTestCase[]>([]);

  useEffect(() => {
    setTests([]);
    if (!encoding || !isGitHubEncoding(encoding)) return;
    const repo = getRuleSpecRepoForJurisdiction(jurisdiction);
    if (!repo) return;
    const testPath = encoding.file_path.replace(/\.yaml$/, ".test.yaml");
    if (testPath === encoding.file_path) return;
    const url = `https://raw.githubusercontent.com/TheAxiomFoundation/${repo}/main/${testPath}`;
    let cancelled = false;
    /* v8 ignore start -- network fetch */
    fetch(url)
      .then((res) => (res.ok ? res.text() : null))
      .then((body) => {
        if (cancelled || !body) return;
        setTests(parseRuleSpecTests(body));
      })
      .catch(() => {});
    /* v8 ignore stop */
    return () => {
      cancelled = true;
    };
  }, [encoding, jurisdiction]);

  return tests;
}
