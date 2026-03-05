"use client";

import { useState, useEffect } from "react";
import {
  getRuleEncoding,
  getSDKSessionEvents,
  getTranscriptsBySession,
  type RuleEncodingData,
  type SDKSessionEvent,
  type AgentTranscript,
} from "@/lib/supabase";

export interface UseEncodingResult {
  encoding: RuleEncodingData | null;
  sessionEvents: SDKSessionEvent[];
  agentTranscripts: AgentTranscript[];
  loading: boolean;
  error: string | null;
}

export function useEncoding(ruleId: string | null): UseEncodingResult {
  const [encoding, setEncoding] = useState<RuleEncodingData | null>(null);
  const [sessionEvents, setSessionEvents] = useState<SDKSessionEvent[]>([]);
  const [agentTranscripts, setAgentTranscripts] = useState<AgentTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ruleId) {
      setEncoding(null);
      setSessionEvents([]);
      setAgentTranscripts([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const encodingData = await getRuleEncoding(ruleId!);
        /* v8 ignore next -- cancellation guard for race conditions */
        if (cancelled) return;
        setEncoding(encodingData);

        if (encodingData?.session_id) {
          const [events, transcripts] = await Promise.all([
            getSDKSessionEvents(encodingData.session_id),
            getTranscriptsBySession(encodingData.session_id),
          ]);
          /* v8 ignore next -- cancellation guard for race conditions */
          if (cancelled) return;
          setSessionEvents(events);
          setAgentTranscripts(transcripts);
        } else {
          setSessionEvents([]);
          setAgentTranscripts([]);
        }
      } catch (err) {
        /* v8 ignore next -- cancellation guard for race conditions */
        if (cancelled) return;
        setError("Failed to load encoding data");
        setEncoding(null);
        setSessionEvents([]);
        setAgentTranscripts([]);
      } finally {
        /* v8 ignore next -- cancellation guard for race conditions */
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [ruleId]);

  return { encoding, sessionEvents, agentTranscripts, loading, error };
}
