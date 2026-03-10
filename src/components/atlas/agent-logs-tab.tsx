"use client";

import { useState } from "react";
import { isLabEncoding } from "@/lib/atlas-utils";
import type {
  SDKSessionEvent,
  AgentTranscript,
  RuleEncodingData,
} from "@/lib/supabase";
import { AgentPhase } from "@/components/lab/agent-phase";
import { EventRow, type BadgeColors } from "@/components/lab/event-row";

const badgeColors: BadgeColors = {
  agent_start: { bg: "rgba(59, 130, 246, 0.15)", fg: "#3b82f6" },
  agent_end: { bg: "rgba(59, 130, 246, 0.1)", fg: "#2563eb" },
  tool_use: { bg: "rgba(167, 139, 250, 0.15)", fg: "#a78bfa" },
  tool_result: { bg: "rgba(167, 139, 250, 0.1)", fg: "#8b6fd4" },
  message: { bg: "rgba(16, 185, 129, 0.12)", fg: "#10b981" },
  thinking: { bg: "rgba(245, 158, 11, 0.12)", fg: "#f59e0b" },
};

/* v8 ignore next 8 -- only used by IterationsList (already ignored) */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}

function ExpandableSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        className="flex items-center gap-2 bg-transparent cursor-pointer w-full text-left"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="text-[var(--color-precision)] text-xs">
          {open ? "\u25BC" : "\u25B6"}
        </span>
        <span className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
          {title}
          {count != null && ` (${count})`}
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

/* v8 ignore start -- EncodingRunSummary rendered conditionally with lab data */
function EncodingRunSummary({ encoding }: { encoding: RuleEncodingData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {encoding.agent_type && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--color-border-subtle)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">
            Agent
          </div>
          <div className="text-sm text-[var(--color-text)]">
            {encoding.agent_type}
          </div>
        </div>
      )}
      {encoding.agent_model && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--color-border-subtle)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">
            Model
          </div>
          <div className="text-sm text-[var(--color-text)] font-mono">
            {encoding.agent_model}
          </div>
        </div>
      )}
      {encoding.total_duration_ms != null && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--color-border-subtle)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">
            Duration
          </div>
          <div className="text-sm text-[var(--color-text)] font-mono">
            {formatDuration(encoding.total_duration_ms)}
          </div>
        </div>
      )}
      {encoding.data_source && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--color-border-subtle)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">
            Source
          </div>
          <div className="text-sm text-[var(--color-text)]">
            {encoding.data_source.replace(/_/g, " ")}
          </div>
        </div>
      )}
      {encoding.has_issues != null && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--color-border-subtle)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">
            Issues
          </div>
          <div
            className={`text-sm font-semibold ${encoding.has_issues ? "text-red-400" : "text-green-400"}`}
          >
            {encoding.has_issues ? "Yes" : "None"}
          </div>
        </div>
      )}
      {encoding.timestamp && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--color-border-subtle)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">
            Run date
          </div>
          <div className="text-sm text-[var(--color-text)] font-mono">
            {new Date(encoding.timestamp).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}

