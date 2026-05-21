import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AgentTranscript,
  EncodingRunDetail,
  SDKSession,
  SDKSessionEvent,
} from "@/lib/supabase";
import {
  EncodingRunLogPage,
  SDKSessionLogPage,
} from "./ops-log-detail-page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeRun(overrides: Partial<EncodingRunDetail> = {}): EncodingRunDetail {
  return {
    id: "run-1",
    timestamp: "2026-05-09T19:03:29.025869Z",
    citation: "26 USC 63(f)",
    session_id: "encode-run-1",
    file_path: "statutes/26/63/f.yaml",
    rulespec_content: "rules:",
    final_scores: { rulespec: 1, formula: 1, parameter: 1, integration: 1 },
    iterations: [{ attempt: 1, success: true, duration_ms: 1200, errors: [] }],
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
    metadata: { agent_type: "encoder" },
    ...overrides,
  };
}

function makeTranscript(
  overrides: Partial<AgentTranscript> = {}
): AgentTranscript {
  return {
    id: 1,
    session_id: "encode-run-1",
    agent_id: "agent-1",
    tool_use_id: "tool-1",
    subagent_type: "reviewer",
    prompt: "Review encoding",
    description: null,
    response_summary: "Looks consistent",
    transcript: null,
    orchestrator_thinking: null,
    message_count: 3,
    created_at: "2026-05-09T19:04:00.000Z",
    uploaded_at: null,
    ...overrides,
  };
}

describe("EncodingRunLogPage", () => {
  it("renders run metadata with a link to the SDK session", () => {
    render(
      <EncodingRunLogPage
        run={makeRun()}
        session={makeSession()}
        events={[makeEvent()]}
        transcripts={[makeTranscript()]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "26 USC 63(f)" })
    ).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();
    expect(screen.getByText("statutes/26/63/f.yaml")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "encode-run-1" })).toHaveAttribute(
      "href",
      "/ops/sessions/encode-run-1"
    );
    fireEvent.click(screen.getByRole("button", { name: /event timeline/i }));
    expect(screen.getByText("Encode 26 USC 63(f)")).toBeInTheDocument();
  });
});

describe("SDKSessionLogPage", () => {
  it("renders session metadata and linked encoding runs", () => {
    render(
      <SDKSessionLogPage
        session={makeSession()}
        runs={[makeRun()]}
        events={[makeEvent()]}
        transcripts={[]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "encode-run-1" })
    ).toBeInTheDocument();
    expect(screen.getByText("/tmp/axiom-encode")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "26 USC 63(f)" })).toHaveAttribute(
      "href",
      "/ops/runs/run-1"
    );
    fireEvent.click(screen.getByRole("button", { name: /event timeline/i }));
    expect(screen.getByText("Encode 26 USC 63(f)")).toBeInTheDocument();
  });

  it("shows an empty linked-run state while still rendering events", () => {
    render(
      <SDKSessionLogPage
        session={makeSession({ id: "encode-empty" })}
        runs={[]}
        events={[makeEvent({ session_id: "encode-empty" })]}
        transcripts={[]}
      />
    );

    expect(
      screen.getByText("No encoding runs are linked to this session.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /event timeline/i }));
    expect(screen.getByText("Encode 26 USC 63(f)")).toBeInTheDocument();
  });
});
