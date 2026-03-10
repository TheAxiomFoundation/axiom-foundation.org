"use client";

import { useState, useEffect } from "react";
import {
  getSDKSessions,
  getSDKSessionMeta,
  type SDKSession,
} from "@/lib/supabase";

export interface UseSessionsResult {
  sessions: SDKSession[];
  meta: Record<string, { title: string; lastEventAt: string | null }>;
  loading: boolean;
  error: string | null;
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<SDKSession[]>([]);
  const [meta, setMeta] = useState<
    Record<string, { title: string; lastEventAt: string | null }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const sessionData = await getSDKSessions();
        if (cancelled) return;
        setSessions(sessionData);

        if (sessionData.length > 0) {
          const ids = sessionData.map((s) => s.id);
          const metaData = await getSDKSessionMeta(ids);
          if (cancelled) return;
          setMeta(metaData);
        }
      } catch {
        if (cancelled) return;
        setError("Failed to load sessions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  return { sessions, meta, loading, error };
}