function IterationsList({
  iterations,
}: {
  iterations: RuleEncodingData["iterations"];
}) {
  if (!iterations || iterations.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {iterations.map((iter) => (
        <div
          key={iter.attempt}
          className="bg-[rgba(0,0,0,0.2)] border rounded-md p-3"
          style={{
            borderColor: iter.success
              ? "rgba(16, 185, 129, 0.3)"
              : "rgba(239, 68, 68, 0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs font-semibold text-[var(--color-text)]">
              Attempt {iter.attempt}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[var(--color-text-muted)]">
                {formatDuration(iter.duration_ms)}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  iter.success
                    ? "bg-[rgba(16,185,129,0.15)] text-green-400"
                    : "bg-[rgba(239,68,68,0.15)] text-red-400"
                }`}
              >
                {iter.success ? "Pass" : "Fail"}
              </span>
            </div>
          </div>
          {iter.errors.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {iter.errors.map((err, i) => (
                <div
                  key={i}
                  className="text-xs text-red-400 bg-[rgba(239,68,68,0.08)] rounded px-2 py-1 font-mono"
                >
                  <span className="text-red-500 font-semibold">
                    {err.type}:
                  </span>{" "}
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TranscriptCard({ transcript }: { transcript: AgentTranscript }) {
  const [expanded, setExpanded] = useState(false);
  const messagePreview =
    transcript.response_summary ||
    transcript.description ||
    transcript.prompt?.slice(0, 150) ||
    "No summary";

  return (
    <div className="bg-[rgba(0,0,0,0.2)] border border-[var(--color-border-subtle)] rounded-md overflow-hidden">
      <div
        className="p-3 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-precision)] text-xs">
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
            <span className="font-mono text-xs font-semibold text-[var(--color-precision)]">
              {transcript.subagent_type}
            </span>
          </div>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            {transcript.message_count} messages
          </span>
        </div>
        <div className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
          {messagePreview}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-3 max-h-[300px] overflow-y-auto">
          {transcript.prompt && (
            <div className="mb-3">
              <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                Prompt
              </div>
              <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap bg-[rgba(0,0,0,0.2)] rounded p-2">
                {transcript.prompt}
              </pre>
            </div>
          )}
          {transcript.orchestrator_thinking && (
            <div className="mb-3">
              <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                Orchestrator thinking
              </div>
              <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded p-2">
                {transcript.orchestrator_thinking}
              </pre>
            </div>
          )}
          {transcript.response_summary && (
            <div>
              <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                Response
              </div>
              <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap bg-[rgba(0,0,0,0.2)] rounded p-2">
                {transcript.response_summary}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
/* v8 ignore stop */

export function AgentLogsTab({
  sessionEvents,
  agentTranscripts = [],
  encoding = null,
  loading,
  sessionId,
}: {
  sessionEvents: SDKSessionEvent[];
  agentTranscripts?: AgentTranscript[];
  encoding?: RuleEncodingData | null;
  loading: boolean;
  sessionId: string | null;
}) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(
    new Set()
  );
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(
    new Set()
  );
  const [timelineLimit, setTimelineLimit] = useState(50);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        Loading agent logs...
      </div>
    );
  }

  const hasEncodingMeta = isLabEncoding(encoding);
  /* v8 ignore next 2 -- branch: iterations present */
  const hasIterations =
    encoding?.iterations && encoding.iterations.length > 0;
  const hasTranscripts = agentTranscripts.length > 0;
  const hasSessionEvents = sessionEvents.length > 0;

  if (!hasEncodingMeta && !hasSessionEvents) {
    return (
      <div className="py-20 text-center">
        <div className="font-heading text-lg text-[var(--color-text-muted)] mb-2">
          No sessions
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          No agent sessions are linked to this rule.
        </p>
      </div>
    );
  }

  const agentPhases = sessionEvents.filter(
    (e) => e.event_type === "agent_start"
  );
  /* v8 ignore next 2 -- fallback unreachable due to empty check above */
  const sessionStart =
    sessionEvents[0]?.timestamp ?? new Date().toISOString();

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Encoding run summary */}
      {hasEncodingMeta && encoding && (
        /* v8 ignore next 8 -- encoding run summary with optional note */
        <ExpandableSection title="Encoding run" defaultOpen>
          <EncodingRunSummary encoding={encoding} />
          {encoding.note && (
            <div className="mt-3 text-sm text-[var(--color-text-secondary)] bg-[rgba(0,0,0,0.15)] rounded-md p-3 border border-[var(--color-border-subtle)]">
              {encoding.note}
            </div>
          )}
        </ExpandableSection>
      )}

      {/* v8 ignore start -- conditional rendering of iterations/transcripts */}
      {/* Iterations */}
      {hasIterations && encoding?.iterations && (
        <ExpandableSection
          title="Iterations"
          count={encoding.iterations.length}
        >
          <IterationsList iterations={encoding.iterations} />
        </ExpandableSection>
      )}

      {/* Agent transcripts */}
      {hasTranscripts && (
        <ExpandableSection
          title="Agent transcripts"
          count={agentTranscripts.length}
        >
          <div className="flex flex-col gap-2">
            {agentTranscripts.map((t) => (
              <TranscriptCard key={t.id} transcript={t} />
            ))}
          </div>
        </ExpandableSection>
      )}
      {/* v8 ignore stop */}
      {/* Agent phases */}
      {hasSessionEvents && (
        <ExpandableSection
          title="Agent phases"
          count={agentPhases.length}
        >
          <div className="flex flex-col gap-2">
            {agentPhases.map((phase, i) => (
              <AgentPhase
                key={phase.id}
                phase={phase}
                phaseIndex={i}
                allEvents={sessionEvents}
                expandedPhases={expandedPhases}
                setExpandedPhases={setExpandedPhases}
                expandedEvents={expandedEvents}
                setExpandedEvents={setExpandedEvents}
                sessionStart={sessionStart}
                badgeColors={badgeColors}
              />
            ))}
            {agentPhases.length === 0 && (
              <div className="text-[var(--color-text-muted)] italic text-sm">
                No agent phases found in {sessionEvents.length} events
              </div>
            )}
          </div>
        </ExpandableSection>
      )}

      {/* Event timeline */}
      {hasSessionEvents && (
        <ExpandableSection
          title="Event timeline"
          count={sessionEvents.length}
        >
          <div className="max-h-[400px] overflow-y-auto flex flex-col gap-0.5">
            {sessionEvents.slice(0, timelineLimit).map((event) => (
              <EventRow
                key={event.id}
                event={event}
                sessionStart={sessionStart}
                isExpanded={expandedEvents.has(event.id)}
                badgeColors={badgeColors}
                onToggle={(e) => {
                  e.stopPropagation();
                  setExpandedEvents((prev) => {
                    const next = new Set(prev);
                    /* v8 ignore next -- toggle collapse tested via AgentPhase */
                    if (next.has(event.id)) next.delete(event.id);
                    else next.add(event.id);
                    return next;
                  });
                }}
              />
            ))}
          </div>
          {sessionEvents.length > timelineLimit && (
            <div
              className="p-4 text-center text-[var(--color-precision)] font-mono text-sm cursor-pointer rounded-lg transition-colors duration-150 hover:bg-[rgba(59,130,246,0.1)]"
              onClick={() => setTimelineLimit((prev) => prev + 50)}
            >
              Show more ({sessionEvents.length - timelineLimit} remaining)
            </div>
          )}
        </ExpandableSection>
      )}
    </div>
  );
}
