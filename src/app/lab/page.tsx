"use client";

import { useSessions } from "@/hooks/use-sessions";
import { SessionCard } from "@/components/lab/session-card";

export default function LabPage() {
  const { sessions, meta, loading, error } = useSessions();

  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[900px] mx-auto">
        <header className="text-center mb-16">
          <h1 className="heading-page text-[var(--color-ink)] mb-6">
            Experiment lab
          </h1>
          <p className="font-body text-lg font-light text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            SDK sessions from the AutoRAC encoding pipeline. Click a session to
            explore agent phases, tool calls, and event timelines.
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-20 text-[var(--color-ink-muted)]">
            Loading sessions...
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-red-400 mb-2">{error}</div>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Check that Supabase is configured correctly.
            </p>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="text-center py-20">
            <div className="font-heading text-lg text-[var(--color-ink-muted)] mb-2">
              No sessions yet
            </div>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Sessions will appear here once AutoRAC encoding runs are uploaded.
            </p>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                title={meta[session.id]?.title || ""}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
