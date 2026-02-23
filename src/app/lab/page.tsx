"use client";

import { useState, useEffect, Fragment } from "react";
import { RocketIcon } from "@/components/icons";
import {
  getSDKSessions,
  getSDKSessionEvents,
  getSDKSessionMeta,
  type SDKSession,
  type SDKSessionEvent,
} from "@/lib/supabase";

export default function LabPage() {
  const [sdkSessions, setSdkSessions] = useState<SDKSession[]>([]);
  const [selectedSDKSession, setSelectedSDKSession] =
    useState<SDKSession | null>(null);
  const [sdkSessionEvents, setSdkSessionEvents] = useState<SDKSessionEvent[]>(
    []
  );
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMeta, setSessionMeta] = useState<
    Record<string, { title: string; lastEventAt: string | null }>
  >({});
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [timelineLimit, setTimelineLimit] = useState(50);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const sessions = await getSDKSessions(50);
        setSdkSessions(sessions);
        if (sessions.length > 0) {
          const meta = await getSDKSessionMeta(sessions.map((s) => s.id));
          setSessionMeta(meta);
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectSDKSession = async (session: SDKSession) => {
    if (selectedSDKSession?.id === session.id) {
      setSelectedSDKSession(null);
      setSdkSessionEvents([]);
      return;
    }
    setSelectedSDKSession(session);
    setSdkSessionEvents([]);
    setLoadingEvents(true);
    setExpandedEvents(new Set());
    setExpandedPhases(new Set());
    setTimelineLimit(50);
    const events = await getSDKSessionEvents(session.id, 2000);
    setSdkSessionEvents(events);
    setLoadingEvents(false);
  };

  const activeSessions = sdkSessions.filter((s) => s.event_count > 0);
  const totalTokens = activeSessions.reduce(
    (acc, s) => acc + s.input_tokens + s.output_tokens,
    0
  );
  const totalCost = activeSessions.reduce(
    (acc, s) => acc + s.estimated_cost_usd,
    0
  );

  const badgeColors: Record<string, { bg: string; fg: string }> = {
    agent_start: { bg: "rgba(59, 130, 246, 0.15)", fg: "#3b82f6" },
    agent_end: { bg: "rgba(59, 130, 246, 0.1)", fg: "#2563eb" },
    tool_use: { bg: "rgba(167, 139, 250, 0.15)", fg: "#a78bfa" },
    tool_result: { bg: "rgba(167, 139, 250, 0.1)", fg: "#8b6fd4" },
    message: { bg: "rgba(16, 185, 129, 0.12)", fg: "#10b981" },
    thinking: { bg: "rgba(245, 158, 11, 0.12)", fg: "#f59e0b" },
  };

  return (
    <div className="relative z-10 max-w-[1400px] mx-auto px-8 py-16">
      <header className="mb-12 pt-24">
        <div className="flex items-center gap-6 mb-6">
          <span className="px-6 py-2 bg-gradient-to-br from-[rgba(59,130,246,0.15)] to-[rgba(59,130,246,0.05)] border border-[var(--color-precision)] rounded-full font-[family-name:var(--f-mono)] text-xs font-semibold text-[var(--color-precision)] uppercase tracking-widest">
            Encoding lab
          </span>
          <h1 className="font-[family-name:var(--f-display)] text-[clamp(2rem,4vw,2.5rem)] font-normal text-[var(--color-text)] m-0">
            AutoRAC
          </h1>
        </div>
        <div className="flex gap-8 flex-wrap">
          <span className="flex items-center gap-2">
            <span className="font-[family-name:var(--f-body)] text-[0.85rem] text-[var(--color-text-muted)]">
              Sessions:
            </span>
            <span className="font-[family-name:var(--f-mono)] text-[0.9rem] font-semibold text-[var(--color-text)]">
              {activeSessions.length}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-[family-name:var(--f-body)] text-[0.85rem] text-[var(--color-text-muted)]">
              Tokens:
            </span>
            <span className="font-[family-name:var(--f-mono)] text-[0.9rem] font-semibold text-[var(--color-text)]">
              {totalTokens.toLocaleString()}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-[family-name:var(--f-body)] text-[0.85rem] text-[var(--color-text-muted)]">
              Cost:
            </span>
            <span className="font-[family-name:var(--f-mono)] text-[0.9rem] font-semibold text-[var(--color-text)]">
              ${totalCost.toFixed(2)}
            </span>
          </span>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-6 px-8 py-6 rounded-xl mb-8 font-[family-name:var(--f-body)] text-[0.95rem] font-semibold bg-gradient-to-r from-[var(--color-precision)] to-[var(--color-precision-dark)] text-white">
          <span className="text-2xl">&#x23F3;</span>
          <div>Loading sessions...</div>
        </div>
      ) : (
        <section className="mb-12">
          {activeSessions.length === 0 ? (
            <div className="py-24 px-12 text-center bg-gradient-to-b from-[rgba(59,130,246,0.03)] to-transparent rounded-2xl border border-dashed border-[var(--color-border)]">
              <div className="mb-8 opacity-60 text-[var(--color-precision)]">
                <RocketIcon size={48} />
              </div>
              <div className="font-[family-name:var(--f-display)] text-xl text-[var(--color-text)] mb-2">
                No encoding sessions yet
              </div>
              <div className="font-[family-name:var(--f-body)] text-[0.9rem] text-[var(--color-text-muted)]">
                Run{" "}
                <code className="bg-[rgba(59,130,246,0.1)] px-2 py-1 rounded text-[var(--color-precision)]">
                  autorac sync-sdk-sessions
                </code>{" "}
                to sync from experiments.db
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeSessions.map((session) => {
                const meta = sessionMeta[session.id];
                const endTime = session.ended_at || meta?.lastEventAt;
                const duration = endTime
                  ? Math.round(
                      (new Date(endTime).getTime() -
                        new Date(session.started_at).getTime()) /
                        1000
                    )
                  : null;
                const isSelected = selectedSDKSession?.id === session.id;

                const agentPhases = isSelected
                  ? sdkSessionEvents.filter(
                      (e) => e.event_type === "agent_start"
                    )
                  : [];
                const toolCounts: Record<string, number> = {};
                if (isSelected) {
                  for (const e of sdkSessionEvents) {
                    if (e.tool_name) {
                      toolCounts[e.tool_name] =
                        (toolCounts[e.tool_name] || 0) + 1;
                    }
                  }
                }

                return (
                  <Fragment key={session.id}>
                    <div
                      className="bg-gradient-to-br from-[rgba(59,130,246,0.03)] to-[rgba(16,185,129,0.02)] border border-[var(--color-border-subtle)] rounded-2xl px-12 py-8 cursor-pointer transition-all duration-150 relative overflow-hidden hover:border-[var(--color-border)] hover:-translate-y-0.5"
                      onClick={() => handleSelectSDKSession(session)}
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
                              <span className="font-[family-name:var(--f-display)] text-lg text-[var(--color-text)]">
                                {meta.title}
                              </span>
                            ) : (
                              <code className="font-[family-name:var(--f-mono)] text-base font-semibold text-[var(--color-success)]">
                                {session.id}
                              </code>
                            )}
                          </div>
                          {meta?.title && (
                            <code className="font-[family-name:var(--f-mono)] text-xs text-[var(--color-text-muted)]">
                              {session.id}
                            </code>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[0.8rem] text-[#888]">
                              {new Date(
                                session.started_at
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-[0.7rem] text-[#666] font-[family-name:var(--f-mono)]">
                              {new Date(
                                session.started_at
                              ).toLocaleTimeString()}
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
                              className="font-[family-name:var(--f-mono)] text-base font-semibold"
                              style={{ color: stat.color }}
                            >
                              {stat.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="bg-[rgba(59,130,246,0.03)] border border-[rgba(59,130,246,0.2)] rounded-xl overflow-hidden">
                        {loadingEvents ? (
                          <div className="p-6 text-center text-[#888]">
                            Loading events...
                          </div>
                        ) : (
                          <>
                            {/* Agent phases */}
                            <div className="p-8 border-b border-[rgba(255,255,255,0.05)]">
                              <div className="font-[family-name:var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                                Agent phases ({agentPhases.length})
                              </div>
                              <div className="flex flex-col gap-2">
                                {agentPhases.map((phase, i) => {
                                  const endPhase = sdkSessionEvents.find(
                                    (e) =>
                                      e.event_type === "agent_end" &&
                                      e.sequence > phase.sequence &&
                                      sdkSessionEvents.filter(
                                        (x) =>
                                          x.event_type === "agent_start" &&
                                          x.sequence > phase.sequence &&
                                          x.sequence < e.sequence
                                      ).length === 0
                                  );
                                  const phaseEvents = sdkSessionEvents.filter(
                                    (e) =>
                                      e.sequence >= phase.sequence &&
                                      e.sequence <=
                                        (endPhase?.sequence ??
                                          phase.sequence + 999999)
                                  );
                                  const phaseToolCounts: Record<
                                    string,
                                    number
                                  > = {};
                                  for (const e of phaseEvents) {
                                    if (e.tool_name)
                                      phaseToolCounts[e.tool_name] =
                                        (phaseToolCounts[e.tool_name] || 0) + 1;
                                  }
                                  const prompt = (phase.content || "").slice(
                                    0,
                                    200
                                  );
                                  const isPhaseExpanded = expandedPhases.has(i);

                                  return (
                                    <div
                                      key={phase.id}
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
                                            if (next.has(i)) next.delete(i);
                                            else next.add(i);
                                            return next;
                                          });
                                        }}
                                      >
                                        <div className="flex justify-between items-center mb-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[var(--color-precision)] text-xs">
                                              {isPhaseExpanded
                                                ? "\u25BC"
                                                : "\u25B6"}
                                            </span>
                                            <span className="text-[var(--color-precision)] font-semibold text-[0.85rem]">
                                              Phase {i + 1}
                                            </span>
                                          </div>
                                          <span className="text-[#888] text-xs font-[family-name:var(--f-mono)]">
                                            {phaseEvents.length} events
                                          </span>
                                        </div>
                                        {prompt && (
                                          <div className="text-[#ccc] text-[0.8rem] mb-2 leading-relaxed">
                                            {prompt}
                                            {phase.content &&
                                            phase.content.length > 200
                                              ? "..."
                                              : ""}
                                          </div>
                                        )}
                                        {Object.keys(phaseToolCounts).length >
                                          0 && (
                                          <div className="flex gap-1.5 flex-wrap">
                                            {Object.entries(phaseToolCounts)
                                              .sort((a, b) => b[1] - a[1])
                                              .map(([tool, count]) => (
                                                <span
                                                  key={tool}
                                                  className="bg-[rgba(167,139,250,0.1)] text-[#a78bfa] px-2 py-0.5 rounded text-[0.7rem] font-[family-name:var(--f-mono)]"
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
                                              sessionStart={
                                                session.started_at
                                              }
                                              isExpanded={expandedEvents.has(
                                                event.id
                                              )}
                                              badgeColors={badgeColors}
                                              onToggle={(e) => {
                                                e.stopPropagation();
                                                setExpandedEvents((prev) => {
                                                  const next = new Set(prev);
                                                  if (next.has(event.id))
                                                    next.delete(event.id);
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
                                })}
                                {agentPhases.length === 0 &&
                                  sdkSessionEvents.length > 0 && (
                                    <div className="text-[#666] italic text-[0.85rem]">
                                      No agent phases found in{" "}
                                      {sdkSessionEvents.length} events
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Tool usage summary */}
                            {Object.keys(toolCounts).length > 0 && (
                              <div className="p-8 border-b border-[rgba(255,255,255,0.05)]">
                                <div className="font-[family-name:var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
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
                                        <span className="text-[var(--color-success)] font-[family-name:var(--f-mono)] text-[0.85rem]">
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
                              <div className="font-[family-name:var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                                Session info
                              </div>
                              <div className="flex gap-6 flex-wrap text-[0.85rem]">
                                {session.model && (
                                  <div>
                                    <span className="text-[#888]">
                                      Model:{" "}
                                    </span>
                                    <span className="text-[#ccc]">
                                      {session.model}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-[#888]">
                                    Input tokens:{" "}
                                  </span>
                                  <span className="text-[var(--color-success)]">
                                    {session.input_tokens.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[#888]">
                                    Output tokens:{" "}
                                  </span>
                                  <span className="text-[var(--color-success)]">
                                    {session.output_tokens.toLocaleString()}
                                  </span>
                                </div>
                                {session.cache_read_tokens > 0 && (
                                  <div>
                                    <span className="text-[#888]">
                                      Cache tokens:{" "}
                                    </span>
                                    <span className="text-[#a78bfa]">
                                      {session.cache_read_tokens.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-[#888]">
                                    Events loaded:{" "}
                                  </span>
                                  <span className="text-[#ccc]">
                                    {sdkSessionEvents.length} of{" "}
                                    {session.event_count}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Event timeline */}
                            {sdkSessionEvents.length > 0 && (
                              <div className="p-8">
                                <div className="font-[family-name:var(--f-body)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                                  Event timeline ({sdkSessionEvents.length})
                                </div>
                                <div className="max-h-[400px] overflow-y-auto flex flex-col gap-0.5">
                                  {sdkSessionEvents
                                    .slice(0, timelineLimit)
                                    .map((event) => (
                                      <EventRow
                                        key={event.id}
                                        event={event}
                                        sessionStart={session.started_at}
                                        isExpanded={expandedEvents.has(
                                          event.id
                                        )}
                                        badgeColors={badgeColors}
                                        onToggle={(e) => {
                                          e.stopPropagation();
                                          setExpandedEvents((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(event.id))
                                              next.delete(event.id);
                                            else next.add(event.id);
                                            return next;
                                          });
                                        }}
                                      />
                                    ))}
                                </div>
                                {sdkSessionEvents.length > timelineLimit && (
                                  <div
                                    className="p-4 text-center text-[var(--color-precision)] font-[family-name:var(--f-mono)] text-[0.8rem] cursor-pointer rounded-lg transition-colors duration-150 hover:bg-[rgba(59,130,246,0.1)]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTimelineLimit((prev) => prev + 50);
                                    }}
                                  >
                                    Show more (
                                    {sdkSessionEvents.length - timelineLimit}{" "}
                                    remaining)
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function EventRow({
  event,
  sessionStart,
  isExpanded,
  badgeColors,
  onToggle,
}: {
  event: SDKSessionEvent;
  sessionStart: string;
  isExpanded: boolean;
  badgeColors: Record<string, { bg: string; fg: string }>;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const sessionStartMs = new Date(sessionStart).getTime();
  const eventTime = new Date(event.timestamp).getTime();
  const offsetSec = Math.max(0, Math.round((eventTime - sessionStartMs) / 1000));
  const minutes = Math.floor(offsetSec / 60);
  const seconds = offsetSec % 60;
  const relTime = `+${minutes}m ${String(seconds).padStart(2, "0")}s`;
  const colors = badgeColors[event.event_type] || {
    bg: "rgba(255, 255, 255, 0.08)",
    fg: "#888",
  };
  const label = event.tool_name
    ? `${event.event_type}:${event.tool_name}`
    : event.event_type;
  const contentText = event.content || "";

  return (
    <div
      className="grid grid-cols-[40px_100px_120px_1fr] gap-2 items-start px-4 py-2 rounded cursor-pointer text-[0.8rem] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]"
      onClick={onToggle}
    >
      <span className="font-[family-name:var(--f-mono)] text-[0.7rem] text-[var(--color-text-muted)] text-right">
        #{event.sequence}
      </span>
      <span
        className="font-[family-name:var(--f-mono)] text-[0.7rem] font-semibold px-2 py-px rounded text-center whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ background: colors.bg, color: colors.fg }}
      >
        {label}
      </span>
      <span className="font-[family-name:var(--f-mono)] text-[0.7rem] text-[var(--color-text-muted)]">
        {relTime}
      </span>
      {contentText ? (
        <span
          className={
            isExpanded
              ? "text-[0.8rem] text-[var(--color-text-secondary)] whitespace-pre-wrap break-words"
              : "text-[0.8rem] text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap"
          }
        >
          {isExpanded
            ? contentText
            : contentText.slice(0, 120) +
              (contentText.length > 120 ? "..." : "")}
        </span>
      ) : (
        <span className="text-[0.8rem] text-[#555]">--</span>
      )}
    </div>
  );
}
