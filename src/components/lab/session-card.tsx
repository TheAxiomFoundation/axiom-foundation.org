"use client";

import type { SDKSession, SDKSessionEvent } from "@/lib/supabase";
import { SessionDetail } from "./session-detail";
import type { BadgeColors } from "./event-row";

export function SessionCard({
  session,
  meta,
  isSelected,
  badgeColors,
  onSelect,
  sdkSessionEvents,
  loadingEvents,
  expandedEvents,
  setExpandedEvents,
  expandedPhases,
  setExpandedPhases,
  timelineLimit,
  setTimelineLimit,
}: {
  session: SDKSession;
  meta?: { title: string; lastEventAt: string | null };
  isSelected: boolean;
  badgeColors: BadgeColors;
  onSelect: () => void;
  sdkSessionEvents: SDKSessionEvent[];
  loadingEvents: boolean;
  expandedEvents: Set<string>;
  setExpandedEvents: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedPhases: Set<number>;
  setExpandedPhases: React.Dispatch<React.SetStateAction<Set<number>>>;
  timelineLimit: number;
  setTimelineLimit: React.Dispatch<React.SetStateAction<number>>;
}) {
  /* v8 ignore next -- meta?.lastEventAt fallback tested via integration */
  const endTime = session.ended_at || meta?.lastEventAt;
  const duration = endTime
    ? Math.round(
        (new Date(endTime).getTime() -
          new Date(session.started_at).getTime()) /
          1000
      )
    : null;

  return (
    <>
      <div
        className="bg-gradient-to-br from-[rgba(59,130,246,0.03)] to-[rgba(16,185,129,0.02)] border border-[var(--color-border-subtle)] rounded-2xl px-12 py-8 cursor-pointer transition-all duration-150 relative overflow-hidden hover:border-[var(--color-border)] hover:-translate-y-0.5"
        onClick={onSelect}
        style={{
          borderColor: isSelected
            ? "rgba(59, 130, 246, 0.5)"
            : undefined,
        }}
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--color-precision)] via-[var(--color-success)] to-[#a78bfa] opacity-60" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-br from-[var(--color-precision)] to-[var(--color-precision-dark)] text-[var(--color-void)] px-4 py-1 rounded-full text-[0.65rem] font-bold tracking-widest uppercase">
                Mission
              </span>
              {meta?.title ? (
                <span className="font-display text-lg text-[var(--color-text)]">
                  {meta.title}
                </span>
              ) : (
                <code className="font-mono text-base font-semibold text-[var(--color-success)]">
                  {session.id}
                </code>
              )}
            </div>
            {meta?.title && (
              <code className="font-mono text-xs text-[var(--color-text-muted)]">
                {session.id}
              </code>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[0.8rem] text-[#888]">
                {new Date(session.started_at).toLocaleDateString()}
              </div>
              <div className="text-[0.7rem] text-[#666] font-mono">
                {new Date(session.started_at).toLocaleTimeString()}
              </div>
            </div>
            <span className="text-[var(--color-precision)] text-[0.9rem]">
              {isSelected ? "\u25BC" : "\u25B6"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-6">
          {[
            {
              label: "Duration",
              value: duration
                ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                : "\u2014",
              color: "var(--color-precision)",
            },
            {
              label: "Events",
              value: session.event_count.toLocaleString(),
              color: "#a78bfa",
            },
            {
              label: "Tokens",
              value: (
                session.input_tokens + session.output_tokens
              ).toLocaleString(),
              color: "var(--color-success)",
            },
            {
              label: "Cost",
              value: `$${session.estimated_cost_usd.toFixed(2)}`,
              color: "var(--color-warmth)",
            },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-[0.65rem] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div
                className="font-mono text-base font-semibold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isSelected && (
        <SessionDetail
          session={session}
          sdkSessionEvents={sdkSessionEvents}
          loadingEvents={loadingEvents}
          expandedEvents={expandedEvents}
          setExpandedEvents={setExpandedEvents}
          expandedPhases={expandedPhases}
          setExpandedPhases={setExpandedPhases}
          timelineLimit={timelineLimit}
          setTimelineLimit={setTimelineLimit}
          badgeColors={badgeColors}
        />
      )}
    </>
  );
}
