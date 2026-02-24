"use client";

import type { SDKSessionEvent } from "@/lib/supabase";
import { EventRow, type BadgeColors } from "./event-row";

export function AgentPhase({
  phase,
  phaseIndex,
  allEvents,
  expandedPhases,
  setExpandedPhases,
  expandedEvents,
  setExpandedEvents,
  sessionStart,
  badgeColors,
}: {
  phase: SDKSessionEvent;
  phaseIndex: number;
  allEvents: SDKSessionEvent[];
  expandedPhases: Set<number>;
  setExpandedPhases: React.Dispatch<React.SetStateAction<Set<number>>>;
  expandedEvents: Set<string>;
  setExpandedEvents: React.Dispatch<React.SetStateAction<Set<string>>>;
  sessionStart: string;
  badgeColors: BadgeColors;
}) {
  const endPhase = allEvents.find(
    (e) =>
      e.event_type === "agent_end" &&
      e.sequence > phase.sequence &&
      allEvents.filter(
        (x) =>
          x.event_type === "agent_start" &&
          x.sequence > phase.sequence &&
          x.sequence < e.sequence
      ).length === 0
  );
  const phaseEvents = allEvents.filter(
    (e) =>
      e.sequence >= phase.sequence &&
      e.sequence <= (endPhase?.sequence ?? phase.sequence + 999999)
  );
  const phaseToolCounts: Record<string, number> = {};
  for (const e of phaseEvents) {
    if (e.tool_name)
      phaseToolCounts[e.tool_name] =
        (phaseToolCounts[e.tool_name] || 0) + 1;
  }
  const prompt = (phase.content || "").slice(0, 200);
  const isPhaseExpanded = expandedPhases.has(phaseIndex);

  return (
    <div
      className="bg-[rgba(0,0,0,0.2)] rounded-md overflow-hidden"
      style={{
        border: isPhaseExpanded
          ? "1px solid rgba(59, 130, 246, 0.3)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="p-3 px-4 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setExpandedPhases((prev) => {
            const next = new Set(prev);
            if (next.has(phaseIndex)) next.delete(phaseIndex);
            else next.add(phaseIndex);
            return next;
          });
        }}
      >
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-precision)] text-xs">
              {isPhaseExpanded ? "\u25BC" : "\u25B6"}
            </span>
            <span className="text-[var(--color-precision)] font-semibold text-[0.85rem]">
              Phase {phaseIndex + 1}
            </span>
          </div>
          <span className="text-[#888] text-xs font-mono">
            {phaseEvents.length} events
          </span>
        </div>
        {prompt && (
          <div className="text-[#ccc] text-[0.8rem] mb-2 leading-relaxed">
            {prompt}
            {phase.content && phase.content.length > 200 ? "..." : ""}
          </div>
        )}
        {Object.keys(phaseToolCounts).length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(phaseToolCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([tool, count]) => (
                <span
                  key={tool}
                  className="bg-[rgba(167,139,250,0.1)] text-[#a78bfa] px-2 py-0.5 rounded text-[0.7rem] font-mono"
                >
                  {tool} &times;{count}
                </span>
              ))}
          </div>
        )}
      </div>
      {isPhaseExpanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-2 max-h-[400px] overflow-y-auto">
          {phaseEvents.map((event) => (
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
                  if (next.has(event.id)) next.delete(event.id);
                  else next.add(event.id);
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
