"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CorpusStatusArtifact,
  EncodingOpsStatus,
  EncodingStatusRun,
  LiveEncodingRun,
} from "@/lib/corpus-status";
import {
  corpusLookupPathsForCitation,
  corpusPathForDocumentKey,
  corpusPathsForCitation,
  documentKeyFromCitation,
  parseCitation,
  sectionWithinDocument,
} from "@/lib/axiom/ops-citations";
import {
  EXTRA_JURISDICTION_LABELS,
  JURISDICTIONS_SEED,
} from "@/lib/axiom/jurisdictions-seed";
import type { EncodingQueueSummary } from "@/lib/axiom/encoding-queues";
import type { RecentCorpusScope } from "@/lib/corpus-status";
import {
  composeGraphViewerUrl,
  graphFocusForCitationPath,
} from "@/lib/axiom/runtime/graph-links";

const POLL_INTERVAL_MS = 30_000;
const CLOCK_TICK_MS = 15_000;
/** A running row whose heartbeat is older than this means the encoder died. */
const STALE_HEARTBEAT_MS = 2 * 60 * 1000;
/** Finished runs stay on the docket this long. */
const FINISHED_WINDOW_MS = 60 * 60 * 1000;
const LEDGER_DOCUMENT_LIMIT = 10;

interface OpsDashboardProps {
  initialStatus: EncodingOpsStatus | null;
  encodingError: string | null;
  queues: EncodingQueueSummary[];
  recentScopes: RecentCorpusScope[];
}

type LiveRunState = "running" | "stale" | "finished" | "expired";

export function classifyLiveRun(
  run: LiveEncodingRun,
  referenceMs: number
): LiveRunState {
  const heartbeatMs = Date.parse(run.last_heartbeat_at);
  if (run.status === "running") {
    return referenceMs - heartbeatMs > STALE_HEARTBEAT_MS ? "stale" : "running";
  }
  const finishedMs = run.finished_at ? Date.parse(run.finished_at) : heartbeatMs;
  return referenceMs - finishedMs <= FINISHED_WINDOW_MS ? "finished" : "expired";
}

export type LedgerRun = EncodingStatusRun & {
  /** True for rows sourced from the ephemeral live board rather than the
   *  permanent encoding_runs history. */
  live?: boolean;
  selfReported?: boolean;
};

export interface DocumentGroup {
  key: string;
  runs: LedgerRun[];
  lastAt: string;
  sectionCount: number;
  /** Sections whose most recent attempt failed. The fleet retries until a
   *  section passes, so these are in progress, not terminal. A section that
   *  eventually passed doesn't count, whatever came before. */
  inProgressSectionCount: number;
  /** Total attempts so far on the in-progress sections. */
  inProgressAttemptCount: number;
  /** Recorded runs whose encoder flagged issues for review. */
  flaggedCount: number;
  liveCount: number;
}

/**
 * The ledger shows the permanent history plus anything the live board has
 * seen finish — otherwise every run goes invisible an hour after it finishes
 * and stays invisible until the trusted environment reconciles manifests.
 * Live rows are deduped against history by the manifest run id, so the same
 * run never appears twice once a sync lands it.
 */
export function mergeLiveRunsIntoHistory(
  history: EncodingStatusRun[],
  liveRuns: LiveEncodingRun[]
): LedgerRun[] {
  const seen = new Set(history.map((run) => run.id));
  const merged: LedgerRun[] = [...history];
  for (const run of liveRuns) {
    if (run.status === "running") continue;
    if (run.run_id && seen.has(run.run_id)) continue;
    if (seen.has(run.id)) continue;
    const timestamp = run.finished_at ?? run.last_heartbeat_at;
    const durationMs = Date.parse(timestamp) - Date.parse(run.started_at);
    merged.push({
      id: run.id,
      timestamp,
      citation: run.citation,
      total_duration_ms:
        Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null,
      agent_type: run.backend,
      agent_model: run.model,
      data_source: "live_board",
      has_issues: run.status === "failed",
      session_id: null,
      encoder_version: run.encoder_version,
      live: true,
      selfReported: run.runner?.reported_via === "public_ingest",
    });
  }
  return merged;
}

