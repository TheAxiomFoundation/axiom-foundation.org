import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EncodingRunDetail,
  SDKSession,
  SDKSessionEvent,
} from "@/lib/supabase";

const {
  mockEncodingRunLogPage,
  mockGetEncodingRunById,
  mockGetEncodingRunsBySession,
  mockGetSDKSession,
  mockGetSDKSessionEvents,
  mockGetTranscriptsBySession,
  mockNotFound,
  mockSDKSessionLogPage,
} = vi.hoisted(() => ({
  mockEncodingRunLogPage: vi.fn(),
  mockGetEncodingRunById: vi.fn(),
  mockGetEncodingRunsBySession: vi.fn(),
  mockGetSDKSession: vi.fn(),
  mockGetSDKSessionEvents: vi.fn(),
  mockGetTranscriptsBySession: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockSDKSessionLogPage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/components/encoding-runs/ops-log-detail-page", () => ({
  EncodingRunLogPage: (props: unknown) => {
    mockEncodingRunLogPage(props);
    return <div data-testid="encoding-run-log-page">encoding run page</div>;
  },
  SDKSessionLogPage: (props: unknown) => {
    mockSDKSessionLogPage(props);
    return <div data-testid="sdk-session-log-page">sdk session page</div>;
  },
}));

vi.mock("@/lib/supabase", () => ({
  getEncodingRunById: mockGetEncodingRunById,
  getEncodingRunsBySession: mockGetEncodingRunsBySession,
  getSDKSession: mockGetSDKSession,
  getSDKSessionEvents: mockGetSDKSessionEvents,
  getTranscriptsBySession: mockGetTranscriptsBySession,
}));

import EncodingRunPage, {
  generateMetadata as generateRunMetadata,
} from "@/app/ops/runs/[id]/page";
import SDKSessionPage, {
  generateMetadata as generateSessionMetadata,
} from "@/app/ops/sessions/[id]/page";

function makeRun(
  overrides: Partial<EncodingRunDetail> = {}
): EncodingRunDetail {
  return {
    id: "run 1",
    timestamp: "2026-05-09T19:03:29.025869Z",
    citation: "26 USC 63(f)",
    session_id: "encode-run-1",
    file_path: "statutes/26/63/f.yaml",
    rulespec_content: "rules:",
    final_scores: null,
    iterations: null,
    total_duration_ms: 125000,
    agent_type: "encoder",
    agent_model: "gpt-5.5",
    data_source: "reviewer_agent",
    has_issues: false,
    note: "Matched PE oracle.",
    encoder_version: "0.2.64",
    ...overrides,
  };
}

