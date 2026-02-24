"use client";

import { useState, useEffect } from "react";
import { RocketIcon } from "@/components/icons";
import {
  getSDKSessions,
  getSDKSessionEvents,
  getSDKSessionMeta,
  type SDKSession,
  type SDKSessionEvent,
} from "@/lib/supabase";
import { SessionCard } from "@/components/lab/session-card";
import type { BadgeColors } from "@/components/lab/event-row";

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

  const badgeColors: BadgeColors = {
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
          <span className="px-6 py-2 bg-gradient-to-br from-[rgba(59,130,246,0.15)] to-[rgba(59,130,246,0.05)] border border-[var(--color-precision)] rounded-full font-mono text-xs font-semibold text-[var(--color-precision)] uppercase tracking-widest">
            Encoding lab
          </span>
          <h1 className="font-display text-[clamp(2rem,4vw,2.5rem)] font-normal text-[var(--color-text)] m-0">
            AutoRAC
          </h1>
        </div>
        <div className="flex gap-8 flex-wrap">
          <span className="flex items-center gap-2">
            <span className="font-[var(--f-body)] text-[0.85rem] text-[var(--color-text-muted)]">
              Sessions:
            </span>
            <span className="font-mono text-[0.9rem] font-semibold text-[var(--color-text)]">
              {activeSessions.length}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-[var(--f-body)] text-[0.85rem] text-[var(--color-text-muted)]">
              Tokens:
            </span>
            <span className="font-mono text-[0.9rem] font-semibold text-[var(--color-text)]">
              {totalTokens.toLocaleString()}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-[var(--f-body)] text-[0.85rem] text-[var(--color-text-muted)]">
              Cost:
            </span>
            <span className="font-mono text-[0.9rem] font-semibold text-[var(--color-text)]">
              ${totalCost.toFixed(2)}
            </span>
          </span>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-6 px-8 py-6 rounded-xl mb-8 font-[var(--f-body)] text-[0.95rem] font-semibold bg-gradient-to-r from-[var(--color-precision)] to-[var(--color-precision-dark)] text-white">
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
              <div className="font-display text-xl text-[var(--color-text)] mb-2">
                No encoding sessions yet
              </div>
              <div className="font-[var(--f-body)] text-[0.9rem] text-[var(--color-text-muted)]">
                Run{" "}
                <code className="bg-[rgba(59,130,246,0.1)] px-2 py-1 rounded text-[var(--color-precision)]">
                  autorac sync-sdk-sessions
                </code>{" "}
                to sync from experiments.db
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  meta={sessionMeta[session.id]}
                  isSelected={selectedSDKSession?.id === session.id}
                  badgeColors={badgeColors}
                  onSelect={() => handleSelectSDKSession(session)}
                  sdkSessionEvents={sdkSessionEvents}
                  loadingEvents={loadingEvents}
                  expandedEvents={expandedEvents}
                  setExpandedEvents={setExpandedEvents}
                  expandedPhases={expandedPhases}
                  setExpandedPhases={setExpandedPhases}
                  timelineLimit={timelineLimit}
                  setTimelineLimit={setTimelineLimit}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
