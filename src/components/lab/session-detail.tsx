"use client";

import type { SDKSession, SDKSessionEvent } from "@/lib/supabase";
import { AgentPhase } from "./agent-phase";
import { EventRow, type BadgeColors } from "./event-row";

export function SessionDetail({
  session,
  sdkSessionEvents,
  loadingEvents,
  expandedEvents,
  setExpandedEvents,
  expandedPhases,
  setExpandedPhases,
  timelineLimit,
  setTimelineLimit,
  badgeColors,
}: {
  session: SDKSession;
  sdkSessionEvents: SDKSessionEvent[];
  loadingEvents: boolean;
  expandedEvents: Set<string>;
  setExpandedEvents: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedPhases: Set<number>;
  setExpandedPhases: React.Dispatch<React.SetStateAction<Set<number>>>;
  timelineLimit: number;
  setTimelineLimit: React.Dispatch<React.SetStateAction<number>>;
  badgeColors: BadgeColors;
}) {
  const agentPhases = sdkSessionEvents.filter(
    (e) => e.event_type === "agent_start"
  );
  const toolCounts: Record<string, number> = {};
  for (const e of sdkSessionEvents) {
    if (e.tool_name) {
      toolCounts[e.tool_name] = (toolCounts[e.tool_name] || 0) + 1;
    }
  }

  return (
    <div className="bg-[rgba(59,130,246,0.03)] border border-[rgba(59,130,246,0.2)] rounded-xl overflow-hidden">
      {loadingEvents ? (
        <div className="p-6 text-center text-[#888]">Loading events...</div>
      ) : (
        <>
          {/* Agent phases */}
          <div className="p-8 border-b border-[rgba(255,255,255,0.05)]">
            <div className="font-[var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
              Agent phases ({agentPhases.length})
            </div>
            <div className="flex flex-col gap-2">
              {agentPhases.map((phase, i) => (
                <AgentPhase
                  key={phase.id}
                  phase={phase}
                  phaseIndex={i}
                  allEvents={sdkSessionEvents}
                  expandedPhases={expandedPhases}
                  setExpandedPhases={setExpandedPhases}
                  expandedEvents={expandedEvents}
                  setExpandedEvents={setExpandedEvents}
                  sessionStart={session.started_at}
                  badgeColors={badgeColors}
                />
              ))}
              {agentPhases.length === 0 && sdkSessionEvents.length > 0 && (
                <div className="text-[#666] italic text-[0.85rem]">
                  No agent phases found in {sdkSessionEvents.length} events
                </div>
              )}
            </div>
          </div>

          {/* Tool usage summary */}
          {Object.keys(toolCounts).length > 0 && (
            <div className="p-8 border-b border-[rgba(255,255,255,0.05)]">
              <div className="font-[var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                Tool usage
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(toolCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tool, count]) => (
                    <div
                      key={tool}
                      className="bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] rounded-md px-3.5 py-2 flex items-center gap-2"
                    >
                      <span className="text-[var(--color-success)] font-mono text-[0.85rem]">
                        {tool}
                      </span>
                      <span className="text-[#888] text-xs">
                        &times;{count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Session metadata */}
          <div className="p-8 border-b border-[rgba(255,255,255,0.05)]">
            <div className="font-[var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
              Session info
            </div>
            <div className="flex gap-6 flex-wrap text-[0.85rem]">
              {session.model && (
                <div>
                  <span className="text-[#888]">Model: </span>
                  <span className="text-[#ccc]">{session.model}</span>
                </div>
              )}
              <div>
                <span className="text-[#888]">Input tokens: </span>
                <span className="text-[var(--color-success)]">
                  {session.input_tokens.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[#888]">Output tokens: </span>
                <span className="text-[var(--color-success)]">
                  {session.output_tokens.toLocaleString()}
                </span>
              </div>
              {session.cache_read_tokens > 0 && (
                <div>
                  <span className="text-[#888]">Cache tokens: </span>
                  <span className="text-[#a78bfa]">
                    {session.cache_read_tokens.toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#888]">Events loaded: </span>
                <span className="text-[#ccc]">
                  {sdkSessionEvents.length} of {session.event_count}
                </span>
              </div>
            </div>
          </div>

          {/* Event timeline */}
          {sdkSessionEvents.length > 0 && (
            <div className="p-8">
              <div className="font-[var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                Event timeline ({sdkSessionEvents.length})
              </div>
              <div className="max-h-[400px] overflow-y-auto flex flex-col gap-0.5">
                {sdkSessionEvents.slice(0, timelineLimit).map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    sessionStart={session.started_at}
                    isExpanded={expandedEvents.has(event.id)}
                    badgeColors={badgeColors}
                    onToggle={(e) => {
                      e.stopPropagation();
                      setExpandedEvents((prev) => {
                        const next = new Set(prev);
                        if (next.has(event.id)) next.delete(event.id);
                        else next.add(event.id);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
              {sdkSessionEvents.length > timelineLimit && (
                <div
                  className="p-4 text-center text-[var(--color-precision)] font-mono text-[0.8rem] cursor-pointer rounded-lg transition-colors duration-150 hover:bg-[rgba(59,130,246,0.1)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTimelineLimit((prev) => prev + 50);
                  }}
                >
                  Show more ({sdkSessionEvents.length - timelineLimit}{" "}
                  remaining)
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