function makeSession(overrides: Partial<SDKSession> = {}): SDKSession {
  return {
    id: "encode-run-1",
    started_at: "2026-05-09T19:03:29.025869Z",
    ended_at: "2026-05-09T19:08:29.025869Z",
    model: "gpt-5.5",
    cwd: "/tmp/axiom-encode",
    event_count: 2,
    input_tokens: 1000,
    output_tokens: 500,
    cache_read_tokens: 250,
    estimated_cost_usd: 0.42,
    encoder_version: "0.2.64",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<SDKSessionEvent> = {}): SDKSessionEvent {
  return {
    id: "event-1",
    session_id: "encode-run-1",
    sequence: 1,
    timestamp: "2026-05-09T19:04:00.000Z",
    event_type: "agent_start",
    tool_name: null,
    content: "Encode 26 USC 63(f)",
    metadata: null,
    ...overrides,
  };
}

describe("ops run detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the run citation and encoded id in metadata", async () => {
    mockGetEncodingRunById.mockResolvedValue(makeRun());

    const metadata = await generateRunMetadata({
      params: Promise.resolve({ id: "run%201" }),
    });

    expect(mockGetEncodingRunById).toHaveBeenCalledWith("run 1");
    expect(metadata.title).toBe("26 USC 63(f) - Encoder Run - Axiom Foundation");
    expect(metadata.alternates?.canonical).toBe(
      "https://axiom-foundation.org/ops/runs/run%201"
    );
  });

  it("falls back to the decoded run id in metadata", async () => {
    mockGetEncodingRunById.mockResolvedValue(null);

    const metadata = await generateRunMetadata({
      params: Promise.resolve({ id: "missing%20run" }),
    });

    expect(metadata.title).toBe("missing run - Encoder Run - Axiom Foundation");
  });

  it("loads the run, linked session, events, and transcripts", async () => {
    const run = makeRun();
    const session = makeSession();
    const event = makeEvent();
    mockGetEncodingRunById.mockResolvedValue(run);
    mockGetSDKSession.mockResolvedValue(session);
    mockGetSDKSessionEvents.mockResolvedValue([event]);
    mockGetTranscriptsBySession.mockResolvedValue([{ id: 1 }]);

    const ui = await EncodingRunPage({
      params: Promise.resolve({ id: "run%201" }),
    });
    render(ui);

    expect(screen.getByTestId("encoding-run-log-page")).toBeInTheDocument();
    expect(mockGetSDKSession).toHaveBeenCalledWith("encode-run-1");
    expect(mockGetSDKSessionEvents).toHaveBeenCalledWith("encode-run-1");
    expect(mockGetTranscriptsBySession).toHaveBeenCalledWith("encode-run-1");
    expect(mockEncodingRunLogPage).toHaveBeenCalledWith({
      run,
      session,
      events: [event],
      transcripts: [{ id: 1 }],
    });
  });

  it("renders a run without session telemetry", async () => {
    const run = makeRun({ session_id: null });
    mockGetEncodingRunById.mockResolvedValue(run);

    const ui = await EncodingRunPage({
      params: Promise.resolve({ id: "run%201" }),
    });
    render(ui);

    expect(mockGetSDKSession).not.toHaveBeenCalled();
    expect(mockEncodingRunLogPage).toHaveBeenCalledWith({
      run,
      session: null,
      events: [],
      transcripts: [],
    });
  });

  it("returns not found when the run is missing", async () => {
    mockGetEncodingRunById.mockResolvedValue(null);

    await expect(
      EncodingRunPage({ params: Promise.resolve({ id: "missing-run" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});

describe("ops session detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the session id in metadata", async () => {
    const metadata = await generateSessionMetadata({
      params: Promise.resolve({ id: "encode-run%201" }),
    });

    expect(metadata.title).toBe(
      "encode-run 1 - Encoder Session - Axiom Foundation"
    );
    expect(metadata.alternates?.canonical).toBe(
      "https://axiom-foundation.org/ops/sessions/encode-run%201"
    );
  });

  it("loads the session, linked runs, events, and transcripts", async () => {
    const session = makeSession();
    const run = makeRun();
    const event = makeEvent();
    mockGetSDKSession.mockResolvedValue(session);
    mockGetEncodingRunsBySession.mockResolvedValue([run]);
    mockGetSDKSessionEvents.mockResolvedValue([event]);
    mockGetTranscriptsBySession.mockResolvedValue([{ id: 2 }]);

    const ui = await SDKSessionPage({
      params: Promise.resolve({ id: "encode-run-1" }),
    });
    render(ui);

    expect(screen.getByTestId("sdk-session-log-page")).toBeInTheDocument();
    expect(mockGetSDKSession).toHaveBeenCalledWith("encode-run-1");
    expect(mockGetEncodingRunsBySession).toHaveBeenCalledWith("encode-run-1");
    expect(mockGetSDKSessionEvents).toHaveBeenCalledWith("encode-run-1");
    expect(mockGetTranscriptsBySession).toHaveBeenCalledWith("encode-run-1");
    expect(mockSDKSessionLogPage).toHaveBeenCalledWith({
      session,
      runs: [run],
      events: [event],
      transcripts: [{ id: 2 }],
    });
  });

  it("returns not found when the session is missing", async () => {
    mockGetSDKSession.mockResolvedValue(null);

    await expect(
      SDKSessionPage({ params: Promise.resolve({ id: "missing-session" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
