"use client";

import { useState } from "react";
import type { SDKSession, SDKSessionEvent } from "@/lib/supabase";
import { getSDKSessionEvents } from "@/lib/supabase";
import { AgentLogsTab } from "@/components/atlas/agent-logs-tab";

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "running...";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function SessionCard({
  session,
  title,
}: {
  session: SDKSession;
  title: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<SDKSessionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && events.length === 0) {
      setEventsLoading(true);
      try {
        const data = await getSDKSessionEvents(session.id);
        setEvents(data);
      } catch {
        // Events will remain empty
      } finally {
        setEventsLoading(false);
      }
    }
    setExpanded((p) => !p);
  };

  const displayTitle = title || session.id.slice(0, 12);
  const date = new Date(session.started_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden transition-all duration-200"
      style={{
        borderColor: expanded
          ? "rgba(59, 130, 246, 0.3)"
          : undefined,
      }}
    >
      <div
        className="p-5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[var(--color-precision)] text-xs shrink-0">
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
            <div className="min-w-0">
              <h3 className="font-[family-name:var(--f-body)] text-[1rem] text-[var(--color-text)] truncate">
                {displayTitle}
              </h3>
              <p className="font-[family-name:var(--f-mono)] text-xs text-[var(--color-text-muted)] mt-0.5">
                {date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="font-[family-name:var(--f-mono)] text-xs text-[var(--color-text-muted)]">
                {session.event_count} events
              </div>
              <div className="font-[family-name:var(--f-mono)] text-xs text-[var(--color-text-muted)]">
                {formatDuration(session.started_at, session.ended_at)}
              </div>
            </div>
            <div className="text-right">
              {session.model && (
                <div className="font-[family-name:var(--f-mono)] text-xs text-[var(--color-precision)]">
                  {session.model}
                </div>
              )}
              {session.estimated_cost_usd > 0 && (
                <div className="font-[family-name:var(--f-mono)] text-xs text-[var(--color-text-muted)]">
                  {formatCost(session.estimated_cost_usd)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4">
          <AgentLogsTab
            sessionEvents={events}
            loading={eventsLoading}
            sessionId={session.id}
          />
        </div>
      )}
    </div>
  );
}
