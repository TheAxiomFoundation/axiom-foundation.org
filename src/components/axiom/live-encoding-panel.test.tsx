import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveEncodingPanel } from "./live-encoding-panel";
import type {
  CorpusStatusArtifact,
  EncodingOpsStatus,
} from "@/lib/corpus-status";

function encodingStatus(
  overrides: Partial<EncodingOpsStatus> = {}
): EncodingOpsStatus {
  return {
    refreshed_at: "2026-07-01T12:00:00.000Z",
    lookback_days: 7,
    run_count: 42,
    recent_run_count: 5,
    issue_run_count: 1,
    active_session_count: 0,
    latest_runs: [
      {
        id: "enc-1",
        timestamp: "2026-07-01T11:55:00.000Z",
        citation: "C.R.S. 26-2-703",
        total_duration_ms: 125000,
        agent_type: "encoder",
        agent_model: "claude-fable-5",
        data_source: "reviewer_agent",
        has_issues: false,
        session_id: "sdk-1",
        encoder_version: "0.4.2",
      },
    ],
    latest_sessions: [
      {
        id: "sdk-1",
        started_at: "2026-07-01T11:50:00.000Z",
        ended_at: "2026-07-01T11:58:00.000Z",
        model: "claude-fable-5",
        event_count: 18,
        input_tokens: 1200,
        output_tokens: 800,
        estimated_cost_usd: 0.314,
        encoder_version: "0.4.2",
      },
    ],
    latest_source_counts: { reviewer_agent: 1 },
    ...overrides,
  };
}

function artifact(
  value: EncodingOpsStatus | null,
  error: string | null = null
): CorpusStatusArtifact<EncodingOpsStatus> {
  return {
    key: "supabase://encodings.encoding_runs",
    source: value ? "supabase" : null,
    value,
    error,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LiveEncodingPanel", () => {
  it("renders the initial server-fetched encoding status", () => {
    render(<LiveEncodingPanel initial={artifact(encodingStatus())} />);

    expect(
      screen.getByText(/no encoding sessions running/i)
    ).toBeInTheDocument();
    expect(screen.getByText("C.R.S. 26-2-703")).toBeInTheDocument();
    expect(screen.getByText("sdk-1")).toBeInTheDocument();
    expect(screen.getByText("Finished")).toBeInTheDocument();
    expect(screen.getByText(/refreshes every 30s/i)).toBeInTheDocument();
  });

  it("shows active sessions as running now", () => {
    render(
      <LiveEncodingPanel
        initial={artifact(
          encodingStatus({
            active_session_count: 2,
            latest_sessions: [
              {
                ...encodingStatus().latest_sessions[0],
                ended_at: null,
              },
            ],
          })
        )}
      />
    );

    expect(
      screen.getByText(/2 encoding sessions running now/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("polls the encoding endpoint and applies fresh data", async () => {
    vi.useFakeTimers();
    const updated = artifact(
      encodingStatus({
        active_session_count: 1,
        latest_runs: [
          {
            ...encodingStatus().latest_runs[0],
            id: "enc-2",
            citation: "7 CFR 273.9",
          },
        ],
      })
    );
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => updated,
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LiveEncodingPanel
        initial={artifact(encodingStatus())}
        pollIntervalMs={1000}
      />
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/ops/encoding", {
      cache: "no-store",
    });
    expect(screen.getByText("7 CFR 273.9")).toBeInTheDocument();
    expect(
      screen.getByText(/1 encoding session running now/i)
    ).toBeInTheDocument();
  });

  it("keeps the last good data and surfaces the error when a poll fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LiveEncodingPanel
        initial={artifact(encodingStatus())}
        pollIntervalMs={1000}
      />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(screen.getByText("C.R.S. 26-2-703")).toBeInTheDocument();
    expect(
      screen.getByText(/encoding status endpoint returned 502/i)
    ).toBeInTheDocument();
  });

  it("renders the unavailable state when there is no data at all", () => {
    render(
      <LiveEncodingPanel
        initial={artifact(null, "NEXT_PUBLIC_SUPABASE_URL is not configured")}
      />
    );

    expect(
      screen.getByText(/encoding telemetry is unavailable/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/NEXT_PUBLIC_SUPABASE_URL is not configured/i)
    ).toBeInTheDocument();
  });
});
