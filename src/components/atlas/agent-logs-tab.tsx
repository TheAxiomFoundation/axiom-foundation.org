"use client";

import { useState } from "react";
import type { SDKSessionEvent } from "@/lib/supabase";
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

export function AgentLogsTab({
  sessionEvents,
  loading,
  sessionId,
}: {
  sessionEvents: SDKSessionEvent[];
  loading: boolean;
  sessionId: string | null;
}) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [timelineLimit, setTimelineLimit] = useState(50);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        Loading agent logs...
      </div>
    );
  }

  if (!sessionId || sessionEvents.length === 0) {
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
  /* v8 ignore next -- fallback unreachable due to empty check above */
  const sessionStart = sessionEvents[0]?.timestamp ?? new Date().toISOString();

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Agent phases */}
      <div className="mb-6">
        <div className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Agent phases ({agentPhases.length})
        </div>
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
      </div>

      {/* Event timeline */}
      <div>
        <div className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Event timeline ({sessionEvents.length})
        </div>
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
      </div>
    </div>
  );
}