// Both plural (corpus paths) and singular (live-run citations) forms occur.

export function groupRunsByDocument(runs: LedgerRun[]): DocumentGroup[] {
  const groups = new Map<string, DocumentGroup & { sections: Set<string> }>();
  for (const run of runs) {
    if (!run.citation) continue;
    const key = documentKeyFromCitation(run.citation);
    const group = groups.get(key) ?? {
      key,
      runs: [],
      lastAt: run.timestamp,
      sectionCount: 0,
      inProgressSectionCount: 0,
      inProgressAttemptCount: 0,
      flaggedCount: 0,
      liveCount: 0,
      sections: new Set<string>(),
    };
    group.runs.push(run);
    if (run.timestamp > group.lastAt) group.lastAt = run.timestamp;
    group.sections.add(run.citation);
    if (run.has_issues && !run.live) group.flaggedCount += 1;
    if (run.live) group.liveCount += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ sections, ...group }) => {
      const runs = group.runs.sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp)
      );
      // A section is in progress while its most recent attempt failed —
      // the fleet retries until it passes, so old failures under a newer
      // success are history, not status.
      const latestBySection = new Map<string, LedgerRun>();
      const attemptsBySection = new Map<string, number>();
      for (const run of runs) {
        const section = run.citation as string;
        if (!latestBySection.has(section)) latestBySection.set(section, run);
        attemptsBySection.set(
          section,
          (attemptsBySection.get(section) ?? 0) + 1
        );
      }
      let inProgressSectionCount = 0;
      let inProgressAttemptCount = 0;
      for (const [section, latest] of latestBySection) {
        if (latest.live && latest.has_issues) {
          inProgressSectionCount += 1;
          inProgressAttemptCount += attemptsBySection.get(section) ?? 0;
        }
      }
      return {
        ...group,
        runs,
        sectionCount: sections.size,
        inProgressSectionCount,
        inProgressAttemptCount,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export function OpsDashboard({
  initialStatus,
  encodingError,
  queues,
  recentScopes,
}: OpsDashboardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const clock = setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
    const poll = setInterval(async () => {
      try {
        const response = await fetch("/api/ops/encoding");
        if (!response.ok) return;
        const artifact =
          (await response.json()) as CorpusStatusArtifact<EncodingOpsStatus>;
        if (artifact?.value) setStatus(artifact.value);
      } catch {
        // Keep showing the last good payload; the next poll retries.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, []);

  // Before the first client tick, measure "ago" against the payload's own
  // refresh stamp so server and client render identical text.
  const referenceMs =
    nowMs ?? (status ? Date.parse(status.refreshed_at) : 0);

  const documents = useMemo(
    () =>
      groupRunsByDocument(
        mergeLiveRunsIntoHistory(
          status?.latest_runs ?? [],
          status?.live_runs ?? []
        )
      ),
    [status]
  );
  const labels = status?.citation_labels ?? {};

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-[960px] mx-auto px-6 md:px-8">
        <header>
          <h1 className="heading-section text-[var(--color-ink)]">
            Encoding operations
          </h1>
          <p className="mt-3 max-w-[640px] text-sm md:text-base text-[var(--color-ink-secondary)]">
            What Axiom is encoding right now, the newest encodings by
            document, and how far the corpus has come.
          </p>
        </header>

        <DocketBand
          status={status}
          error={encodingError}
          referenceMs={referenceMs}
          labels={labels}
        />

        <LatestEncodings
          documents={documents}
          referenceMs={referenceMs}
          labels={labels}
        />

        <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10">
          <RecentlyIngested scopes={recentScopes} referenceMs={referenceMs} />
          <QueuedWork queues={queues} />
        </div>
      </div>
    </div>
  );
}

/* ── Recently ingested: what just entered the corpus ── */

function RecentlyIngested({
  scopes,
  referenceMs,
}: {
  scopes: RecentCorpusScope[];
  referenceMs: number;
}) {
  if (scopes.length === 0) return null;
  return (
    <section aria-label="Recently ingested">
      <div className="border-b border-[var(--color-rule)] pb-3">
        <h2 className="heading-sub text-[var(--color-ink)]">
          Recently ingested
        </h2>
      </div>
      <ul className="mt-1 divide-y divide-[var(--color-rule-subtle)]">
        {scopes.map((scope) => (
          <li
            key={`${scope.jurisdiction}/${scope.document_class}/${scope.version}`}
            className="py-2.5 flex items-baseline justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-ink)]">
                <span className="font-medium">
                  {JURISDICTION_NAMES[scope.jurisdiction] ?? scope.jurisdiction}
                </span>{" "}
                <span className="text-[var(--color-ink-secondary)]">
                  {pluralizeDocumentClass(scope.document_class)}
                </span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--color-ink-muted)] truncate">
                {scope.version}
              </p>
            </div>
            <p className="shrink-0 font-mono text-xs text-[var(--color-ink-muted)]">
              {scope.synced_at
                ? relativeTime(scope.synced_at, referenceMs)
                : "—"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function pluralizeDocumentClass(documentClass: string): string {
  if (documentClass === "guidance" || documentClass === "rulemaking") {
    return documentClass;
  }
  if (documentClass.endsWith("y")) return `${documentClass.slice(0, -1)}ies`;
  return `${documentClass}s`;
}

/* ── Queued work: what the fleet will encode next ── */

function QueuedWork({ queues }: { queues: EncodingQueueSummary[] }) {
  if (queues.length === 0) return null;
  return (
    <section aria-label="Queued work">
      <div className="border-b border-[var(--color-rule)] pb-3">
        <h2 className="heading-sub text-[var(--color-ink)]">Queued work</h2>
      </div>
      <div className="mt-6 space-y-8">
        {queues.map((queue) => (
          <QueueRow key={queue.queueId} queue={queue} />
        ))}
      </div>
    </section>
  );
}

function QueueRow({ queue }: { queue: EncodingQueueSummary }) {
  const dispositioned = queue.total - queue.pending;
  const fraction = queue.total > 0 ? dispositioned / queue.total : 0;
  const dispositionLine = Object.entries(queue.dispositionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `${count.toLocaleString("en-US")} ${status}`)
    .join(" · ");

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="font-mono text-sm text-[var(--color-ink)]">
          {queue.queueId}
        </h3>
        <p className="font-mono text-xs tabular-nums text-[var(--color-ink-secondary)]">
          {dispositioned.toLocaleString("en-US")} of{" "}
          {queue.total.toLocaleString("en-US")} dispositioned
          {queue.jurisdictionCount > 1 &&
            ` · ${queue.jurisdictionCount} jurisdictions`}
        </p>
      </div>
      {queue.description && (
        <p className="mt-1 font-serif italic text-xs text-[var(--color-ink-secondary)] max-w-[72ch]">
          {queue.description}
        </p>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={queue.total}
        aria-valuenow={dispositioned}
        aria-label={`${queue.queueId}: ${dispositioned} of ${queue.total} items dispositioned`}
        className="mt-2.5 h-1.5 rounded-full bg-[var(--color-rule)]"
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)]"
          style={{ width: `${Math.max(fraction > 0 ? 1 : 0, Math.round(fraction * 100))}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-xs text-[var(--color-ink-muted)]">
        {dispositionLine || `${queue.pending.toLocaleString("en-US")} pending`}
        {queue.pauseReason && (
          <span className="text-[var(--color-warning)]">
            {" "}
            · paused — {queue.pauseReason.replace(/\.$/, "")}
          </span>
        )}
      </p>
    </div>
  );
}

/* ── The docket: what's encoding right now ── */

function DocketBand({
  status,
  error,
  referenceMs,
  labels,
}: {
  status: EncodingOpsStatus | null;
  error: string | null;
  referenceMs: number;
  labels: Record<string, string>;
}) {
  const liveRuns = status?.live_runs ?? [];
  const running = liveRuns.filter(
    (run) => classifyLiveRun(run, referenceMs) === "running"
  );
  const stale = liveRuns.filter(
    (run) => classifyLiveRun(run, referenceMs) === "stale"
  );
  const finished = liveRuns
    .filter((run) => classifyLiveRun(run, referenceMs) === "finished")
    .sort((a, b) =>
      (b.finished_at ?? b.last_heartbeat_at).localeCompare(
        a.finished_at ?? a.last_heartbeat_at
      )
    );
  const lastRun = status?.latest_runs[0] ?? null;
  // The newest closed live-board row can be fresher than recorded history
  // (history lags until the trusted environment reconciles manifests).
  const newestLive =
    liveRuns
      .filter((run) => run.status !== "running")
      .sort((a, b) =>
        (b.finished_at ?? b.last_heartbeat_at).localeCompare(
          a.finished_at ?? a.last_heartbeat_at
        )
      )[0] ?? null;
  const newestLiveAt = newestLive
    ? (newestLive.finished_at ?? newestLive.last_heartbeat_at)
    : null;
  const idleShowsLive =
    newestLive != null &&
    (lastRun?.timestamp == null || (newestLiveAt as string) > lastRun.timestamp);

  return (
    <section
      aria-label="Live encoding activity"
      className="mt-8 rounded-lg bg-[var(--color-code-bg)] text-[var(--color-code-text)] p-6 md:p-8 overflow-x-auto"
    >
      {status == null ? (
        <p className="font-mono text-sm text-[var(--color-code-comment)]">
          Encoding telemetry is unavailable{error ? ` — ${error}` : ""}. The
          board recovers on the next refresh.
        </p>
      ) : running.length > 0 ? (
        <>
          <DocketHeader
            dotClass="bg-[var(--color-code-function)] animate-pulse motion-reduce:animate-none"
            label={`Encoding now — ${machineCount(running)}`}
          />
          <ul className="mt-5 space-y-5">
            {running.map((run) => (
              <LiveRunEntry
                key={run.id}
                run={run}
                referenceMs={referenceMs}
                labels={labels}
              />
            ))}
          </ul>
        </>
      ) : finished.length > 0 ? (
        <>
          <DocketHeader
            dotClass="bg-[var(--color-code-keyword)]"
            label={`Recently active — ${finished.length} run${
              finished.length === 1 ? "" : "s"
            } finished in the last hour`}
          />
          <ul className="mt-5 space-y-5">
            {finished.slice(0, 3).map((run) => (
              <FinishedRunEntry
                key={run.id}
                run={run}
                referenceMs={referenceMs}
                labels={labels}
              />
            ))}
          </ul>
          {finished.length > 3 && (
            <p className="mt-4 font-mono text-xs text-[var(--color-code-comment)]">
              and {finished.length - 3} more in the last hour
            </p>
          )}
        </>
      ) : (
        <>
          <DocketHeader
            dotClass="border border-[var(--color-code-comment)]"
            label="Idle — no machines encoding"
          />
          {idleShowsLive && newestLive ? (
            <div className="mt-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-code-comment)]">
                Last encode ·{" "}
                {relativeTime(newestLiveAt as string, referenceMs)}
              </p>
              <p className="mt-2 font-mono text-base md:text-xl leading-snug">
                <Citation citation={newestLive.citation} surface="dark" />
              </p>
              <CitationLabelLine
                citation={newestLive.citation}
                labels={labels}
                surface="dark"
              />
              <p className="mt-2 font-mono text-xs text-[var(--color-code-comment)]">
                {newestLive.status === "failed" ? "in progress" : "completed"}
              </p>
            </div>
          ) : lastRun?.citation ? (
            <div className="mt-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-code-comment)]">
                Last encode · {relativeTime(lastRun.timestamp, referenceMs)}
              </p>
              <p className="mt-2 font-mono text-base md:text-xl leading-snug">
                <Citation citation={lastRun.citation} surface="dark" />
              </p>
              <CitationLabelLine
                citation={lastRun.citation}
                labels={labels}
                surface="dark"
              />
              <p className="mt-2 font-mono text-xs text-[var(--color-code-comment)]">
                {lastRun.has_issues ? "completed · flagged" : "completed"}
              </p>
            </div>
          ) : (
            <p className="mt-5 font-mono text-sm text-[var(--color-code-comment)]">
              No runs recorded yet.
            </p>
          )}
        </>
      )}

      {stale.length > 0 && (
        <ul className="mt-6 space-y-4 border-t border-[rgba(231,229,228,0.12)] pt-5">
          {stale.map((run) => (
            <LiveRunEntry
              key={run.id}
              run={run}
              referenceMs={referenceMs}
              stale
            />
          ))}
        </ul>
      )}

      {running.length > 0 && finished.length > 0 && (
        <p className="mt-6 border-t border-[rgba(231,229,228,0.12)] pt-4 font-mono text-xs text-[var(--color-code-comment)]">
          {finished.length} run{finished.length === 1 ? "" : "s"} finished in
          the last hour
        </p>
      )}

    </section>
  );
}

function DocketHeader({
  dotClass,
  label,
}: {
  dotClass: string;
  label: string;
}) {
  return (
    <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-wider">
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
      />
      {label}
    </p>
  );
}

function LiveRunEntry({
  run,
  referenceMs,
  labels = {},
  stale = false,
}: {
  run: LiveEncodingRun;
  referenceMs: number;
  labels?: Record<string, string>;
  stale?: boolean;
}) {
  return (
    <li>
      <p className="font-mono text-base md:text-xl leading-snug">
        <Citation citation={run.citation} surface="dark" />
      </p>
      <CitationLabelLine
        citation={run.citation}
        labels={labels}
        surface="dark"
      />
      <p
        className={`mt-1.5 font-mono text-xs ${
          stale ? "text-[#fda4af]" : "text-[var(--color-code-comment)]"
        }`}
      >
        {stale
          ? `stalled · last heartbeat ${relativeTime(run.last_heartbeat_at, referenceMs)}`
          : `in progress · started ${relativeTime(run.started_at, referenceMs)}`}
      </p>
    </li>
  );
}

function FinishedRunEntry({
  run,
  referenceMs,
  labels,
}: {
  run: LiveEncodingRun;
  referenceMs: number;
  labels: Record<string, string>;
}) {
  const failed = run.status === "failed";

  return (
    <li>
      <p className="font-mono text-base md:text-xl leading-snug">
        <Citation citation={run.citation} surface="dark" />
      </p>
      <CitationLabelLine
        citation={run.citation}
        labels={labels}
        surface="dark"
      />
      <p
        className={`mt-1.5 font-mono text-xs ${
          failed
            ? "text-[var(--color-code-keyword)]"
            : "text-[var(--color-code-comment)]"
        }`}
      >
        {failed ? "in progress · last attempt" : "completed"}{" "}
        {relativeTime(run.finished_at ?? run.last_heartbeat_at, referenceMs)}
      </p>
    </li>
  );
}

const JURISDICTION_NAMES: Record<string, string> = {
  ...Object.fromEntries(
    JURISDICTIONS_SEED.map((jurisdiction) => [
      jurisdiction.slug,
      jurisdiction.label,
    ])
  ),
  ...EXTRA_JURISDICTION_LABELS,
  // Jurisdictions the encoders report on that the corpus seed doesn't
  // carry yet.
  dk: "Denmark",
};

function normalizedForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * The label at one lookup path, unless it merely echoes the path's own
 * designator ("105-153.7" labeled "105-153.7") — those add nothing, so the
 * caller keeps walking toward an ancestor with a real name.
 */
function meaningfulLabelAt(
  paths: string[],
  index: number,
  labels: Record<string, string>
): string | null {
  const label = labels[paths[index]];
  if (!label) return null;
  const segment = paths[index].split("/").pop() ?? "";
  return normalizedForComparison(label) === normalizedForComparison(segment)
    ? null
    : label;
}

/** Deepest meaningfully-named node, the document itself included. */
function deepestLabelForCitation(
  citation: string | null,
  labels: Record<string, string>
): string | null {
  if (!citation) return null;
  const paths = corpusLookupPathsForCitation(citation);
  for (let i = paths.length - 1; i >= 0; i--) {
    const label = meaningfulLabelAt(paths, i, labels);
    if (label) return label;
  }
  return null;
}

/** Deepest meaningfully-named node below the document itself. */
function sectionLabelForCitation(
  citation: string | null,
  labels: Record<string, string>
): string | null {
  if (!citation) return null;
  const paths = corpusLookupPathsForCitation(citation);
  for (let i = paths.length - 1; i >= 1; i--) {
    const label = meaningfulLabelAt(paths, i, labels);
    if (label) return label;
  }
  return null;
}

function jurisdictionName(citation: string | null): string | null {
  if (!citation) return null;
  const { scope } = parseCitation(citation);
  return JURISDICTION_NAMES[scope] ?? null;
}

/**
 * The full name line for a docket citation: jurisdiction, the document's
 * name, and the section's name when it adds something — "Denmark —
 * Bekendtgørelse af lov om en børne- og ungeydelse — § 1."
 */
function CitationLabelLine({
  citation,
  labels,
  surface,
}: {
  citation: string | null;
  labels: Record<string, string>;
  surface: "dark" | "paper";
}) {
  const parts: string[] = [];
  const jurisdiction = jurisdictionName(citation);
  if (jurisdiction) parts.push(jurisdiction);
  if (citation) {
    const paths = corpusLookupPathsForCitation(citation);
    for (let i = 0; i < paths.length; i++) {
      const label = meaningfulLabelAt(paths, i, labels);
      if (label && !parts.includes(label)) parts.push(label);
    }
  }
  if (parts.length === 0) return null;
  return (
    <p
      className={`mt-1 font-serif italic text-sm leading-snug ${
        surface === "dark"
          ? "text-[var(--color-code-comment)]"
          : "text-[var(--color-ink-secondary)]"
      }`}
    >
      {parts.join(" — ")}
    </p>
  );
}

function machineCount(runs: LiveEncodingRun[]): string {
  const machines = new Set(
    runs.map((run) => run.runner?.hostname ?? run.id)
  ).size;
  return machines === 1 ? "1 machine" : `${machines} machines`;
}

/* ── Latest encodings, grouped by document ── */

interface SectionRow {
  citation: string;
  designator: string;
  label: string | null;
  attempts: number;
  lastAt: string;
  status: "completed" | "in progress" | "flagged";
  /** Rule-graph deep link — set only when the encoding is verifiably in the
   *  mirror (recorded history), so the link always renders a graph. */
  graphUrl: string | null;
}

/**
 * Graph link for a section whose encoding has landed. Live-board
 * completions stay unlinked — the applied RuleSpec may still be in an
 * unmerged PR, so composing its graph could come up empty; once a manifest
 * sync records the run, the row upgrades to linked automatically.
 */
export function graphUrlForSection(
  citation: string,
  latest: LedgerRun
): string | null {
  if (latest.live || latest.has_issues) return null;
  const { section, document } = corpusPathsForCitation(citation);
  const path = section ?? document;
  if (!path) return null;
  const focus = graphFocusForCitationPath(path);
  return focus ? composeGraphViewerUrl(focus) : null;
}

/**
 * One table row per section: latest attempt decides the status (the fleet
 * retries failures, so a section whose newest run failed is in progress),
 * attempts count every recorded try.
 */
export function sectionRowsForGroup(
  group: DocumentGroup,
  labels: Record<string, string>
): SectionRow[] {
  const bySection = new Map<string, LedgerRun[]>();
  for (const run of group.runs) {
    // group.runs is newest-first, so the first run seen per section is
    // its latest attempt.
    const citation = run.citation as string;
    const runs = bySection.get(citation) ?? [];
    runs.push(run);
    bySection.set(citation, runs);
  }
  return [...bySection.entries()]
    .map(([citation, runs]) => {
      const latest = runs[0];
      const section = sectionWithinDocument(citation, group.key);
      const isDocumentLevel = section === "(document)";
      return {
        citation,
        designator: isDocumentLevel
          ? (group.key.split("/").pop() ?? group.key)
          : section,
        label: isDocumentLevel
          ? deepestLabelForCitation(citation, labels)
          : sectionLabelForCitation(citation, labels),
        attempts: runs.length,
        lastAt: latest.timestamp,
        status: latest.has_issues
          ? latest.live
            ? ("in progress" as const)
            : ("flagged" as const)
          : ("completed" as const),
        graphUrl: graphUrlForSection(citation, latest),
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/**
 * Chip text for a completed section: the designator with generic trailing
 * segments (block-1, document-1) stripped — `704/230/block-1` reads as
 * `704/230`.
 */
export function chipDesignator(designator: string): string {
  const segments = designator.split("/");
  while (
    segments.length > 1 &&
    /^(block|document|page)-\d+$/.test(segments[segments.length - 1])
  ) {
    segments.pop();
  }
  return segments.join("/");
}

function LatestEncodings({
  documents,
  referenceMs,
  labels,
}: {
  documents: DocumentGroup[];
  referenceMs: number;
  labels: Record<string, string>;
}) {
  return (
    <section aria-label="Latest encodings" className="mt-12">
      <div className="border-b border-[var(--color-rule)] pb-3">
        <h2 className="heading-sub text-[var(--color-ink)]">
          Latest encodings
        </h2>
      </div>
      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-ink-secondary)]">
          No encodings recorded yet. Runs appear here the moment an encoder
          reports one.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 items-start">
          {documents.slice(0, LEDGER_DOCUMENT_LIMIT).map((group) => (
            <DocumentCard
              key={group.key}
              group={group}
              referenceMs={referenceMs}
              labels={labels}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * One law, one card: the document's human name leads, active work reads as
 * sentences, and completed sections compress into a row of linked chips —
 * each one a runnable node in the graph.
 */
function DocumentCard({
  group,
  referenceMs,
  labels,
}: {
  group: DocumentGroup;
  referenceMs: number;
  labels: Record<string, string>;
}) {
  const rows = sectionRowsForGroup(group, labels);
  const active = rows.filter((row) => row.status !== "completed");
  const done = rows
    .filter((row) => row.status === "completed")
    .sort((a, b) =>
      a.designator.localeCompare(b.designator, undefined, { numeric: true })
    );
  const documentLabel = documentGroupLabel(group, labels);
  const colon = group.key.indexOf(":");
  const scope = colon > 0 ? group.key.slice(0, colon) : "";
  const rest = colon > 0 ? group.key.slice(colon + 1) : group.key;
  const docClass = rest.split("/")[0];

  return (
    <article className="rounded-sm border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-5 flex flex-col gap-4">
      <header>
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            {JURISDICTION_NAMES[scope] ?? scope ?? "unknown"}
            {docClass && ` · ${docClass}`}
          </p>
          <p className="shrink-0 font-mono text-[10px] text-[var(--color-ink-muted)]">
            {relativeTime(group.lastAt, referenceMs)}
          </p>
        </div>
        {documentLabel ? (
          <>
            <h3 className="mt-1.5 font-serif text-lg leading-snug text-[var(--color-ink)]">
              {documentLabel}
            </h3>
            <p className="mt-1 font-mono text-[11px] text-[var(--color-ink-muted)] break-all">
              {rest}
            </p>
          </>
        ) : (
          <h3 className="mt-1.5 font-mono text-base leading-snug text-[var(--color-ink)] break-all">
            {rest}
          </h3>
        )}
      </header>

      {active.length > 0 && (
        <ul className="space-y-2">
          {active.map((row) => (
            <li
              key={row.citation}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <p className="min-w-0 text-xs break-words">
                <span className="font-mono text-[var(--color-ink)]">
                  {row.designator}
                </span>
                {row.label && row.label !== documentLabel && (
                  <span className="font-serif italic text-[var(--color-ink-secondary)]">
                    {" "}
                    — {row.label}
                  </span>
                )}
              </p>
              <p
                className={`shrink-0 font-mono text-[11px] ${
                  row.status === "flagged"
                    ? "text-[var(--color-warning)]"
                    : "text-[var(--color-accent)]"
                }`}
              >
                {row.status === "flagged"
                  ? "flagged for review"
                  : `in progress · ${row.attempts} attempt${
                      row.attempts === 1 ? "" : "s"
                    }`}
              </p>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-success)]">
            {done.length} encoded
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {done.map((row) => {
              const chip = chipDesignator(row.designator);
              const title = row.label
                ? `${row.designator} — ${row.label}`
                : row.designator;
              return (
                <li key={row.citation}>
                  {row.graphUrl ? (
                    <a
                      href={row.graphUrl}
                      title={`${title} — view the rule graph`}
                      className="inline-block rounded-sm bg-[var(--color-accent-light)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-accent)] no-underline hover:underline"
                    >
                      {chip}
                    </a>
                  ) : (
                    <span
                      title={title}
                      className="inline-block rounded-sm border border-[var(--color-rule)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink-secondary)]"
                    >
                      {chip}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}

/**
 * Label for a whole document group. When the document node itself has no
 * label but every run in the group sits under the same next segment (e.g. all
 * of `106-cmr`'s runs are in chapter `704`), that shared child's label still
 * identifies the group accurately.
 */
function documentGroupLabel(
  group: DocumentGroup,
  labels: Record<string, string>
): string | null {
  const documentPath = corpusPathForDocumentKey(group.key);
  if (documentPath) {
    const label = meaningfulLabelAt([documentPath], 0, labels);
    if (label) return label;
  }

  const childPaths = new Set<string>();
  for (const run of group.runs) {
    if (!run.citation) return null;
    const { scope, segments, documentDepth } = parseCitation(run.citation);
    if (!scope || segments.length <= documentDepth) return null;
    childPaths.add(
      [scope, ...segments.slice(0, documentDepth + 1)].join("/")
    );
  }
  if (childPaths.size !== 1) return null;
  const [childPath] = childPaths;
  return meaningfulLabelAt([childPath], 0, labels);
}

/* ── Citation rendering — law as code ── */

/**
 * Renders a citation path with its structure made visible: jurisdiction and
 * document class recede, the document name carries the accent, the section
 * tail reads as body. Mirrors the site's code-surface palette on dark.
 */
function Citation({
  citation,
  surface,
}: {
  citation: string;
  surface: "dark" | "paper";
}) {
  const { scope, segments, documentDepth } = parseCitation(citation);
  const tones =
    surface === "dark"
      ? {
          head: "text-[var(--color-code-comment)]",
          doc: "text-[var(--color-code-keyword)]",
          tail: "text-[var(--color-code-text)]",
        }
      : {
          head: "text-[var(--color-ink-muted)]",
          doc: "font-semibold text-[var(--color-ink)]",
          tail: "text-[var(--color-ink-secondary)]",
        };

  // Not a citation path (e.g. a human-readable "26 USC 1(j)(2)") — render
  // it whole in the document tone; it is the headline.
  if (!scope && segments.length <= 1) {
    return <span className={tones.doc}>{citation}</span>;
  }

  return (
    <>
      {scope && <span className={tones.head}>{scope}:</span>}
      {segments.map((part, index) => {
        // Segment 0 is the document class; segments up to documentDepth name
        // the document; the rest locate the section within it.
        const tone =
          index === 0
            ? tones.head
            : index < documentDepth
              ? tones.doc
              : tones.tail;
        return (
          <span key={index}>
            {index > 0 && <span className={tones.head}>/</span>}
            <span className={tone}>{part}</span>
          </span>
        );
      })}
    </>
  );
}

/* ── Formatting ── */

export function relativeTime(value: string, referenceMs: number): string {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "unknown";
  const delta = Math.max(0, referenceMs - ms);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return formatUtcDate(value);
}

function formatUtcDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


